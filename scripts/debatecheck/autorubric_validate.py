"""Validate judges on a DebateCheck split with the Autorubric library (Rao and Callison-Burch, 2026).

Runs TypeSafe Jev through ``DecisionModelConfig`` under two binary framings, optionally an LLM judge through
LiteLLM, computes the agreement metrics with bootstrap intervals, and calibrates a confidence cascade with
``calibrate_escalation``. Usage: python autorubric_validate.py <dataset.json> [--llm openai/gpt-6-luna] [--out results.json]
"""
import argparse
import asyncio
import json
import os
import sys
from pathlib import Path

for line in Path(".env.local").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        key, value = line.split("=", 1)
        if value.strip():
            os.environ.setdefault(key.strip(), value.strip())

from autorubric import (  # noqa: E402
    DecisionModelConfig,
    EscalationConfig,
    LLMConfig,
    RubricDataset,
    calibrate_escalation,
    evaluate,
    escalation_stats,
    replay_escalation,
)
from autorubric.graders import CriterionGrader, JudgeSpec  # noqa: E402

parser = argparse.ArgumentParser()
parser.add_argument("dataset")
parser.add_argument("--llm", default=None, help="LiteLLM model id for an LLM judge, e.g. openai/gpt-6-luna")
parser.add_argument("--out", default=None)
parser.add_argument("--experiments", default="/tmp/autorubric-experiments")
parser.add_argument("--bootstrap", type=int, default=1000)
parser.add_argument("--concurrency", type=int, default=8)
parser.add_argument("--thinking", default="low", help="Autorubric thinking level for the LLM judge (none, low, medium, high)")
parser.add_argument("--extra-params", default=None, help="JSON object of extra LiteLLM parameters for the LLM judge, e.g. a response_format DeepSeek accepts")
args = parser.parse_args()

dataset = RubricDataset.from_file(args.dataset)
try:
    names = dataset.criterion_names
except ValueError:  # per-item rubrics (HealthBench)
    names = "per-item rubrics"
print(f"{len(dataset.items)} items, criteria: {names}", flush=True)
JEV_PRICE = 0.042e-6


def dump_items(name, result, path):
    """One JSONL line per item: per criterion, the binary verdict or the selected option, probabilities, error."""
    with open(path, "w") as f:
        for ir in result.item_results:
            rep = ir.report.model_dump() if hasattr(ir.report, "model_dump") else (ir.report or {})
            verdicts = []
            for cr in rep.get("criterion_reports") or []:
                v = cr.get("final_verdict") or cr.get("verdict")
                mc = cr.get("final_multi_choice_verdict") or cr.get("multi_choice_verdict") or {}
                votes = cr.get("votes") or cr.get("multi_choice_votes") or []
                probs = next((vote["probabilities"] for vote in votes if vote.get("probabilities") is not None), None)
                verdicts.append({"verdict": getattr(v, "value", v), "selected_label": mc.get("selected_label"), "selected_index": mc.get("selected_index"), "na": mc.get("na"), "probabilities": probs, "confidence": votes[0].get("confidence") if votes else None, "error": cr.get("error")})
            f.write(json.dumps({"item_idx": ir.item_idx, "description": ir.item.description, "ground_truth": [getattr(g, "value", g) for g in (ir.item.ground_truth or [])], "judge": name, "error": ir.error, "verdicts": verdicts}, default=str) + "\n")


def confusion_cells(conf):
    """tp/fp/fn/tn of a binary confusion matrix; multi-choice criteria (CHARM-100) have none, so None."""
    if conf is None:
        return None
    try:
        return {k: getattr(conf, k) for k in ("tp", "fp", "fn", "tn")}
    except (ValueError, AttributeError):
        return {"labels": [str(x) for x in getattr(conf, "labels", [])]}


def summarise(name, result, metrics):
    crit = metrics.per_criterion[0] if metrics.per_criterion else None
    conf = getattr(crit, "confusion_matrix", None) if crit is not None else None
    bs = metrics.bootstrap
    out = {
        "judge": name,
        "n_items": metrics.n_items,
        "n_samples": metrics.n_samples,
        "accuracy": metrics.criterion_accuracy,
        "kappa_micro": metrics.micro_kappa,
        "kappa_mean": metrics.mean_kappa,
        "phi": metrics.criterion_phi,
        "precision_met": metrics.criterion_precision,
        "recall_met": metrics.criterion_recall,
        "bias": str(metrics.bias) if metrics.bias is not None else None,
        "coverage": str(metrics.coverage_stats) if metrics.coverage_stats is not None else None,
        "confusion": confusion_cells(conf),
        "bootstrap": None if bs is None else str(bs),
        "cost_usd": getattr(result, "total_cost", None) or getattr(result, "completion_cost", None),
        "successful_items": result.successful_items,
        "total_items": result.total_items,
        "warnings": list(metrics.warnings) if metrics.warnings else [],
    }
    print(json.dumps(out, indent=1, default=str), flush=True)
    return out


async def main():
    results = {}
    runs = {}
    for framing in ("noul_framed", "choice"):
        jev = DecisionModelConfig(model=os.environ.get("TYPESAFE_MODEL", "jev-1.13.0"), cache_enabled=True, cache_dir=f"{args.experiments}/cache", input_cost_per_token=JEV_PRICE, binary_framing=framing, max_parallel_requests=args.concurrency)
        grader = CriterionGrader(judge_model_config=jev, seed=1)
        res = await evaluate(dataset, grader, show_progress=False, experiments_dir=args.experiments, experiment_name=f"jev-{framing}-{Path(args.dataset).stem}", resume=False)
        metrics = res.compute_metrics(dataset, bootstrap=args.bootstrap > 0, n_bootstrap=args.bootstrap, seed=1, cannot_assess="as_category" if framing == "choice" else "exclude")
        results[f"jev-{framing}"] = summarise(f"jev-{framing}", res, metrics)
        dump_items(f"jev-{framing}", res, (args.out or f"bench/debatecheck/autorubric-results-{Path(args.dataset).stem}.json").replace(".json", f".items-jev-{framing}.jsonl"))
        if framing == "choice":
            # the agreement paper's three abstention modes, side by side
            for mode in ("exclude", "as_unmet"):
                m2 = res.compute_metrics(dataset, bootstrap=False, cannot_assess=mode)
                results[f"jev-choice-{mode}"] = {"accuracy": m2.criterion_accuracy, "kappa_micro": m2.micro_kappa, "phi": m2.criterion_phi, "n_samples": m2.n_samples, "coverage": str(m2.coverage_stats)}
                print(f"jev-choice under cannot_assess={mode}: accuracy {m2.criterion_accuracy}, kappa {m2.micro_kappa}, n {m2.n_samples}", flush=True)
        runs[framing] = res
    if args.llm:
        # Reasoning models reject temperature=0; None sends no temperature at all.
        # The study's LLM judges run at reasoning "low" (Autorubric's ThinkingLevel, one setting across providers).
        llm = LLMConfig(model=args.llm, temperature=None, thinking=None if args.thinking == "none" else args.thinking, cache_enabled=True, cache_dir=f"{args.experiments}/cache", max_parallel_requests=args.concurrency, extra_params=json.loads(args.extra_params) if args.extra_params else None)
        # Named as a cascade's escalation judge, so calibrate_escalation can replay it against the Jev run.
        grader = CriterionGrader(judges=[JudgeSpec(llm, "escalation")], seed=1)
        res = await evaluate(dataset, grader, show_progress=False, experiments_dir=args.experiments, experiment_name=f"llm-{args.llm.replace('/', '_')}-{Path(args.dataset).stem}", resume=False)
        metrics = res.compute_metrics(dataset, bootstrap=args.bootstrap > 0, n_bootstrap=args.bootstrap, seed=1)
        results[f"llm-{args.llm}"] = summarise(args.llm, res, metrics)
        dump_items(args.llm, res, (args.out or f"bench/debatecheck/autorubric-results-{Path(args.dataset).stem}.json").replace(".json", f".items-llm-{args.llm.replace('/', '_')}.jsonl"))
        # confidence cascade: Jev (noul_framed) first, the LLM on low-confidence criteria, replayed offline
        curve = calibrate_escalation(dataset, runs["noul_framed"], res)
        points = []
        for pt in curve.points:
            points.append({"threshold": getattr(pt, "threshold", None) or getattr(pt, "thresholds", None), "escalation_rate": pt.escalation_rate, "metric": pt.metric, "cost_usd": pt.cost_usd})
        best = curve.best(tolerance=0.01)
        results["cascade"] = {"points": points, "best": {"threshold": getattr(best, "threshold", None) or getattr(best, "thresholds", None), "escalation_rate": best.escalation_rate, "metric": best.metric, "cost_usd": best.cost_usd}, "llm_alone_metric": metrics.criterion_accuracy, "llm_alone_cost": results[f"llm-{args.llm}"]["cost_usd"], "jev_alone_metric": results["jev-noul_framed"]["accuracy"]}
        print("cascade best:", json.dumps(results["cascade"]["best"], default=str), flush=True)
    out = args.out or f"bench/debatecheck/autorubric-results-{Path(args.dataset).stem}.json"
    Path(out).write_text(json.dumps(results, indent=1, default=str))
    print(f"wrote {out}")


asyncio.run(main())

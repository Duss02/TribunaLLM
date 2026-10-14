"""Copy the per-item verdicts of an Autorubric experiment (its items.jsonl) into the repository in the shape
the study analysis reads: one line per item with, per criterion, the binary verdict or the selected option,
the probabilities and the error. Usage: python panel_items.py <experiments_dir> <experiment_name> <judge> <out.jsonl>"""
import json, sys
from pathlib import Path

experiments, name, judge, out = sys.argv[1:5]
src = Path(experiments) / name / "items.jsonl"
rows = [json.loads(l) for l in open(src)]
n_binary = n_choice = n_error = 0
with open(out, "w") as f:
    for r in rows:
        report = r.get("report") or {}
        verdicts = []
        for cr in report.get("criterion_reports") or []:
            v = cr.get("final_verdict") or cr.get("verdict")
            mc = cr.get("final_multi_choice_verdict") or cr.get("multi_choice_verdict") or {}
            votes = cr.get("votes") or cr.get("multi_choice_votes") or []
            probs = None
            for vote in votes:
                if vote.get("probabilities") is not None:
                    probs = vote["probabilities"]
                    break
            err = cr.get("error") or (votes[0].get("error") if votes else None)
            if err:
                n_error += 1
            if v is not None:
                n_binary += 1
            elif mc.get("selected_label") is not None:
                n_choice += 1
            verdicts.append({"verdict": v, "selected_label": mc.get("selected_label"), "selected_index": mc.get("selected_index"), "na": mc.get("na"), "probabilities": probs, "confidence": (votes[0].get("confidence") if votes else None), "error": err})
        f.write(json.dumps({"item_idx": r["item_idx"], "judge": judge, "error": r.get("error"), "verdicts": verdicts}) + "\n")
print(f"{len(rows)} items -> {out}: {n_binary} binary verdicts, {n_choice} choices, {n_error} errored criteria")

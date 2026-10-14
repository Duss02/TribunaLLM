"""GPT-6 Luna through OpenAI's Decisions API on an Autorubric RubricDataset file (CHARM-100, HealthBench-100):
one request per item with one typed question per criterion, binary criteria as predicates and multi-choice
ones as choices over the option labels (sent as {value: "oN", description: label}, which is the schema the
API accepts). Writes one JSONL line per item with the probabilities and the verdict per criterion, in the
same shape as the Autorubric per-item dump. Input tokens only are billed. Resumable per item.
Usage: python judge_decisions_dataset.py <dataset.json> <out.jsonl> [--limit N]"""
import argparse, json, os, sys, time
import urllib.request
from pathlib import Path

for line in Path(".env.local").read_text().splitlines():
    if "=" in line and not line.lstrip().startswith("#"):
        k, v = line.split("=", 1)
        if v.strip():
            os.environ.setdefault(k.strip(), v.strip())

parser = argparse.ArgumentParser()
parser.add_argument("dataset")
parser.add_argument("out")
parser.add_argument("--limit", type=int, default=None)
args = parser.parse_args()
ds = json.load(open(args.dataset))
rubric = ds.get("rubric")
if isinstance(rubric, dict):
    rubric = rubric.get("criteria") or rubric.get("rubric")
items = ds["items"][: args.limit] if args.limit else ds["items"]
done = set()
if Path(args.out).exists():
    done = {json.loads(l)["item_idx"] for l in open(args.out)}
# Autorubric's own binary framing (DECISION_MODEL_TASK_INSTRUCTION and the MET/UNMET definitions), so the
# question text matches what Jev sees through the library.
TASK = "Determine whether this criterion is satisfied by the `submission`."
MET, UNMET = "The thing described in the criterion IS present in the submission", "The thing described in the criterion IS NOT present in the submission"
NEG_MET, NEG_UNMET = "The submission advocates, states, or recommends the problematic thing", "The submission does NOT make this error, OR mentions it only to warn against it"


def questions_for(rubric):
    qs = []
    for i, c in enumerate(rubric):
        name = f"q{i}"
        if c.get("options"):
            qs.append({"name": name, "type": "choice", "instructions": c["requirement"],
                       "choices": [{"value": f"o{j}", "description": o["label"]} for j, o in enumerate(c["options"])]})
        else:
            negative = float(c.get("weight", 10)) < 0
            qs.append({"name": name, "type": "predicate",
                       "instructions": f"{TASK} Criterion: {c['requirement']} (true: {NEG_MET if negative else MET}; false: {NEG_UNMET if negative else UNMET})"})
    return qs


def call(body):
    req = urllib.request.Request("https://api.openai.com/v1/decisions", data=json.dumps(body).encode(), headers={"Authorization": "Bearer " + os.environ["OPENAI_API_KEY"], "Content-Type": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            text = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503) and attempt < 3:
                time.sleep(1.5 * (attempt + 1)); continue
            raise RuntimeError(f"decisions API {e.code}: {text}")


tokens, n, t0 = 0, 0, time.time()
with open(args.out, "a") as f:
    for idx, it in enumerate(items):
        if idx in done:
            continue
        item_rubric = it.get("rubric") or rubric
        if isinstance(item_rubric, dict):
            item_rubric = item_rubric.get("criteria") or item_rubric.get("rubric")
        prompt = it.get("prompt") or ds.get("prompt") or ""
        body = {"model": "gpt-6-luna", "input": f"Task given to the assistant:\n{prompt}\n\nSubmission to grade:\n{it['submission']}", "questions": questions_for(item_rubric)}
        res = call(body)
        tokens += res["usage"]["input_tokens"]
        verdicts = []
        by_name = {a["name"]: a for a in res["answers"]}
        for i, c in enumerate(item_rubric):
            a = by_name.get(f"q{i}")
            if a is None:
                verdicts.append({"criterion": c.get("name"), "error": "no answer"})
            elif a["type"] == "predicate":
                verdicts.append({"criterion": c.get("name"), "probability_met": a["probability"], "verdict": "MET" if a["probability"] >= 0.5 else "UNMET"})
            else:
                labels = [o["label"] for o in c["options"]]
                probs = {labels[int(p["value"][1:])]: p["probability"] for p in a.get("probabilities", []) if p["value"].startswith("o")}
                chosen = a.get("choice")
                sel_idx = int(chosen[1:]) if chosen and chosen.startswith("o") else None
                verdicts.append({"criterion": c.get("name"), "probabilities": probs, "selected_index": sel_idx, "selected_label": labels[sel_idx] if sel_idx is not None else None, "verdict": labels[sel_idx] if sel_idx is not None else None, "confidence": a.get("confidence")})
        f.write(json.dumps({"item_idx": idx, "description": it.get("description"), "ground_truth": it.get("ground_truth"), "judge": "gpt-6-luna-decisions", "verdicts": verdicts}) + "\n")
        f.flush()
        n += 1
        if n % 25 == 0:
            print(f"{n} items, {tokens} tokens (${tokens * 0.1e-6:.3f}), {time.time() - t0:.0f} s", flush=True)
print(f"done: {n} items, {tokens} input tokens = ${tokens * 0.1e-6:.3f}")

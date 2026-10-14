"""Score every item of an exported DebateCheck dataset with Vectara's HHEM-2.1-Open (an NLI-style
consistency classifier, a different kind of judge from decision models and LLMs). Writes one JSONL line per
pair: the model's consistency score for the unchanged and the altered sentence, with the three passages
the other judges read as the premise. Usage: python judge_hhem.py <dataset.json> <key.jsonl> <out.jsonl>"""
import json, sys, time
from transformers import AutoModelForSequenceClassification

dataset = json.load(open(sys.argv[1]))
key = [json.loads(l) for l in open(sys.argv[2])]
out = sys.argv[3]
assert len(key) == len(dataset["items"]), "key and dataset differ in length"
model = AutoModelForSequenceClassification.from_pretrained("vectara/hallucination_evaluation_model", trust_remote_code=True)
pairs = [(it["prompt"].split("Evidence passages (id| text):\n", 1)[1], it["submission"]) for it in dataset["items"]]
t0 = time.time()
scores = []
B = 32
for i in range(0, len(pairs), B):
    scores.extend(float(s) for s in model.predict(pairs[i : i + B]))
    if (i // B) % 10 == 0:
        print(f"{min(i + B, len(pairs))}/{len(pairs)} items, {time.time() - t0:.0f} s", flush=True)
rows = {}
for k, s in zip(key, scores):
    rows.setdefault(k["id"], {"id": k["id"], "judge": "hhem-2.1-open"})[k["which"]] = {"consistency": s, "contradicts": 1 - s}
with open(out, "w") as f:
    for r in rows.values():
        f.write(json.dumps(r) + "\n")
print(f"wrote {len(rows)} pairs to {out} in {time.time() - t0:.0f} s")

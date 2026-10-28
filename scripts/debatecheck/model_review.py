"""Merge the model-produced review of the human-validation sheet (a pre-screening, not a human annotation)
and compare it with the construction labels: per stratum, how many altered sentences the review calls
contradicted and how many unchanged ones it calls contradicted. Writes bench/debatecheck/human/sheet-model.csv
and prints the table. Usage: python model_review.py <labels-dir>"""
import csv, json, sys, glob
from collections import defaultdict
labels = {}
for f in sorted(glob.glob(f"{sys.argv[1]}/labels-*.jsonl")):
    for line in open(f):
        r = json.loads(line); labels[r["item"]] = r
key = {json.loads(l)["item"]: json.loads(l) for l in open("bench/debatecheck/human/key.jsonl")}
rows = list(csv.DictReader(open("bench/debatecheck/human/sheet-A.csv")))
with open("bench/debatecheck/human/sheet-model.csv", "w", newline="") as f:
    w = csv.writer(f); w.writerow(["item", "label", "passage", "reason"])
    for r in rows:
        l = labels.get(r["item"], {}); w.writerow([r["item"], l.get("label", ""), l.get("passage") or "", l.get("reason", "")])
by = defaultdict(lambda: defaultdict(int))
for item, k in key.items():
    l = labels.get(item, {}).get("label", "missing"); by[k["stratum"]][l] += 1
print(f"{len(labels)} of {len(key)} items labelled")
print("| stratum | si | no | incerto | expected |")
print("|---|---:|---:|---:|---|")
for s in sorted(by):
    d = by[s]; exp = "si" if s.endswith("altered") else "no"
    print(f"| {s} | {d['si']} | {d['no']} | {d['incerto']} | {exp} |")
alt = [i for i, k in key.items() if k["stratum"].endswith("altered")]
unch = [i for i, k in key.items() if k["stratum"].endswith("unchanged")]
si = lambda ids: sum(1 for i in ids if labels.get(i, {}).get("label") == "si")
print(f"altered called contradicted: {si(alt)}/{len(alt)} = {100*si(alt)/max(1,len(alt)):.1f}% | unchanged called contradicted: {si(unch)}/{len(unch)} = {100*si(unch)/max(1,len(unch)):.1f}%")
for t in ("polarity", "entity", "attribution", "unit"):
    ids = [i for i in alt if key[i]["stratum"].startswith(t)]
    print(f"  {t}: altered called contradicted {si(ids)}/{len(ids)}")

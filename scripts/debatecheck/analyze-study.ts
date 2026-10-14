import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { corpusFor } from "../analysis/common";
import { selectPassages } from "./lib";
import {
  type CI,
  type Item,
  type ItemType,
  type Judge,
  type JudgeMetrics,
  type PairCorrelation,
  PANEL_TO_DEBATECHECK,
  TYPES,
  agreementSelective,
  ci,
  effectiveVotes,
  f3,
  fitThreshold,
  judgeMetrics,
  loadItems,
  loadJudges,
  loadPanel,
  pairCorrelation,
  panelJudgeMetrics,
  panelPairCorrelation,
  pct,
  rethreshold,
  selective,
} from "./study-lib";

// The pre-registered analysis (docs/preregistration-judge-correlation.md). Without --heldout only the
// training motions are analysed; the held-out motions are opened once every judge has finished on them.
const { values } = parseArgs({
  options: {
    heldout: { type: "boolean", default: false },
    out: { type: "string", default: "bench/debatecheck/STUDY.md" },
    json: { type: "string", default: "bench/debatecheck/study.json" },
  },
});
const { items, pairs } = await loadItems();
const loaded = await loadJudges();
const evalSplit = values.heldout ? "test" : "train";
const inEval = (it: Item) => it.split === evalSplit;
const inTrain = (it: Item) => it.split === "train";
const and =
  (...fs: ((it: Item) => boolean)[]) =>
  (it: Item) =>
    fs.every((f) => f(it));

// Fitted thresholds (train only) for the scored judges, reported next to the 0.5 rule.
const judges: Judge[] = [...loaded];
const fitted: Record<string, { threshold: number; trainAccuracy: number }> = {};
for (const j of loaded) {
  if (!j.scored) continue;
  const fit = fitThreshold(j, items, inTrain);
  fitted[j.id] = { threshold: fit.threshold, trainAccuracy: fit.accuracy };
  judges.push(rethreshold(j, fit.threshold, `${j.id}@fit`));
}
const byId = new Map(judges.map((j) => [j.id, j]));
const J = (id: string) => byId.get(id);
const present = (ids: readonly string[]) =>
  ids.map(J).filter((j): j is Judge => j !== undefined && j.decision.size > 0);
const TOP3 = present(["jev-3", "luna-dec-3", "luna-chat", "deepseek-pro", "claude", "hhem"]);
const COND20 = present(["jev-20", "luna-dec-20"]);
const MAIN = present([
  "jev-20",
  "jev-3",
  "luna-dec-20",
  "luna-dec-3",
  "luna-chat",
  "deepseek-pro",
  "claude",
  "hhem",
  "jev-3@fit",
  "luna-dec-3@fit",
  "hhem@fit",
  "jev-20@fit",
  "luna-dec-20@fit",
]);

const L: string[] = [];
const out: Record<string, unknown> = { evalSplit, fitted };
const table = (header: string[], rows: string[][]) => {
  L.push(`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`);
  for (const r of rows) L.push(`| ${r.join(" | ")} |`);
  L.push("");
};
const cat = (j: Judge) =>
  j.kind === "decision" ? "decision model" : j.kind === "llm" ? "LLM" : "NLI classifier";

L.push(`# Where judges err together: study report`, "");
L.push(
  `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/debatecheck/analyze-study.ts\`${values.heldout ? " --heldout" : ""}. Pre-registration: docs/preregistration-judge-correlation.md.`,
  "",
);
L.push(
  `Split analysed: **${evalSplit === "test" ? "held-out motions (crewed-spaceflight, rent-control)" : "training motions only (the held-out motions stay closed until every judge has finished)"}**. Thresholds and selective rules are fitted on the training motions. Intervals are 95 percent percentile bootstraps resampling pairs (1,000 resamples).`,
  "",
);

// ------------------------------------------------------------------------------------------------ data
const evalItems = items.filter(inEval);
const countBy = (f: (it: Item) => string) => {
  const m = new Map<string, number>();
  for (const it of evalItems) m.set(f(it), (m.get(f(it)) ?? 0) + 1);
  return m;
};
L.push(`## 1. Items`, "");
table(
  ["type", "items in split", "pairs"],
  TYPES.map((t) => [
    t,
    String(countBy((it) => it.type).get(t) ?? 0),
    String((countBy((it) => it.type).get(t) ?? 0) / 2),
  ]),
);
L.push(`## 2. Judges`, "");
table(
  ["judge", "kind", "maker", "evidence", "scale", "items answered in split", "coverage"],
  MAIN.map((j) => {
    const n = evalItems.filter((it) => j.decision.has(it.key)).length;
    return [
      j.label,
      cat(j),
      j.maker,
      j.condition === "20" ? "20 passages" : "top-3",
      j.scored
        ? `probability, decides at ${j.id.endsWith("@fit") ? fitted[j.id.replace("@fit", "")]!.threshold.toFixed(2) + " (fitted on train)" : "0.5"}`
        : "MET / UNMET label",
      String(n),
      pct(n / Math.max(1, evalItems.length)),
    ];
  }),
);
L.push(
  `Abstention rule: an LLM answer that is not the JSON verdict is excluded and counted in coverage; decision models and HHEM always answer. Claude Sonnet 5.5 was run on 400 held-out pairs only (200 numeric, 50 per new type).`,
  "",
);

// ----------------------------------------------------------------------------------- per-judge metrics
L.push(`## 3. Judge accuracy`, "");
const metrics: Record<string, { all: JudgeMetrics; byType: Record<string, JudgeMetrics> }> = {};
for (const j of MAIN) {
  metrics[j.id] = { all: judgeMetrics(j, items, inEval), byType: {} };
  for (const t of TYPES)
    metrics[j.id]!.byType[t] = judgeMetrics(
      j,
      items,
      and(inEval, (it) => it.type === t),
    );
}
out.metrics = metrics;
L.push(`### 3.1 All types`, "");
table(
  [
    "judge",
    "n",
    "judge positive",
    "label positive",
    "accuracy",
    "recall (altered)",
    "false alarm (unchanged)",
    "AUROC",
  ],
  MAIN.map((j) => {
    const m = metrics[j.id]!.all;
    return [
      j.label,
      String(m.n),
      pct(m.judgePositive),
      pct(m.labelPositive),
      ci(m.accuracy, pct),
      ci(m.recall, pct),
      ci(m.falseAlarm, pct),
      m.auroc ? ci(m.auroc) : "-",
    ];
  }),
);
for (const [title, pick] of [
  ["Accuracy", (m: JudgeMetrics) => m.accuracy],
  ["Recall on altered sentences", (m: JudgeMetrics) => m.recall],
  ["False alarms on unchanged sentences", (m: JudgeMetrics) => m.falseAlarm],
] as const) {
  L.push(`### 3.${title === "Accuracy" ? 2 : title.startsWith("Recall") ? 3 : 4} ${title} by type`, "");
  table(
    ["judge", ...TYPES.map((t) => `${t} (n)`)],
    MAIN.map((j) => [
      j.label,
      ...TYPES.map((t) => {
        const m = metrics[j.id]!.byType[t]!;
        return m.n === 0 ? "-" : `${ci(pick(m), pct)} (${m.n})`;
      }),
    ]),
  );
}
L.push(`### 3.5 AUROC by type (scored judges)`, "");
table(
  ["judge", ...TYPES],
  MAIN.filter((j) => j.scored && !j.id.endsWith("@fit")).map((j) => [
    j.label,
    ...TYPES.map((t) => {
      const m = metrics[j.id]!.byType[t]!;
      return m.n === 0 || !m.auroc ? "-" : ci(m.auroc);
    }),
  ]),
);

// ---------------------------------------------------------------------------------------------- H3
L.push(`## 4. H3: error type`, "");
L.push(
  `Prediction: Jev's recall drops by at least 15 points from numbers to the mean of the other types; GPT-6 Luna's by less than 10.`,
  "",
);
const h3: Record<string, { numbers: number | null; others: number | null; drop: number | null }> = {};
const h3rows: string[][] = [];
for (const j of MAIN.filter((j) => !j.id.endsWith("@fit"))) {
  const num = metrics[j.id]!.byType.number!.recall.point;
  const others = TYPES.filter((t) => t !== "number")
    .map((t) => metrics[j.id]!.byType[t]!.recall.point)
    .filter((x): x is number => x !== null);
  const mean = others.length === 0 ? null : others.reduce((a, b) => a + b, 0) / others.length;
  const drop = num === null || mean === null ? null : num - mean;
  h3[j.id] = { numbers: num, others: mean, drop };
  h3rows.push([j.label, pct(num), pct(mean), drop === null ? "-" : `${(100 * drop).toFixed(1)} pt`]);
}
table(["judge", "recall on numbers", "mean recall on other types", "drop"], h3rows);
const jevDrop = h3["jev-3"]?.drop ?? null,
  lunaDrop = h3["luna-dec-3"]?.drop ?? null;
L.push(
  `Verdict (top-3 condition): Jev drop ${jevDrop === null ? "-" : (100 * jevDrop).toFixed(1)} pt (predicted >= 15), Luna Decisions drop ${lunaDrop === null ? "-" : (100 * lunaDrop).toFixed(1)} pt (predicted < 10): ${jevDrop !== null && lunaDrop !== null ? (jevDrop >= 0.15 && lunaDrop < 0.1 ? "supported" : jevDrop >= 0.15 || lunaDrop < 0.1 ? "half supported" : "not supported") : "pending"}.`,
  "",
);
out.h3 = h3;

// ------------------------------------------------------------------------------- error correlations, H2
L.push(`## 5. Error correlation between judges`, "");
L.push(
  `For each pair of judges, on the items both answered: the 2x2 table of error indicators (both wrong / A only / B only / both right), phi, Cohen's kappa, P(B wrong | A wrong) against P(B wrong), and the lift.`,
  "",
);
const corr: PairCorrelation[] = [];
const pairsOf = (set: Judge[]) => {
  const ps: [Judge, Judge][] = [];
  for (let i = 0; i < set.length; i++) for (let k = i + 1; k < set.length; k++) ps.push([set[i]!, set[k]!]);
  return ps;
};
const corrRow = (c: PairCorrelation) => [
  `${J(c.a)!.label} x ${J(c.b)!.label}`,
  String(c.n),
  `${c.table.a} / ${c.table.b} / ${c.table.c} / ${c.table.d}`,
  ci(c.phi),
  ci(c.kappa),
  `${ci(c.bGivenA, pct)} vs ${pct(c.baseB)}`,
  f3(c.liftBGivenA),
];
L.push(`### 5.1 Top-3 condition`, "");
for (const [A, B] of pairsOf(TOP3)) corr.push(pairCorrelation(A, B, items, inEval));
table(
  [
    "pair",
    "n",
    "both / A only / B only / neither wrong",
    "phi",
    "kappa",
    "P(B wrong | A wrong) vs P(B wrong)",
    "lift",
  ],
  corr.map(corrRow),
);
L.push(`### 5.2 Twenty-passage condition`, "");
const corr20 = pairsOf(COND20).map(([A, B]) => pairCorrelation(A, B, items, inEval));
table(
  [
    "pair",
    "n",
    "both / A only / B only / neither wrong",
    "phi",
    "kappa",
    "P(B wrong | A wrong) vs P(B wrong)",
    "lift",
  ],
  corr20.map(corrRow),
);
out.correlations = { top3: corr, cond20: corr20 };

L.push(`### 5.3 H2: kind of judge`, "");
L.push(
  `Prediction: two LLMs (highest) > decision model with LLM > two decision models of different makers, with non-overlapping intervals between the extremes.`,
  "",
);
const kindOf = (id: string) => J(id)!.kind;
const category = (c: PairCorrelation) => {
  const ka = kindOf(c.a),
    kb = kindOf(c.b);
  if (ka === "nli" || kb === "nli") return "with NLI classifier";
  if (ka === "llm" && kb === "llm") return "LLM x LLM";
  if (ka === "decision" && kb === "decision") return "decision x decision";
  return "decision x LLM";
};
const cats = new Map<string, PairCorrelation[]>();
for (const c of corr.filter((c) => c.n > 0 && c.phi.point !== null)) {
  const k = category(c);
  cats.set(k, [...(cats.get(k) ?? []), c]);
}
const meanOf = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
};
table(
  ["category", "pairs", "mean phi", "phi range"],
  ["LLM x LLM", "decision x LLM", "decision x decision", "with NLI classifier"].map((k) => {
    const cs = cats.get(k) ?? [];
    const ph = cs.map((c) => c.phi.point);
    return [
      k,
      cs.map((c) => `${c.a} x ${c.b}`).join(", ") || "-",
      f3(meanOf(ph)),
      cs.length === 0
        ? "-"
        : `${f3(Math.min(...ph.filter((x): x is number => x !== null)))} to ${f3(Math.max(...ph.filter((x): x is number => x !== null)))}`,
    ];
  }),
);
const ll = cats.get("LLM x LLM") ?? [],
  dl = cats.get("decision x LLM") ?? [],
  dd = cats.get("decision x decision") ?? [];
const mLL = meanOf(ll.map((c) => c.phi.point)),
  mDL = meanOf(dl.map((c) => c.phi.point)),
  mDD = meanOf(dd.map((c) => c.phi.point));
let h2 = "pending";
if (mLL !== null && mDL !== null && mDD !== null) {
  const ordered = mLL > mDL && mDL > mDD;
  const extremes = ll.every((c) =>
    dd.every((d) => c.phi.lo !== null && d.phi.hi !== null && c.phi.lo > d.phi.hi),
  );
  h2 =
    ordered && extremes
      ? "supported"
      : ordered
        ? "ordering holds, intervals of the extremes overlap"
        : "ordering does not hold";
}
L.push(
  `Verdict: mean phi LLM x LLM ${f3(mLL)}, decision x LLM ${f3(mDL)}, decision x decision ${f3(mDD)}: **${h2}**.`,
  "",
);
out.h2 = { meanLL: mLL, meanDL: mDL, meanDD: mDD, verdict: h2 };

L.push(`### 5.4 Effective independent votes`, "");
L.push(
  `k judges whose errors correlate with mean phi rho are worth k / (1 + (k - 1) rho) independent votes, computed on the items every judge of the set answered.`,
  "",
);
const votes: Record<string, { k: number; n: number; meanPhi: number | null; effective: number | null }> = {};
const sets: [string, string[]][] = [
  ["Jev + Luna Decisions (top-3)", ["jev-3", "luna-dec-3"]],
  ["Jev + Luna Decisions + Luna chat + DeepSeek Pro", ["jev-3", "luna-dec-3", "luna-chat", "deepseek-pro"]],
  ["Luna chat + DeepSeek Pro", ["luna-chat", "deepseek-pro"]],
  ["Luna chat + DeepSeek Pro + Claude", ["luna-chat", "deepseek-pro", "claude"]],
  [
    "Jev + Luna Decisions + Luna chat + DeepSeek Pro + Claude",
    ["jev-3", "luna-dec-3", "luna-chat", "deepseek-pro", "claude"],
  ],
  ["all six, top-3", ["jev-3", "luna-dec-3", "luna-chat", "deepseek-pro", "claude", "hhem"]],
];
const voteRows: string[][] = [];
for (const [name, ids] of sets) {
  const set = present(ids);
  if (set.length !== ids.length) continue;
  const common = and(inEval, (it) => set.every((j) => j.decision.has(it.key)));
  const n = items.filter(common).length;
  if (n === 0) continue;
  const phis = pairsOf(set).map(([A, B]) => pairCorrelation(A, B, items, common, 2).phi.point);
  const mean = meanOf(phis);
  votes[name] = {
    k: set.length,
    n,
    meanPhi: mean,
    effective: mean === null ? null : effectiveVotes(set.length, mean),
  };
  voteRows.push([
    name,
    String(set.length),
    String(n),
    f3(mean),
    mean === null ? "-" : effectiveVotes(set.length, mean).toFixed(2),
  ]);
}
table(["set", "k", "items", "mean phi", "effective votes"], voteRows);
out.votes = votes;

// ---------------------------------------------------------------------------------------------- H4
L.push(`## 6. H4: difficulty strata`, "");
L.push(
  `Items are split by whether a third judge was right (DeepSeek V4 Pro; Claude for pairs involving Pro, Luna chat when Claude has no items in the split). Prediction: Jev-LLM error correlation stays below LLM-LLM correlation within each stratum.`,
  "",
);
const strataRows: string[][] = [];
const h4: Record<string, { third: string; right: PairCorrelation; wrong: PairCorrelation }> = {};
for (const [A, B] of pairsOf(TOP3.filter((j) => j.kind !== "nli"))) {
  let C = A.id === "deepseek-pro" || B.id === "deepseek-pro" ? J("claude") : J("deepseek-pro");
  if (!C || items.filter(and(inEval, (it) => C!.decision.has(it.key))).length === 0) C = J("luna-chat");
  if (!C || C.id === A.id || C.id === B.id) continue;
  const rightC = (it: Item) => {
    const d = C!.decision.get(it.key);
    return d === undefined ? null : d === (it.y === 1);
  };
  const right = pairCorrelation(
    A,
    B,
    items,
    and(inEval, (it) => rightC(it) === true),
  );
  const wrong = pairCorrelation(
    A,
    B,
    items,
    and(inEval, (it) => rightC(it) === false),
  );
  h4[`${A.id}|${B.id}`] = { third: C.id, right, wrong };
  strataRows.push([
    `${A.label} x ${B.label}`,
    C.label,
    `${ci(right.phi)} (n ${right.n})`,
    `${ci(wrong.phi)} (n ${wrong.n})`,
  ]);
}
table(["pair", "third judge", "phi where third judge right", "phi where third judge wrong"], strataRows);
out.h4 = h4;

// --------------------------------------------- exploratory: is the fact passage among the three?
L.push(`## 6b. Exploratory (not pre-registered): is the fact passage among the three the judges read?`, "");
L.push(
  `For each pair, whether one of the three passages selected for the altered sentence contains the pair's original token. Recall on altered sentences, false alarms and error correlation are split by this. The top-3 judges and HHEM read exactly these three passages; the twenty-passage judges are shown for contrast.`,
  "",
);
const factInTop3 = new Map<string, boolean>();
const norm = (x: string) => x.replaceAll(",", "").toLowerCase();
for (const p of pairs.values()) {
  const corpus = await corpusFor(p.pack);
  const top = selectPassages(corpus, p.evidenceIds, p.perturbed, 3);
  factInTop3.set(
    p.id,
    top.some((t) => norm(t.text).includes(norm(p.from))),
  );
}
const factPresent = (it: Item) => factInTop3.get(it.pairId) === true;
const evalPairs = [...pairs.values()].filter((p) => p.split === evalSplit);
const share = evalPairs.filter((p) => factInTop3.get(p.id)).length / Math.max(1, evalPairs.length);
L.push(
  `Share of ${evalSplit} pairs whose altered sentence has its fact passage among the three: ${pct(share)}.`,
  "",
);
const retr: Record<string, { present: JudgeMetrics; absent: JudgeMetrics }> = {};
const retrRows: string[][] = [];
for (const j of [...TOP3, ...COND20]) {
  const a = judgeMetrics(j, items, and(inEval, factPresent));
  const b = judgeMetrics(
    j,
    items,
    and(inEval, (it) => !factPresent(it)),
  );
  retr[j.id] = { present: a, absent: b };
  retrRows.push([
    j.label,
    `${ci(a.recall, pct)} (${a.n})`,
    `${ci(b.recall, pct)} (${b.n})`,
    ci(a.falseAlarm, pct),
    ci(b.falseAlarm, pct),
  ]);
}
table(
  [
    "judge",
    "recall, fact passage present (items)",
    "recall, absent (items)",
    "false alarm, present",
    "false alarm, absent",
  ],
  retrRows,
);
const retrCorr: Record<string, { present: PairCorrelation; absent: PairCorrelation }> = {};
const rcRows: string[][] = [];
for (const [A, B] of pairsOf(TOP3)) {
  const a = pairCorrelation(A, B, items, and(inEval, factPresent));
  const b = pairCorrelation(
    A,
    B,
    items,
    and(inEval, (it) => !factPresent(it)),
  );
  if (a.n === 0 && b.n === 0) continue;
  retrCorr[`${A.id}|${B.id}`] = { present: a, absent: b };
  rcRows.push([`${A.label} x ${B.label}`, `${ci(a.phi)} (n ${a.n})`, `${ci(b.phi)} (n ${b.n})`]);
}
table(["pair", "phi, fact passage present", "phi, absent"], rcRows);
out.retrieval = { share, judges: retr, correlations: retrCorr };

// ---------------------------------------------------------------------------------------------- H5
L.push(`## 7. H5: the framing effect replicates for a second decision model`, "");
L.push(
  `AUROC on numeric items of the loose relation question (the arena's wording, a choice over supports / contradicts / says nothing) against the framed criterion, same input text, GPT-6 Luna Decisions; Jev from the pilot for reference. Prediction: a gain of at least 0.05 for Luna Decisions.`,
  "",
);
const h5: Record<string, { loose: CI | null; framed: CI | null; gain: number | null }> = {};
const h5rows: string[][] = [];
for (const [name, looseId, framedId] of [
  ["GPT-6 Luna Decisions, 20 passages", "luna-dec-loose-20", "luna-dec-20"],
  ["GPT-6 Luna Decisions, top-3", "luna-dec-loose-3", "luna-dec-3"],
  ["Jev, 20 passages (pilot)", "jev-loose-20", "jev-20"],
] as const) {
  const lo = J(looseId),
    fr = J(framedId);
  const numeric = and(
    inEval,
    (it) => it.type === "number",
    (it) => (lo?.decision.has(it.key) ?? false) && (fr?.decision.has(it.key) ?? false),
  );
  const a = lo ? judgeMetrics(lo, items, numeric).auroc : null;
  const b = fr ? judgeMetrics(fr, items, numeric).auroc : null;
  const gain =
    a?.point !== null && a?.point !== undefined && b?.point !== null && b?.point !== undefined
      ? b.point - a.point
      : null;
  h5[name] = { loose: a, framed: b, gain };
  h5rows.push([name, ci(a), ci(b), gain === null ? "-" : gain.toFixed(3)]);
}
table(["judge", "AUROC, relation question", "AUROC, framed criterion", "gain"], h5rows);
const g20 = h5["GPT-6 Luna Decisions, 20 passages"]!.gain,
  g3 = h5["GPT-6 Luna Decisions, top-3"]!.gain;
L.push(
  `Verdict: ${g20 === null && g3 === null ? "pending" : [g20, g3].filter((g): g is number => g !== null).every((g) => g >= 0.05) ? "supported in both conditions" : [g20, g3].filter((g): g is number => g !== null).some((g) => g >= 0.05) ? "supported in one condition" : [g20, g3].filter((g): g is number => g !== null).every((g) => g > 0) ? "direction replicates, gain below 0.05" : "not supported"}.`,
  "",
);
out.h5 = h5;

// ------------------------------------------------------------------------------ selective coverage
L.push(`## 8. Coverage at guaranteed risk`, "");
L.push(
  `Accept an item when the judge's probability is at or above a high threshold (predict contradicted) or at or below a low one (predict not), thresholds chosen on the training motions as the widest region whose one-sided Clopper-Pearson 95 percent upper bound on the error is at most 5 percent; coverage and realised error on the ${evalSplit === "test" ? "held-out" : "training (same) items"}. Pairs: accept when both judges agree.`,
  "",
);
const sel: Record<string, unknown> = {};
const selRows: string[][] = [];
for (const j of MAIN.filter((j) => j.scored && !j.id.endsWith("@fit"))) {
  const r = selective(j, items, inTrain, inEval, 0.05);
  sel[j.id] = r;
  selRows.push([
    j.label,
    r ? `${r.lo.toFixed(2)} / ${r.hi.toFixed(2)}` : "-",
    r ? pct(r.calibrationCoverage) : "none at 5%",
    r ? pct(r.coverage) : "-",
    r ? String(r.accepted) : "-",
    r ? pct(r.error) : "-",
    r ? pct(r.errorUpper) : "-",
  ]);
}
table(
  [
    "judge",
    "low / high threshold",
    "train coverage",
    "coverage",
    "accepted",
    "error among accepted",
    "95% upper bound",
  ],
  selRows,
);
const agRows: string[][] = [];
const agree: Record<string, unknown> = {};
for (const [A, B] of pairsOf(TOP3)) {
  const r = agreementSelective(A, B, items, inEval);
  agree[`${A.id}|${B.id}`] = r;
  agRows.push([
    `${A.label} x ${B.label}`,
    pct(r.coverage),
    String(r.accepted),
    pct(r.error),
    pct(r.errorUpper),
  ]);
}
table(["pair, agreement rule", "coverage", "accepted", "error among accepted", "95% upper bound"], agRows);
out.selective = { single: sel, agreement: agree };

// ---------------------------------------------------------------------------------- subjective, H1
L.push(`## 9. Subjective panels and H1`, "");
L.push(
  `CHARM-100 (primary) and HealthBench-100 test (secondary), judged through the Autorubric library (Jev under the noul_framed binary framing; LLM judges through LiteLLM at reasoning low) and the Decisions API. Ordinal criteria are MET in the upper half of their scale; the nominal response_length criterion and N/A labels are not used. Intervals resample items.`,
  "",
);
const panels = [
  ["charm100", "bench/subjective/charm100.json", "CHARM-100"],
  ["healthbench-100-test", "bench/subjective/healthbench-100-test.json", "HealthBench-100 test"],
] as const;
const panelOut: Record<string, unknown> = {};
const PANEL_JUDGES = ["jev", "jev-choice", "luna-dec", "luna-chat", "deepseek-pro", "claude"];
const PANEL_LABEL: Record<string, string> = {
  jev: "Jev (noul_framed)",
  "jev-choice": "Jev (choice framing)",
  "luna-dec": "GPT-6 Luna Decisions",
  "luna-chat": "GPT-6 Luna chat",
  "deepseek-pro": "DeepSeek V4 Pro",
  claude: "Claude Sonnet 5.5",
};
const panelCorr: Record<string, Record<string, PairCorrelation>> = {};
for (const [name, file, title] of panels) {
  const p = await loadPanel(name, file);
  L.push(
    `### 9.${name === "charm100" ? 1 : 2} ${title}: ${p.nItems} items, ${p.cells.length} criterion judgements with a human label`,
    "",
  );
  const rows: string[][] = [];
  const pm: Record<string, unknown> = {};
  for (const id of PANEL_JUDGES) {
    const m = panelJudgeMetrics(p, id);
    if (!m) continue;
    pm[id] = m;
    rows.push([
      PANEL_LABEL[id]!,
      String(m.n),
      pct(m.coverage),
      pct(m.judgePositive),
      pct(m.labelPositive),
      ci(m.accuracy, pct),
      ci(m.kappa),
    ]);
  }
  table(["judge", "n", "coverage", "judge MET", "label MET", "accuracy", "kappa"], rows);
  const cRows: string[][] = [];
  const pc: Record<string, PairCorrelation> = {};
  const ids = PANEL_JUDGES.filter((id) => p.judges.has(id) && id !== "jev-choice");
  for (let i = 0; i < ids.length; i++)
    for (let k = i + 1; k < ids.length; k++) {
      const c = panelPairCorrelation(p, ids[i]!, ids[k]!);
      if (!c) continue;
      pc[`${ids[i]}|${ids[k]}`] = c;
      cRows.push([
        `${PANEL_LABEL[ids[i]!]} x ${PANEL_LABEL[ids[k]!]}`,
        String(c.n),
        `${c.table.a} / ${c.table.b} / ${c.table.c} / ${c.table.d}`,
        ci(c.phi),
        ci(c.kappa),
        `${ci(c.bGivenA, pct)} vs ${pct(c.baseB)}`,
      ]);
    }
  table(
    [
      "pair",
      "n",
      "both / A only / B only / neither wrong",
      "phi",
      "kappa",
      "P(B wrong | A wrong) vs P(B wrong)",
    ],
    cRows,
  );
  panelCorr[name] = pc;
  panelOut[name] = { metrics: pm, correlations: pc, cells: p.cells.length, items: p.nItems };
}
L.push(`### 9.3 H1: task objectivity`, "");
L.push(
  `Prediction: for the same pair of judges, phi between error indicators is lower on DebateCheck (top-3 condition, this split) than on the subjective panel; support needs DebateCheck below the panel value for at least 80 percent of pairs, with non-overlapping intervals for at least half.`,
  "",
);
const dcCorr = new Map<string, PairCorrelation>();
for (const c of corr.filter((c) => c.n > 0)) {
  dcCorr.set(`${c.a}|${c.b}`, c);
  dcCorr.set(`${c.b}|${c.a}`, c);
}
const h1: Record<string, unknown> = {};
for (const [name, , title] of panels) {
  const pc = panelCorr[name] ?? {};
  const rows: string[][] = [];
  let lower = 0,
    disjoint = 0,
    total = 0;
  for (const [key, c] of Object.entries(pc)) {
    const [a, b] = key.split("|") as [string, string];
    const dc = dcCorr.get(`${PANEL_TO_DEBATECHECK[a]}|${PANEL_TO_DEBATECHECK[b]}`);
    if (!dc || dc.phi.point === null || c.phi.point === null) continue;
    total++;
    const isLower = dc.phi.point < c.phi.point;
    const isDisjoint = dc.phi.hi !== null && c.phi.lo !== null && dc.phi.hi < c.phi.lo;
    if (isLower) lower++;
    if (isDisjoint) disjoint++;
    rows.push([
      `${PANEL_LABEL[a]} x ${PANEL_LABEL[b]}`,
      ci(dc.phi),
      ci(c.phi),
      isLower ? "yes" : "no",
      isDisjoint ? "yes" : "no",
    ]);
  }
  L.push(`${title}:`, "");
  table(["pair", "phi on DebateCheck", `phi on ${title}`, "DebateCheck lower", "intervals disjoint"], rows);
  const verdict =
    total === 0
      ? "pending"
      : lower / total >= 0.8 && disjoint / total >= 0.5
        ? "supported"
        : lower / total >= 0.8
          ? "direction holds, intervals overlap for more than half"
          : "not supported";
  L.push(
    `${title} verdict: DebateCheck lower in ${lower} of ${total} pairs, disjoint in ${disjoint}: **${verdict}**.`,
    "",
  );
  h1[name] = { lower, disjoint, total, verdict };
}
out.h1 = h1;
out.panels = panelOut;

// ----------------------------------------------------------------------------------------- checklist
L.push(`## 10. Reporting checklist (Rao and Callison-Burch, 2606.00093)`, "");
L.push(
  `- Scale: binary MET / UNMET per sentence against a construction label (altered = contradicted); decision models and HHEM give a probability decided at 0.5 or a train-fitted threshold, LLM judges a label.`,
);
L.push(
  `- Abstention: an LLM answer without a parsable verdict is excluded and counted in coverage; coverage is reported per judge in section 2 and per panel judge in section 9.`,
);
L.push(`- Positive rates: the judge's and the label's rates are in sections 3.1 and 9.`);
L.push(
  `- Resampling unit: pairs on DebateCheck, conversations on the panels; 1,000 percentile bootstrap resamples, seed 1.`,
);
L.push(
  `- Prompts and question texts: scripts/debatecheck at the fingerprints listed in the pre-registration.`,
  "",
);

await writeFile(values.out, L.join("\n") + "\n");
await writeFile(values.json, JSON.stringify(out, null, 1));
console.log(`wrote ${values.out} and ${values.json} (${evalSplit})`);

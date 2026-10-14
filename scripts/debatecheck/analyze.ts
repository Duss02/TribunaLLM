import { parseArgs } from "node:util";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { seededRandom } from "@/lib/random";
import { wilsonInterval } from "@/lib/stats";
import { PRICES } from "@/lib/bench/prices";
import { type Pair, VARIANTS, type VariantName, type JevAnswer, readJsonl } from "./lib";

// Everything the paper reports about DebateCheck, from the judging files. No network.
const { values } = parseArgs({
  options: {
    dir: { type: "string", default: "bench/debatecheck" },
    bootstrap: { type: "string", default: "1000" },
  },
});
const DIR = values.dir;
const B = Number(values.bootstrap);

interface JevRow {
  id: string;
  answers: Partial<Record<VariantName, { original: JevAnswer; perturbed: JevAnswer }>>;
}
type Label = "supports" | "contradicts" | "says_nothing";
interface LlmSide {
  label: Label | null;
  isClaim: boolean | null;
  passage: string | null;
  outputTokens: number;
}
interface LlmRow {
  id: string;
  judge: string;
  original: LlmSide;
  perturbed: LlmSide;
}

const pairs = await readJsonl<Pair>(`${DIR}/pairs.jsonl`);
const byId = new Map(pairs.map((p) => [p.id, p]));
const jevRows = new Map((await readJsonl<JevRow>(`${DIR}/jev-variants.jsonl`)).map((r) => [r.id, r]));
const llmFiles = (await readdir(DIR)).filter((f) => f.startsWith("llm-") && f.endsWith(".jsonl"));
const llm = new Map<string, Map<string, LlmRow>>();
for (const f of llmFiles) {
  const rows = await readJsonl<LlmRow>(`${DIR}/${f}`);
  if (rows.length === 0) continue;
  llm.set(rows[0]!.judge, new Map(rows.map((r) => [r.id, r])));
}
const optimize = await readFile(`${DIR}/optimize/result.json`, "utf8")
  .then((t) => JSON.parse(t) as OptimizeResult)
  .catch(() => null);
interface OptMetrics {
  auroc: number;
  detection70: number;
  falseAlarm70: number;
  detection50: number;
  falseAlarm50: number;
  n: number;
}
interface OptimizeResult {
  seed: { text: string; train: OptMetrics; test: OptMetrics };
  best: { text: string; train: OptMetrics; test: OptMetrics };
  history: { text: string; metrics: OptMetrics; round: number }[];
  reviser: string;
  jevTokens: number;
}

// ---------- helpers ----------
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
const pct = (x: number) => `${(100 * x).toFixed(1)}%`;
const f3 = (x: number) => x.toFixed(3);
function auroc(pos: number[], neg: number[]): number {
  // rank-based, O(n log n)
  const all = [...pos.map((v) => [v, 1] as const), ...neg.map((v) => [v, 0] as const)].sort(
    (a, b) => a[0] - b[0],
  );
  let rankSum = 0;
  for (let i = 0; i < all.length;) {
    let j = i;
    while (j < all.length && all[j]![0] === all[i]![0]) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) if (all[k]![1] === 1) rankSum += avgRank;
    i = j;
  }
  const n1 = pos.length,
    n0 = neg.length;
  return n1 === 0 || n0 === 0 ? Number.NaN : (rankSum - (n1 * (n1 + 1)) / 2) / (n1 * n0);
}
/** Bootstrap over pairs: resample pair indices, recompute `stat`, return [low, high]. */
function bootstrap(n: number, stat: (indices: number[]) => number, seed = 11): [number, number] {
  const random = seededRandom(seed);
  const out: number[] = [];
  for (let b = 0; b < B; b++) {
    const idx = Array.from({ length: n }, () => Math.floor(random() * n));
    const v = stat(idx);
    if (Number.isFinite(v)) out.push(v);
  }
  out.sort((a, b) => a - b);
  const q = (p: number) =>
    out[Math.min(out.length - 1, Math.max(0, Math.floor(p * (out.length - 1))))] ?? Number.NaN;
  return [q(0.025), q(0.975)];
}
const ci = ([lo, hi]: [number, number], f = pct) => `${f(lo)}–${f(hi)}`;

/** Binary agreement of a judge's contradiction flags with the construction labels (perturbed = 1). */
function binaryAgreement(flagOrig: (boolean | null)[], flagPert: (boolean | null)[]) {
  // items: each pair contributes two items; null = abstained/unparsed (excluded, counted as coverage)
  let tp = 0,
    fp = 0,
    fn = 0,
    tn = 0,
    abstain = 0;
  for (let i = 0; i < flagOrig.length; i++) {
    const o = flagOrig[i],
      p = flagPert[i];
    if (o === null) abstain++;
    else if (o) fp++;
    else tn++;
    if (p === null) abstain++;
    else if (p) tp++;
    else fn++;
  }
  const n = tp + fp + fn + tn;
  const acc = n === 0 ? Number.NaN : (tp + tn) / n;
  const judgePos = n === 0 ? Number.NaN : (tp + fp) / n;
  const labelPos = n === 0 ? Number.NaN : (tp + fn) / n;
  const po = acc,
    pe = judgePos * labelPos + (1 - judgePos) * (1 - labelPos);
  const kappa = pe === 1 ? Number.NaN : (po - pe) / (1 - pe);
  const denom = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const phi = denom === 0 ? Number.NaN : (tp * tn - fp * fn) / denom;
  const precision = tp + fp === 0 ? Number.NaN : tp / (tp + fp);
  const recall = tp + fn === 0 ? Number.NaN : tp / (tp + fn);
  const f1 =
    Number.isNaN(precision) || Number.isNaN(recall) || precision + recall === 0
      ? Number.NaN
      : (2 * precision * recall) / (precision + recall);
  return {
    tp,
    fp,
    fn,
    tn,
    n,
    abstain,
    coverage: n / (n + abstain),
    accuracy: acc,
    judgePos,
    labelPos,
    kappa,
    phi,
    precision,
    recall,
    f1,
  };
}

// ---------- A. dataset ----------
const lines: string[] = ["# DebateCheck: results\n"];
const summary: Record<string, unknown> = {};
const count = (items: Pair[], pick: (p: Pair) => string) => {
  const m = new Map<string, number>();
  for (const p of items) m.set(pick(p), (m.get(pick(p)) ?? 0) + 1);
  return Object.fromEntries([...m].sort());
};
summary.dataset = {
  pairs: pairs.length,
  split: count(pairs, (p) => p.split),
  kind: count(pairs, (p) => p.kind),
  pack: count(pairs, (p) => p.pack),
  model: count(pairs, (p) => p.model),
};
lines.push(
  `## Dataset\n\n${pairs.length} contrastive pairs from 180 blind debates. Split by motion: ${JSON.stringify(summary.dataset)}\n`,
);

// ---------- B. Jev variants ----------
const judged = pairs.filter((p) => jevRows.has(p.id));
lines.push(`## Jev under five criterion texts (${judged.length} pairs judged)\n`);
lines.push(
  "AUROC separates altered from unchanged sentences by p(contradicts). Detection is the share of altered sentences at or above the threshold, false alarm the share of unchanged ones. Brackets are 95% bootstrap intervals over pairs.\n",
);
lines.push("| variant | AUROC | det ≥0.7 | FA ≥0.7 | det ≥0.5 | FA ≥0.5 | Jev tokens/pair |");
lines.push("|---|---|---|---|---|---|---:|");
const variantStats: Record<string, unknown> = {};
const getP = (p: Pair, v: VariantName, which: "original" | "perturbed") =>
  jevRows.get(p.id)?.answers[v]?.[which].contradicts ?? Number.NaN;
function variantMetrics(items: Pair[], v: VariantName | "ensemble4" | "ensemble5") {
  const pOf = (p: Pair, which: "original" | "perturbed") => {
    if (v === "ensemble4")
      return mean(["sharp20", "sharp3", "direct3", "twostep3"].map((x) => getP(p, x as VariantName, which)));
    if (v === "ensemble5") return mean(VARIANTS.map((x) => getP(p, x.name, which)));
    return getP(p, v, which);
  };
  const ok = items.filter((p) => Number.isFinite(pOf(p, "original")) && Number.isFinite(pOf(p, "perturbed")));
  const pos = ok.map((p) => pOf(p, "perturbed")),
    neg = ok.map((p) => pOf(p, "original"));
  const stat = (idx: number[]) =>
    auroc(
      idx.map((i) => pos[i]!),
      idx.map((i) => neg[i]!),
    );
  const det = (t: number) => pos.filter((x) => x >= t).length / Math.max(1, pos.length);
  const fa = (t: number) => neg.filter((x) => x >= t).length / Math.max(1, neg.length);
  const tokens = v.startsWith("ensemble")
    ? Number.NaN
    : mean(
        ok.map((p) => {
          const a = jevRows.get(p.id)!.answers[v as VariantName]!;
          return a.original.inputTokens + a.perturbed.inputTokens;
        }),
      );
  return {
    n: ok.length,
    auroc: auroc(pos, neg),
    aurocCi: ok.length > 10 ? bootstrap(ok.length, stat) : ([Number.NaN, Number.NaN] as [number, number]),
    det70: det(0.7),
    fa70: fa(0.7),
    det50: det(0.5),
    fa50: fa(0.5),
    det70Ci: wilsonInterval(pos.filter((x) => x >= 0.7).length, Math.max(1, pos.length)),
    fa70Ci: wilsonInterval(neg.filter((x) => x >= 0.7).length, Math.max(1, neg.length)),
    tokens,
  };
}
const allVariants: (VariantName | "ensemble4" | "ensemble5")[] = [
  ...VARIANTS.map((v) => v.name),
  "ensemble4",
  "ensemble5",
];
for (const v of allVariants) {
  const m = variantMetrics(judged, v);
  variantStats[v] = m;
  lines.push(
    `| ${v} | ${f3(m.auroc)} [${ci(m.aurocCi, f3)}] | ${pct(m.det70)} [${pct(m.det70Ci.low)}–${pct(m.det70Ci.high)}] | ${pct(m.fa70)} [${pct(m.fa70Ci.low)}–${pct(m.fa70Ci.high)}] | ${pct(m.det50)} | ${pct(m.fa50)} | ${Number.isFinite(m.tokens) ? Math.round(m.tokens) : "-"} |`,
  );
}
summary.variants = variantStats;

lines.push("\n### By split and by kind of number (detection ≥0.7 / false alarm ≥0.7 / AUROC)\n");
lines.push(`| subset | n | ${allVariants.join(" | ")} |`);
lines.push(`|---|---:|${allVariants.map(() => "---").join("|")}|`);
const subsets: [string, Pair[]][] = [
  ["train motions", judged.filter((p) => p.split === "train")],
  ["held-out motions", judged.filter((p) => p.split === "test")],
  ...["year", "percent", "other"].map((k) => [k, judged.filter((p) => p.kind === k)] as [string, Pair[]]),
];
const bySubset: Record<string, Record<string, unknown>> = {};
for (const [name, items] of subsets) {
  bySubset[name] = {};
  lines.push(
    `| ${name} | ${items.length} | ${allVariants
      .map((v) => {
        const m = variantMetrics(items, v);
        bySubset[name]![v] = m;
        return `${pct(m.det70)} / ${pct(m.fa70)} / ${f3(m.auroc)}`;
      })
      .join(" | ")} |`,
  );
}
summary.bySubset = bySubset;

lines.push(
  "\n### By debater (sharp3: detection ≥0.7 of altered sentences, false alarms on its own unchanged sentences)\n",
);
lines.push(
  "| model | pairs | loose20 det | sharp3 det | sharp3 FA | sharp3 AUROC | twostep3 det | twostep3 FA |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");
const byModel: Record<string, unknown> = {};
for (const model of Object.keys(count(judged, (p) => p.model))) {
  const items = judged.filter((p) => p.model === model);
  const l = variantMetrics(items, "loose20"),
    s = variantMetrics(items, "sharp3"),
    t = variantMetrics(items, "twostep3");
  byModel[model] = { n: items.length, loose20: l, sharp3: s, twostep3: t };
  lines.push(
    `| ${model} | ${items.length} | ${pct(l.det70)} | ${pct(s.det70)} | ${pct(s.fa70)} | ${f3(s.auroc)} | ${pct(t.det70)} | ${pct(t.fa70)} |`,
  );
}
summary.byModel = byModel;

// Offset correction: the threshold that maximises Youden's J on the training motions, applied to the held-out motions.
lines.push(
  "\n### Threshold fitted on the training motions, applied to the held-out motions (offset correction)\n",
);
lines.push(
  "Mean p(contradicts) on altered and unchanged sentences shows where each wording puts the scale; the fitted threshold is the one that maximises detection minus false alarm on the training motions.\n",
);
lines.push(
  "| variant | mean p altered (train) | mean p unchanged (train) | fitted threshold | held-out det | held-out FA | held-out Youden | held-out det at 0.7 | held-out FA at 0.7 |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
const offset: Record<string, unknown> = {};
for (const v of allVariants) {
  const pOf = (p: Pair, which: "original" | "perturbed") =>
    v === "ensemble4"
      ? mean(["sharp20", "sharp3", "direct3", "twostep3"].map((x) => getP(p, x as VariantName, which)))
      : v === "ensemble5"
        ? mean(VARIANTS.map((x) => getP(p, x.name, which)))
        : getP(p, v, which);
  const tr = judged.filter(
    (p) => p.split === "train" && Number.isFinite(pOf(p, "original")) && Number.isFinite(pOf(p, "perturbed")),
  );
  const te = judged.filter(
    (p) => p.split === "test" && Number.isFinite(pOf(p, "original")) && Number.isFinite(pOf(p, "perturbed")),
  );
  if (tr.length === 0 || te.length === 0) continue;
  let bestT = 0.5,
    bestJ = -1;
  for (let t = 0.02; t < 1; t += 0.02) {
    const j =
      tr.filter((p) => pOf(p, "perturbed") >= t).length / tr.length -
      tr.filter((p) => pOf(p, "original") >= t).length / tr.length;
    if (j > bestJ) {
      bestJ = j;
      bestT = Math.round(t * 100) / 100;
    }
  }
  const det = te.filter((p) => pOf(p, "perturbed") >= bestT).length / te.length;
  const fa = te.filter((p) => pOf(p, "original") >= bestT).length / te.length;
  const det7 = te.filter((p) => pOf(p, "perturbed") >= 0.7).length / te.length;
  const fa7 = te.filter((p) => pOf(p, "original") >= 0.7).length / te.length;
  const mAlt = mean(tr.map((p) => pOf(p, "perturbed"))),
    mUn = mean(tr.map((p) => pOf(p, "original")));
  offset[v] = {
    meanAltered: mAlt,
    meanUnchanged: mUn,
    threshold: bestT,
    trainYouden: bestJ,
    testDet: det,
    testFa: fa,
    testYouden: det - fa,
    testDet70: det7,
    testFa70: fa7,
    nTrain: tr.length,
    nTest: te.length,
  };
  lines.push(
    `| ${v} | ${f3(mAlt)} | ${f3(mUn)} | ${bestT.toFixed(2)} | ${pct(det)} | ${pct(fa)} | ${f3(det - fa)} | ${pct(det7)} | ${pct(fa7)} |`,
  );
}
summary.offset = offset;

// test-retest of the debate's own question
const retest = judged
  .map((p) => Math.abs(getP(p, "loose20", "original") - p.debate.contradicts))
  .filter(Number.isFinite);
const retestFlip = judged.filter(
  (p) => getP(p, "loose20", "original") >= 0.7 !== p.debate.contradicts >= 0.7,
).length;
summary.retest = { n: retest.length, meanAbsDelta: mean(retest), flipsAt07: retestFlip };
lines.push(
  `\nTest-retest of the debate's own question on unchanged sentences: mean |Δp(contradicts)| ${f3(mean(retest))}, verdict flips at 0.7: ${retestFlip} of ${retest.length}.\n`,
);

// ---------- C. LLM judges and binary agreement ----------
lines.push(
  "## Judges as binary contradiction detectors (the agreement protocol: two items per pair, label = altered)\n",
);
lines.push(
  "Scale: binary (flagged as contradicts or not). Abstention: an LLM answer that did not parse or that returned no relation is excluded and counted in coverage; Jev never abstains. Resampling unit: the pair. Both positive rates are shown next to κ, as the agreement paper asks.\n",
);
lines.push(
  "| judge | items | coverage | judge positive rate | label positive rate | accuracy | φ | κ [95% CI] | precision | recall | F1 | TP / FP / FN / TN |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|---|---:|---:|---:|---|");
const judgesTable: Record<string, unknown> = {};
type Flags = { name: string; orig: (boolean | null)[]; pert: (boolean | null)[]; items: Pair[] };
const flagSets: Flags[] = [];
for (const [v, t] of [
  ["loose20", 0.7],
  ["sharp20", 0.7],
  ["sharp3", 0.7],
  ["sharp3", 0.5],
  ["direct3", 0.7],
  ["twostep3", 0.7],
  ["framed20", 0.5],
  ["framed3", 0.5],
  ["ensemble4", 0.5],
] as [VariantName | "ensemble4", number][]) {
  const items = judged;
  const pOf = (p: Pair, which: "original" | "perturbed") =>
    v === "ensemble4"
      ? mean(["sharp20", "sharp3", "direct3", "twostep3"].map((x) => getP(p, x as VariantName, which)))
      : getP(p, v, which);
  flagSets.push({
    name: `Jev ${v} ≥${t}`,
    items,
    orig: items.map((p) => (Number.isFinite(pOf(p, "original")) ? pOf(p, "original") >= t : null)),
    pert: items.map((p) => (Number.isFinite(pOf(p, "perturbed")) ? pOf(p, "perturbed") >= t : null)),
  });
}
for (const [judge, rows] of llm) {
  const items = pairs.filter((p) => rows.has(p.id));
  const flag = (s: LlmSide) => (s.label === null ? null : s.label === "contradicts");
  flagSets.push({
    name: `LLM ${judge}`,
    items,
    orig: items.map((p) => flag(rows.get(p.id)!.original)),
    pert: items.map((p) => flag(rows.get(p.id)!.perturbed)),
  });
}
for (const fs of flagSets) {
  const a = binaryAgreement(fs.orig, fs.pert);
  const kci = bootstrap(
    fs.items.length,
    (idx) =>
      binaryAgreement(
        idx.map((i) => fs.orig[i]!),
        idx.map((i) => fs.pert[i]!),
      ).kappa,
  );
  judgesTable[fs.name] = { ...a, kappaCi: kci };
  lines.push(
    `| ${fs.name} | ${a.n} | ${pct(a.coverage)} | ${pct(a.judgePos)} | ${pct(a.labelPos)} | ${pct(a.accuracy)} | ${f3(a.phi)} | ${f3(a.kappa)} [${ci(kci, f3)}] | ${pct(a.precision)} | ${pct(a.recall)} | ${pct(a.f1)} | ${a.tp} / ${a.fp} / ${a.fn} / ${a.tn} |`,
  );
}
summary.judges = judgesTable;

// LLM label distributions
for (const [judge, rows] of llm) {
  const items = pairs.filter((p) => rows.has(p.id));
  const dist = (which: "original" | "perturbed") => {
    const m: Record<string, number> = {};
    for (const p of items) {
      const l = rows.get(p.id)![which].label ?? "unparsed";
      m[l] = (m[l] ?? 0) + 1;
    }
    return m;
  };
  const notClaim = (which: "original" | "perturbed") =>
    items.filter((p) => rows.get(p.id)![which].isClaim === false).length;
  lines.push(
    `\n${judge}: labels on unchanged ${JSON.stringify(dist("original"))}, on altered ${JSON.stringify(dist("perturbed"))}; is_claim=false on ${notClaim("original")} unchanged and ${notClaim("perturbed")} altered of ${items.length}.`,
  );
  (summary.judges as Record<string, unknown>)[`${judge} distributions`] = {
    original: dist("original"),
    perturbed: dist("perturbed"),
    n: items.length,
  };
}

// ---------- D. correlated errors ----------
lines.push("\n## Correlated errors on the same items\n");
lines.push(
  "Error = wrong binary decision on an item (altered flagged as not contradicted, or unchanged flagged as contradicted). Jev decides at 0.5; a confident Jev error has p ≤ 0.2 on an altered sentence or p ≥ 0.8 on an unchanged one. The independence baseline is the LLM's own error rate on the same items.\n",
);
const corr: Record<string, unknown> = {};
const BASES: VariantName[] = ["sharp3", "framed3", "framed20"];
for (const base of BASES) {
  lines.push(`\n### Jev under ${base}\n`);
  lines.push(
    "| LLM judge | items in common | LLM error rate | Jev error rate | P(LLM wrong \\| Jev wrong) | P(LLM wrong \\| Jev confidently wrong) | n confident Jev errors | both wrong share | κ between error indicators |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|");
  for (const [judge, rows] of llm) {
    const items = judged.filter((p) => rows.has(p.id));
    type Item = { jevWrong: boolean; jevConfWrong: boolean; llmWrong: boolean | null };
    const its: Item[] = [];
    for (const p of items) {
      const r = rows.get(p.id)!;
      for (const which of ["original", "perturbed"] as const) {
        const pj = getP(p, base, which);
        if (!Number.isFinite(pj)) continue;
        const jevFlag = pj >= 0.5;
        const label = which === "perturbed";
        const jevWrong = jevFlag !== label;
        const jevConfWrong = jevWrong && (which === "perturbed" ? pj <= 0.2 : pj >= 0.8);
        const l = r[which].label;
        const llmWrong = l === null ? null : (l === "contradicts") !== label;
        its.push({ jevWrong, jevConfWrong, llmWrong });
      }
    }
    const covered = its.filter((i) => i.llmWrong !== null) as (Item & { llmWrong: boolean })[];
    const baseRate = mean(covered.map((i) => +i.llmWrong));
    const givenWrong = covered.filter((i) => i.jevWrong);
    const givenConf = covered.filter((i) => i.jevConfWrong);
    const both = mean(covered.map((i) => +(i.jevWrong && i.llmWrong)));
    // kappa between error indicators
    const a = covered.filter((i) => i.jevWrong && i.llmWrong).length,
      b = covered.filter((i) => i.jevWrong && !i.llmWrong).length,
      c = covered.filter((i) => !i.jevWrong && i.llmWrong).length,
      d = covered.filter((i) => !i.jevWrong && !i.llmWrong).length;
    const n = a + b + c + d,
      po = (a + d) / n,
      pe = ((a + b) / n) * ((a + c) / n) + ((c + d) / n) * ((b + d) / n);
    const kappa = (po - pe) / (1 - pe);
    corr[`${base}|${judge}`] = {
      base,
      judge,
      items: covered.length,
      llmErrorRate: baseRate,
      pWrongGivenJevWrong: mean(givenWrong.map((i) => +i.llmWrong)),
      pWrongGivenJevConfWrong: mean(givenConf.map((i) => +i.llmWrong)),
      nConfident: givenConf.length,
      bothWrong: both,
      kappaErrors: kappa,
      jevErrorRate: mean(covered.map((i) => +i.jevWrong)),
    };
    lines.push(
      `| ${judge} | ${covered.length} | ${pct(baseRate)} | ${pct(mean(covered.map((i) => +i.jevWrong)))} | ${pct(mean(givenWrong.map((i) => +i.llmWrong)))} | ${pct(mean(givenConf.map((i) => +i.llmWrong)))} | ${givenConf.length} | ${pct(both)} | ${f3(kappa)} |`,
    );
  }
}
if (llm.size >= 2) {
  const judges = [...llm.keys()];
  for (let i = 0; i < judges.length; i++)
    for (let j = i + 1; j < judges.length; j++) {
      const A = llm.get(judges[i]!)!,
        Bm = llm.get(judges[j]!)!;
      const items = pairs.filter((p) => A.has(p.id) && Bm.has(p.id));
      let aw = 0,
        bw = 0,
        both = 0,
        n = 0;
      for (const p of items)
        for (const which of ["original", "perturbed"] as const) {
          const la = A.get(p.id)![which].label,
            lb = Bm.get(p.id)![which].label;
          if (la === null || lb === null) continue;
          const label = which === "perturbed";
          const ea = (la === "contradicts") !== label,
            eb = (lb === "contradicts") !== label;
          n++;
          aw += +ea;
          bw += +eb;
          both += +(ea && eb);
        }
      corr[`${judges[i]} x ${judges[j]}`] = {
        items: n,
        errorA: aw / n,
        errorB: bw / n,
        bothWrong: both / n,
        pBgivenA: aw === 0 ? Number.NaN : both / aw,
        lift: aw === 0 || bw === 0 ? Number.NaN : (both * n) / (aw * bw),
        kappaErrors: (() => {
          const pa = aw / n,
            pb = bw / n,
            pboth = both / n;
          const po = 1 - (pa + pb - 2 * pboth);
          const pe = pa * pb + (1 - pa) * (1 - pb);
          return pe === 1 ? Number.NaN : (po - pe) / (1 - pe);
        })(),
      };
      lines.push(
        `\n${judges[i]} and ${judges[j]} on ${n} items: error rates ${pct(aw / n)} and ${pct(bw / n)}, both wrong on ${pct(both / n)}; P(${judges[j]} wrong | ${judges[i]} wrong) = ${pct(both / Math.max(1, aw))}.`,
      );
    }
}
// Shared difficulty: the Jev-LLM overlap on the items a third judge gets wrong and on the items it gets right.
{
  const luna = llm.get("gpt-6-luna"),
    flash = llm.get("deepseek-v4-flash");
  if (luna && flash) {
    const strata = { hard: { n: 0, jev: 0, llm: 0, both: 0 }, easy: { n: 0, jev: 0, llm: 0, both: 0 } };
    for (const p of judged) {
      const L = luna.get(p.id),
        F = flash.get(p.id);
      if (!L || !F) continue;
      for (const which of ["original", "perturbed"] as const) {
        const pj = getP(p, "framed3", which);
        const label = which === "perturbed";
        if (!Number.isFinite(pj) || L[which].label === null || F[which].label === null) continue;
        const jevWrong = pj >= 0.5 !== label,
          lunaWrong = (L[which].label === "contradicts") !== label,
          flashWrong = (F[which].label === "contradicts") !== label;
        const s = flashWrong ? strata.hard : strata.easy;
        s.n++;
        s.jev += +jevWrong;
        s.llm += +lunaWrong;
        s.both += +(jevWrong && lunaWrong);
      }
    }
    const row = (s: { n: number; jev: number; llm: number; both: number }) => ({
      n: s.n,
      jevErr: s.jev / Math.max(1, s.n),
      llmErr: s.llm / Math.max(1, s.n),
      pLlmGivenJev: s.both / Math.max(1, s.jev),
    });
    summary.difficulty = {
      base: "framed3",
      llm: "gpt-6-luna",
      third: "deepseek-v4-flash",
      hard: row(strata.hard),
      easy: row(strata.easy),
    };
    lines.push(
      `\nShared difficulty (Jev framed3 vs GPT-6 Luna, split by whether DeepSeek V4 Flash was wrong): hard items n=${strata.hard.n}, Jev err ${pct(row(strata.hard).jevErr)}, Luna err ${pct(row(strata.hard).llmErr)}, P(Luna wrong | Jev wrong) ${pct(row(strata.hard).pLlmGivenJev)}; easy items n=${strata.easy.n}, Jev err ${pct(row(strata.easy).jevErr)}, Luna err ${pct(row(strata.easy).llmErr)}, P(Luna wrong | Jev wrong) ${pct(row(strata.easy).pLlmGivenJev)}.`,
    );
  }
}
// Combining judges: does lower error overlap buy accuracy? Rules are fitted on the training motions and
// measured on the held-out motions, on items where both LLMs gave a usable answer.
{
  const luna = llm.get("gpt-6-luna"),
    flash = llm.get("deepseek-v4-flash");
  if (luna && flash) {
    type Row = { split: string; label: number; s: Record<string, number> };
    const rows: Row[] = [];
    for (const p of judged) {
      const L = luna.get(p.id),
        F = flash.get(p.id);
      if (!L || !F) continue;
      for (const which of ["original", "perturbed"] as const) {
        if (L[which].label === null || F[which].label === null) continue;
        rows.push({
          split: p.split,
          label: which === "perturbed" ? 1 : 0,
          s: {
            framed3: getP(p, "framed3", which),
            framed20: getP(p, "framed20", which),
            direct3: getP(p, "direct3", which),
            luna: L[which].label === "contradicts" ? 1 : 0,
            flash: F[which].label === "contradicts" ? 1 : 0,
          },
        });
      }
    }
    const tr = rows.filter((r) => r.split === "train"),
      te = rows.filter((r) => r.split === "test");
    const acc = (rs: Row[], f: (r: Row) => boolean) =>
      rs.filter((r) => (f(r) ? 1 : 0) === r.label).length / Math.max(1, rs.length);
    const flag = (k: string) => (r: Row) => r.s[k]! >= 0.5;
    const single: Record<string, number> = {};
    for (const k of ["framed3", "framed20", "direct3", "luna", "flash"]) single[k] = acc(te, flag(k));
    const pairsOut: Record<string, unknown> = {};
    for (const [a, b] of [
      ["framed3", "luna"],
      ["framed3", "flash"],
      ["luna", "flash"],
      ["framed3", "direct3"],
      ["framed20", "luna"],
    ]) {
      const oracle = acc(te, (r) => {
        const ra = (flag(a!)(r) ? 1 : 0) === r.label,
          rb = (flag(b!)(r) ? 1 : 0) === r.label;
        return ra || rb ? r.label === 1 : r.label !== 1;
      });
      let best: { w: number; t: number; tr: number } | null = null;
      for (const w of [0.25, 0.5, 0.75, 1, 1.5, 2, 3])
        for (let t = 0.1; t <= 1.5 * (1 + w); t += 0.05) {
          const a_ = acc(tr, (r) => r.s[a!]! + w * r.s[b!]! >= t);
          if (!best || a_ > best.tr) best = { w, t: Math.round(t * 100) / 100, tr: a_ };
        }
      const fitted = acc(te, (r) => r.s[a!]! + best!.w * r.s[b!]! >= best!.t);
      pairsOut[`${a}+${b}`] = {
        oracle,
        fitted,
        w: best!.w,
        t: best!.t,
        bestSingle: Math.max(single[a!]!, single[b!]!),
      };
    }
    const majority = acc(
      te,
      (r) => (flag("framed3")(r) ? 1 : 0) + (flag("luna")(r) ? 1 : 0) + (flag("flash")(r) ? 1 : 0) >= 2,
    );
    summary.combinations = { nTrain: tr.length, nTest: te.length, single, pairs: pairsOut, majority };
    lines.push(
      `\n## Combining judges (held-out motions, ${te.length} items; rules fitted on ${tr.length} training items)\n`,
    );
    lines.push("| judges | at least one right | fitted weighted rule | best single |");
    lines.push("|---|---:|---:|---:|");
    for (const [k, v] of Object.entries(pairsOut) as [string, any][])
      lines.push(
        `| ${k} | ${pct(v.oracle)} | ${pct(v.fitted)} (w=${v.w}, t=${v.t}) | ${pct(v.bestSingle)} |`,
      );
    lines.push(
      `\nSingle judges on the same items: ${Object.entries(single)
        .map(([k, v]) => `${k} ${pct(v)}`)
        .join(", ")}. Majority of framed3 + Luna + Flash: ${pct(majority)}.`,
    );
  }
}
summary.correlatedErrors = corr;

// ---------- E. confidence and cascades ----------
const conf: Record<string, unknown> = {};
for (const base of BASES) {
  lines.push(`\n## Jev's confidence and a confidence cascade (${base}, decision at 0.5)\n`);
  {
    const items: { correct: boolean; conf: number; pair: Pair; which: "original" | "perturbed" }[] = [];
    for (const p of judged)
      for (const which of ["original", "perturbed"] as const) {
        const pj = getP(p, base, which);
        if (!Number.isFinite(pj)) continue;
        items.push({
          correct: pj >= 0.5 === (which === "perturbed"),
          conf: Math.abs(2 * pj - 1),
          pair: p,
          which,
        });
      }
    const aur = auroc(
      items.filter((i) => i.correct).map((i) => i.conf),
      items.filter((i) => !i.correct).map((i) => i.conf),
    );
    const confBase: Record<string, unknown> = {
      aurocConfidenceForCorrectness: aur,
      jevAccuracy: mean(items.map((i) => +i.correct)),
    };
    conf[base] = confBase;
    lines.push(
      `Jev alone: accuracy ${pct(mean(items.map((i) => +i.correct)))} on ${items.length} items; AUROC of its confidence |2p−1| for its own correctness ${f3(aur)}.\n`,
    );
    const jevCostPerItem =
      0.042e-6 *
      mean(
        judged
          .filter((p) => jevRows.get(p.id)!.answers[base])
          .map((p) => {
            const a = jevRows.get(p.id)!.answers[base]!;
            return (a.original.inputTokens + a.perturbed.inputTokens) / 2;
          }),
      );
    for (const [judge, rows] of llm) {
      const price = PRICES[judge];
      if (!price) continue;
      const common = items.filter((i) => rows.has(i.pair.id) && rows.get(i.pair.id)![i.which].label !== null);
      const llmCorrect = (i: (typeof items)[number]) =>
        (rows.get(i.pair.id)![i.which].label === "contradicts") === (i.which === "perturbed");
      const llmCostPerItem = (i: (typeof items)[number]) => {
        const side = rows.get(i.pair.id)![i.which];
        const inTok =
          180 +
          Math.ceil(i.pair.evidenceIds.slice(0, 3).length * 0) +
          Math.ceil((i.pair.original.length + 1500) / 4);
        return (inTok * price.input + side.outputTokens * price.output) / 1e6;
      };
      const llmAcc = mean(common.map((i) => +llmCorrect(i)));
      const llmCost = mean(common.map(llmCostPerItem));
      lines.push(`\n### Cascade with ${judge} as fallback (${common.length} items)\n`);
      lines.push(
        `${judge} alone: accuracy ${pct(llmAcc)}, cost per item $${llmCost.toFixed(5)}; Jev alone: $${jevCostPerItem.toFixed(6)}.\n`,
      );
      lines.push("| τ on confidence | escalated | accuracy | cost per item | share of LLM cost |");
      lines.push("|---:|---:|---:|---:|---:|");
      const curve: { tau: number; escalated: number; accuracy: number; cost: number }[] = [];
      for (let tau = 0; tau <= 1.0001; tau += 0.1) {
        let correct = 0,
          esc = 0,
          cost = 0;
        for (const i of common) {
          if (i.conf >= tau) {
            correct += +i.correct;
            cost += jevCostPerItem;
          } else {
            esc++;
            correct += +llmCorrect(i);
            cost += jevCostPerItem + llmCostPerItem(i);
          }
        }
        const point = {
          tau: Math.round(tau * 10) / 10,
          escalated: esc / common.length,
          accuracy: correct / common.length,
          cost: cost / common.length,
        };
        curve.push(point);
        lines.push(
          `| ${point.tau.toFixed(1)} | ${pct(point.escalated)} | ${pct(point.accuracy)} | $${point.cost.toFixed(5)} | ${pct(point.cost / llmCost)} |`,
        );
      }
      confBase[judge] = { llmAccuracy: llmAcc, llmCostPerItem: llmCost, jevCostPerItem, curve };
    }
  }
}
summary.cascade = conf;

// ---------- F. optimisation ----------
if (optimize) {
  lines.push(
    "\n## Held-out criterion optimisation (relation question over the top-3 passages; only the `contradicts` text changes)\n",
  );
  lines.push(
    `Reviser: ${optimize.reviser}. Training sample: ${optimize.seed.train.n} pairs from the training motions; held-out: ${optimize.seed.test.n} pairs from motions the loop never saw.\n`,
  );
  lines.push(
    "| wording | train AUROC | train det ≥0.7 | train FA ≥0.7 | held-out AUROC | held-out det ≥0.7 | held-out FA ≥0.7 |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  lines.push(
    `| seed (sharp) | ${f3(optimize.seed.train.auroc)} | ${pct(optimize.seed.train.detection70)} | ${pct(optimize.seed.train.falseAlarm70)} | ${f3(optimize.seed.test.auroc)} | ${pct(optimize.seed.test.detection70)} | ${pct(optimize.seed.test.falseAlarm70)} |`,
  );
  lines.push(
    `| optimised | ${f3(optimize.best.train.auroc)} | ${pct(optimize.best.train.detection70)} | ${pct(optimize.best.train.falseAlarm70)} | ${f3(optimize.best.test.auroc)} | ${pct(optimize.best.test.detection70)} | ${pct(optimize.best.test.falseAlarm70)} |`,
  );
  lines.push(`\nBest wording: "${optimize.best.text}"\n`);
  lines.push("All wordings tried (round, train AUROC, text):\n");
  for (const h of optimize.history)
    lines.push(
      `- r${h.round} ${f3(h.metrics.auroc)} det ${pct(h.metrics.detection70)} FA ${pct(h.metrics.falseAlarm70)}: "${h.text}"`,
    );
  summary.optimize = optimize;
}

const text = lines.join("\n") + "\n";
await writeFile(`${DIR}/REPORT.md`, text);
await writeFile(`${DIR}/summary.json`, JSON.stringify(summary, null, 2));
console.log(text);
console.log(`Wrote ${DIR}/REPORT.md and ${DIR}/summary.json`);

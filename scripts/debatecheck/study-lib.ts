import { existsSync } from "node:fs";
import { type Pair, readJsonl } from "./lib";

// Shared loading and statistics for the pre-registered study (docs/preregistration-judge-correlation.md):
// items are the two sides of every pair, judges are read from the per-judge JSONL files, every interval is a
// percentile bootstrap that resamples pairs.

export type Side = "original" | "perturbed";
export const SIDES: readonly Side[] = ["original", "perturbed"];
export type ItemType = "number" | "polarity" | "entity" | "attribution" | "unit";
export const TYPES: readonly ItemType[] = ["number", "polarity", "entity", "attribution", "unit"];
export interface Item {
  key: string;
  pairId: string;
  side: Side;
  /** 1 when the sentence was altered (contradicted by construction). */
  y: 0 | 1;
  type: ItemType;
  kind: string;
  split: "train" | "test";
  pack: string;
  model: string;
}
export const itemKey = (pairId: string, side: Side) => `${pairId}|${side}`;
export const typeOf = (kind: string): ItemType =>
  kind === "year" || kind === "percent" || kind === "other" ? "number" : (kind as ItemType);

async function readIf<T>(file: string): Promise<T[]> {
  return existsSync(file) ? readJsonl<T>(file) : [];
}

export async function loadItems(): Promise<{ items: Item[]; pairs: Map<string, Pair> }> {
  const rows = [
    ...(await readJsonl<Pair>("bench/debatecheck/pairs.jsonl")),
    ...(await readJsonl<Pair>("bench/debatecheck/pairs-types.jsonl")),
  ];
  const pairs = new Map(rows.map((p) => [p.id, p]));
  const items: Item[] = [];
  for (const p of rows)
    for (const side of SIDES)
      items.push({
        key: itemKey(p.id, side),
        pairId: p.id,
        side,
        y: side === "perturbed" ? 1 : 0,
        type: typeOf(p.kind),
        kind: p.kind,
        split: p.split,
        pack: p.pack,
        model: p.model,
      });
  return { items, pairs };
}

export interface JudgeDef {
  id: string;
  label: string;
  kind: "decision" | "llm" | "nli";
  maker: string;
  condition: "20" | "3";
  /** Whether the judge gives a probability (decision models, HHEM) or only a label (LLM judges). */
  scored: boolean;
}
export interface Judge extends JudgeDef {
  /** Probability of "contradicted" per item key; absent for label-only judges. */
  score: Map<string, number>;
  /** The judge's decision per item key; a missing key is an item the judge did not answer. */
  decision: Map<string, boolean>;
}

const mk = (def: JudgeDef): Judge => ({ ...def, score: new Map(), decision: new Map() });

type TwoSided<T> = { original: T; perturbed: T };
interface JevRow {
  id: string;
  answers: Record<string, TwoSided<{ contradicts: number }> | undefined>;
}
interface DecisionRow {
  id: string;
  answers: Record<string, TwoSided<{ probability: number }> | undefined>;
}
interface LlmRow {
  id: string;
  original: { verdict?: "MET" | "UNMET" | null };
  perturbed: { verdict?: "MET" | "UNMET" | null };
}
interface HhemRow {
  id: string;
  original: { contradicts: number };
  perturbed: { contradicts: number };
}

export const JUDGE_FILES = {
  jev: ["bench/debatecheck/jev-variants.jsonl", "bench/debatecheck/jev-variants-types.jsonl"],
  decisions: [
    "bench/debatecheck/decisions-gpt-6-luna.jsonl",
    "bench/debatecheck/decisions-gpt-6-luna-types.jsonl",
  ],
  decisionsLoose: ["bench/debatecheck/decisions-gpt-6-luna-loose.jsonl"],
  luna: [
    "bench/debatecheck/llm-gpt-6-luna-framed.jsonl",
    "bench/debatecheck/llm-gpt-6-luna-framed-types.jsonl",
  ],
  deepseek: [
    "bench/debatecheck/llm-deepseek-v4-pro-framed.jsonl",
    "bench/debatecheck/llm-deepseek-v4-pro-framed-types.jsonl",
  ],
  claude: ["bench/debatecheck/llm-claude-sonnet-5.5-framed.jsonl"],
  hhem: ["bench/debatecheck/hhem.jsonl", "bench/debatecheck/hhem-types.jsonl"],
} as const;

async function readAll<T>(files: readonly string[]): Promise<T[]> {
  const out: T[] = [];
  for (const f of files) out.push(...(await readIf<T>(f)));
  return out;
}

/** Every judge of the study, with the data available on disk. Threshold 0.5 for the scored ones. */
export async function loadJudges(): Promise<Judge[]> {
  const judges: Judge[] = [];
  const jevRows = await readAll<JevRow>(JUDGE_FILES.jev);
  for (const [variant, cond, id, wording] of [
    ["framed20", "20", "jev-20", "framed"],
    ["framed3", "3", "jev-3", "framed"],
    ["loose20", "20", "jev-loose-20", "relation question"],
    ["sharp3", "3", "jev-sharp-3", "sharp relation question"],
  ] as const) {
    const j = mk({
      id,
      label: `Jev 1.13.0, ${wording}, ${cond === "20" ? "20 passages" : "top-3"}`,
      kind: "decision",
      maker: "TypeSafe",
      condition: cond,
      scored: true,
    });
    for (const r of jevRows) {
      const a = r.answers[variant];
      if (!a) continue;
      for (const s of SIDES) setScore(j, itemKey(r.id, s), a[s].contradicts);
    }
    if (j.decision.size > 0) judges.push(j);
  }
  const decRows = await readAll<DecisionRow>(JUDGE_FILES.decisions);
  const looseRows = await readAll<DecisionRow>(JUDGE_FILES.decisionsLoose);
  for (const [rows, tag, labelTag] of [
    [decRows, "", "framed"],
    [looseRows, "-loose", "relation question"],
  ] as const) {
    for (const cond of ["20", "3"] as const) {
      const j = mk({
        id: `luna-dec${tag}-${cond}`,
        label: `GPT-6 Luna Decisions, ${labelTag}, ${cond === "20" ? "20 passages" : "top-3"}`,
        kind: "decision",
        maker: "OpenAI",
        condition: cond,
        scored: true,
      });
      for (const r of rows) {
        const a = r.answers[`d${cond}`];
        if (!a) continue;
        for (const s of SIDES) setScore(j, itemKey(r.id, s), a[s].probability);
      }
      if (j.decision.size > 0) judges.push(j);
    }
  }
  for (const [files, id, label, maker] of [
    [JUDGE_FILES.luna, "luna-chat", "GPT-6 Luna chat, framed, top-3", "OpenAI"],
    [JUDGE_FILES.deepseek, "deepseek-pro", "DeepSeek V4 Pro chat, framed, top-3", "DeepSeek"],
    [JUDGE_FILES.claude, "claude", "Claude Sonnet 5.5 chat, framed, top-3", "Anthropic"],
  ] as const) {
    const j = mk({ id, label, kind: "llm", maker, condition: "3", scored: false });
    for (const r of await readAll<LlmRow>(files))
      for (const s of SIDES) {
        const v = r[s].verdict;
        if (v === "MET" || v === "UNMET") j.decision.set(itemKey(r.id, s), v === "MET");
      }
    judges.push(j);
  }
  const h = mk({
    id: "hhem",
    label: "HHEM-2.1-Open, top-3",
    kind: "nli",
    maker: "Vectara",
    condition: "3",
    scored: true,
  });
  for (const r of await readAll<HhemRow>(JUDGE_FILES.hhem))
    for (const s of SIDES) setScore(h, itemKey(r.id, s), r[s].contradicts);
  judges.push(h);
  return judges;
}

export function setScore(j: Judge, key: string, p: number, threshold = 0.5): void {
  if (!Number.isFinite(p)) return;
  j.score.set(key, p);
  j.decision.set(key, p >= threshold);
}

/** A copy of a scored judge deciding at another threshold. */
export function rethreshold(j: Judge, threshold: number, id = `${j.id}@${threshold.toFixed(2)}`): Judge {
  const out = mk({ ...j, id, label: `${j.label}, threshold ${threshold.toFixed(2)}` });
  for (const [k, p] of j.score) setScore(out, k, p, threshold);
  return out;
}

// ---------------------------------------------------------------------------------------------- statistics

export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CI {
  point: number | null;
  lo: number | null;
  hi: number | null;
}
export const RESAMPLES = 1000;

function percentile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(q * (sorted.length - 1))));
  return sorted[i]!;
}

/**
 * Percentile bootstrap over pairs for a statistic that is a function of summed per-pair count vectors
 * (accuracy, recall, phi of a 2x2 table ...). `perPair[i]` is the count vector pair i contributes.
 */
export function bootstrapCounts(
  perPair: readonly (readonly number[])[],
  f: (sum: number[]) => number | null,
  resamples = RESAMPLES,
  seed = 1,
): CI {
  const m = perPair.length;
  if (m === 0) return { point: null, lo: null, hi: null };
  const width = perPair[0]!.length;
  const total = new Array<number>(width).fill(0);
  for (const v of perPair) for (let k = 0; k < width; k++) total[k]! += v[k]!;
  const point = f(total);
  const random = rng(seed);
  const draws: number[] = [];
  const sum = new Array<number>(width);
  for (let b = 0; b < resamples; b++) {
    sum.fill(0);
    for (let i = 0; i < m; i++) {
      const v = perPair[Math.floor(random() * m)]!;
      for (let k = 0; k < width; k++) sum[k]! += v[k]!;
    }
    const x = f(sum);
    if (x !== null && Number.isFinite(x)) draws.push(x);
  }
  draws.sort((a, b) => a - b);
  return { point, lo: percentile(draws, 0.025), hi: percentile(draws, 0.975) };
}

/** Percentile bootstrap over pairs for a statistic of the item list (AUROC). */
export function bootstrapItems<T>(
  perPair: readonly (readonly T[])[],
  f: (items: T[]) => number | null,
  resamples = RESAMPLES,
  seed = 1,
): CI {
  const m = perPair.length;
  if (m === 0) return { point: null, lo: null, hi: null };
  const point = f(perPair.flat() as T[]);
  const random = rng(seed);
  const draws: number[] = [];
  for (let b = 0; b < resamples; b++) {
    const sample: T[] = [];
    for (let i = 0; i < m; i++) sample.push(...perPair[Math.floor(random() * m)]!);
    const x = f(sample);
    if (x !== null && Number.isFinite(x)) draws.push(x);
  }
  draws.sort((a, b) => a - b);
  return { point, lo: percentile(draws, 0.025), hi: percentile(draws, 0.975) };
}

/** Area under the ROC curve with average ranks for ties; null without both classes. */
export function auroc(points: readonly { s: number; y: 0 | 1 }[]): number | null {
  const sorted = points.slice().sort((a, b) => a.s - b.s);
  let nPos = 0,
    nNeg = 0,
    rankSum = 0,
    i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j]!.s === sorted[i]!.s) j++;
    const avg = (i + j + 1) / 2;
    for (let k = i; k < j; k++) if (sorted[k]!.y === 1) rankSum += avg;
    i = j;
  }
  for (const p of sorted)
    if (p.y === 1) nPos++;
    else nNeg++;
  if (nPos === 0 || nNeg === 0) return null;
  return (rankSum - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/** Table of error indicators: a = both wrong, b = A wrong only, c = B wrong only, d = both right. */
export interface ErrorTable {
  a: number;
  b: number;
  c: number;
  d: number;
}
export const tableOf = (v: readonly number[]): ErrorTable => ({ a: v[0]!, b: v[1]!, c: v[2]!, d: v[3]! });
export function phi({ a, b, c, d }: ErrorTable): number | null {
  const den = Math.sqrt((a + b) * (c + d) * (a + c) * (b + d));
  return den === 0 ? null : (a * d - b * c) / den;
}
export function kappa({ a, b, c, d }: ErrorTable): number | null {
  const n = a + b + c + d;
  const po = (a + d) / n;
  const pe = ((a + b) * (a + c) + (c + d) * (b + d)) / (n * n);
  return pe === 1 ? null : (po - pe) / (1 - pe);
}
/** P(B wrong | A wrong). */
export const conditional = ({ a, b }: ErrorTable): number | null => (a + b === 0 ? null : a / (a + b));
/** P(B wrong). */
export const baseRate = ({ a, b, c, d }: ErrorTable): number => (a + c) / (a + b + c + d);

/** Independent votes a set of k judges with mean pairwise error correlation rho is worth. */
export const effectiveVotes = (k: number, meanPhi: number): number =>
  k / (1 + (k - 1) * Math.max(0, meanPhi));

function lgamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  let a = c[0]!;
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i]! / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
function binomialCdf(k: number, n: number, p: number): number {
  if (p <= 0) return 1;
  if (p >= 1) return k >= n ? 1 : 0;
  let s = 0;
  for (let i = 0; i <= k; i++)
    s += Math.exp(
      lgamma(n + 1) - lgamma(i + 1) - lgamma(n - i + 1) + i * Math.log(p) + (n - i) * Math.log(1 - p),
    );
  return Math.min(1, s);
}
/** One-sided Clopper-Pearson upper confidence bound for a rate, k events in n trials (alpha = 0.05 -> 95 percent). */
export function clopperPearsonUpper(k: number, n: number, alpha = 0.05): number {
  if (n === 0) return 1;
  if (k >= n) return 1;
  let lo = k / n,
    hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (binomialCdf(k, n, mid) > alpha) lo = mid;
    else hi = mid;
  }
  return hi;
}

// ------------------------------------------------------------------------------------------ per-judge views

export interface Answered {
  item: Item;
  decision: boolean;
  score: number | null;
}
/** The items a judge answered, within a filter. */
export function answered(
  j: Judge,
  items: readonly Item[],
  filter: (it: Item) => boolean = () => true,
): Answered[] {
  const out: Answered[] = [];
  for (const it of items) {
    if (!filter(it)) continue;
    const d = j.decision.get(it.key);
    if (d === undefined) continue;
    out.push({ item: it, decision: d, score: j.score.get(it.key) ?? null });
  }
  return out;
}
export function groupByPair<T extends { item: Item }>(rows: readonly T[]): T[][] {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    let g = m.get(r.item.pairId);
    if (!g) m.set(r.item.pairId, (g = []));
    g.push(r);
  }
  return [...m.values()];
}

export interface JudgeMetrics {
  n: number;
  nPairs: number;
  coverage: number;
  judgePositive: number;
  labelPositive: number;
  accuracy: CI;
  recall: CI;
  falseAlarm: CI;
  auroc: CI | null;
}
export function judgeMetrics(
  j: Judge,
  items: readonly Item[],
  filter: (it: Item) => boolean = () => true,
  seed = 1,
): JudgeMetrics {
  const eligible = items.filter(filter);
  const rows = answered(j, eligible);
  const groups = groupByPair(rows);
  const counts = groups.map((g) => {
    // [correct, n, tp, pos, fp, neg]
    const v = [0, 0, 0, 0, 0, 0];
    for (const r of g) {
      const right = r.decision === (r.item.y === 1);
      v[1]!++;
      if (right) v[0]!++;
      if (r.item.y === 1) {
        v[3]!++;
        if (r.decision) v[2]!++;
      } else {
        v[5]!++;
        if (r.decision) v[4]!++;
      }
    }
    return v;
  });
  const ratio = (num: number, den: number) => (den === 0 ? null : num / den);
  const scored = j.scored ? groups.map((g) => g.map((r) => ({ s: r.score ?? 0, y: r.item.y }))) : null;
  return {
    n: rows.length,
    nPairs: groups.length,
    coverage: eligible.length === 0 ? 0 : rows.length / eligible.length,
    judgePositive: rows.length === 0 ? 0 : rows.filter((r) => r.decision).length / rows.length,
    labelPositive: rows.length === 0 ? 0 : rows.filter((r) => r.item.y === 1).length / rows.length,
    accuracy: bootstrapCounts(counts, (s) => ratio(s[0]!, s[1]!), RESAMPLES, seed),
    recall: bootstrapCounts(counts, (s) => ratio(s[2]!, s[3]!), RESAMPLES, seed),
    falseAlarm: bootstrapCounts(counts, (s) => ratio(s[4]!, s[5]!), RESAMPLES, seed),
    auroc: scored ? bootstrapItems(scored, auroc, RESAMPLES, seed) : null,
  };
}

export interface PairCorrelation {
  a: string;
  b: string;
  n: number;
  nPairs: number;
  table: ErrorTable;
  phi: CI;
  kappa: CI;
  /** P(B wrong | A wrong) and P(A wrong | B wrong), against the base rates. */
  bGivenA: CI;
  aGivenB: CI;
  baseA: number;
  baseB: number;
  liftBGivenA: number | null;
  liftAGivenB: number | null;
}
/** Error correlation of two judges on the items both answered. */
export function pairCorrelation(
  A: Judge,
  B: Judge,
  items: readonly Item[],
  filter: (it: Item) => boolean = () => true,
  seed = 1,
): PairCorrelation {
  const rows: { item: Item; aWrong: boolean; bWrong: boolean }[] = [];
  for (const it of items) {
    if (!filter(it)) continue;
    const da = A.decision.get(it.key),
      db = B.decision.get(it.key);
    if (da === undefined || db === undefined) continue;
    rows.push({ item: it, aWrong: da !== (it.y === 1), bWrong: db !== (it.y === 1) });
  }
  const groups = groupByPair(rows);
  const counts = groups.map((g) => {
    const v = [0, 0, 0, 0];
    for (const r of g) v[r.aWrong && r.bWrong ? 0 : r.aWrong ? 1 : r.bWrong ? 2 : 3]!++;
    return v;
  });
  const t = tableOf(counts.reduce((acc, v) => acc.map((x, i) => x + v[i]!), [0, 0, 0, 0]));
  const swap = (v: number[]) => [v[0]!, v[2]!, v[1]!, v[3]!];
  const condB = conditional(t),
    condA = conditional(tableOf(swap([t.a, t.b, t.c, t.d])));
  const baseB = baseRate(t),
    baseA = (t.a + t.b) / Math.max(1, t.a + t.b + t.c + t.d);
  return {
    a: A.id,
    b: B.id,
    n: rows.length,
    nPairs: groups.length,
    table: t,
    phi: bootstrapCounts(counts, (s) => phi(tableOf(s)), RESAMPLES, seed),
    kappa: bootstrapCounts(counts, (s) => kappa(tableOf(s)), RESAMPLES, seed),
    bGivenA: bootstrapCounts(counts, (s) => conditional(tableOf(s)), RESAMPLES, seed),
    aGivenB: bootstrapCounts(counts, (s) => conditional(tableOf(swap(s))), RESAMPLES, seed),
    baseA,
    baseB,
    liftBGivenA: condB === null || baseB === 0 ? null : condB / baseB,
    liftAGivenB: condA === null || baseA === 0 ? null : condA / baseA,
  };
}

/** Threshold on a probability that maximises accuracy over the given items (ties: the lower threshold). */
export function fitThreshold(
  j: Judge,
  items: readonly Item[],
  filter: (it: Item) => boolean = () => true,
): { threshold: number; accuracy: number } {
  const rows = answered(j, items, filter).filter((r) => r.score !== null);
  let best = { threshold: 0.5, accuracy: -1 };
  for (let t = 0.02; t <= 0.98 + 1e-9; t += 0.02) {
    const acc = rows.filter((r) => r.score! >= t === (r.item.y === 1)).length / Math.max(1, rows.length);
    if (acc > best.accuracy + 1e-12) best = { threshold: Number(t.toFixed(2)), accuracy: acc };
  }
  return best;
}

/**
 * Selective classification at guaranteed risk: on the calibration items, find the widest acceptance region
 * (accept when score >= hi or score <= lo, predicting accordingly) whose Clopper-Pearson 95 percent upper bound
 * on the error is at most `risk`; report coverage and realised error on the evaluation items.
 */
export interface SelectiveResult {
  lo: number;
  hi: number;
  calibrationCoverage: number;
  calibrationErrorUpper: number;
  coverage: number;
  accepted: number;
  error: number | null;
  errorUpper: number | null;
}
export function selective(
  j: Judge,
  items: readonly Item[],
  calibrate: (it: Item) => boolean,
  evaluate: (it: Item) => boolean,
  risk = 0.05,
): SelectiveResult | null {
  if (!j.scored) return null;
  const cal = answered(j, items, calibrate).filter((r) => r.score !== null);
  const ev = answered(j, items, evaluate).filter((r) => r.score !== null);
  if (cal.length === 0) return null;
  const grid: number[] = [];
  for (let t = 0; t <= 1 + 1e-9; t += 0.02) grid.push(Number(t.toFixed(2)));
  let best: { lo: number; hi: number; cov: number; upper: number } | null = null;
  for (const lo of grid)
    for (const hi of grid) {
      if (hi < lo) continue;
      let n = 0,
        wrong = 0;
      for (const r of cal) {
        const s = r.score!;
        if (s >= hi) {
          n++;
          if (r.item.y !== 1) wrong++;
        } else if (s <= lo) {
          n++;
          if (r.item.y !== 0) wrong++;
        }
      }
      if (n === 0) continue;
      const upper = clopperPearsonUpper(wrong, n, 0.05);
      if (upper > risk) continue;
      const cov = n / cal.length;
      if (!best || cov > best.cov) best = { lo, hi, cov, upper };
    }
  if (!best) return null;
  let n = 0,
    wrong = 0;
  for (const r of ev) {
    const s = r.score!;
    if (s >= best.hi) {
      n++;
      if (r.item.y !== 1) wrong++;
    } else if (s <= best.lo) {
      n++;
      if (r.item.y !== 0) wrong++;
    }
  }
  return {
    lo: best.lo,
    hi: best.hi,
    calibrationCoverage: best.cov,
    calibrationErrorUpper: best.upper,
    coverage: ev.length === 0 ? 0 : n / ev.length,
    accepted: n,
    error: n === 0 ? null : wrong / n,
    errorUpper: n === 0 ? null : clopperPearsonUpper(wrong, n, 0.05),
  };
}

/** Agreement rule for two judges: accept an item when both decide the same way. */
export function agreementSelective(
  A: Judge,
  B: Judge,
  items: readonly Item[],
  evaluate: (it: Item) => boolean,
): { coverage: number; accepted: number; error: number | null; errorUpper: number | null } {
  let both = 0,
    accepted = 0,
    wrong = 0;
  for (const it of items) {
    if (!evaluate(it)) continue;
    const da = A.decision.get(it.key),
      db = B.decision.get(it.key);
    if (da === undefined || db === undefined) continue;
    both++;
    if (da === db) {
      accepted++;
      if (da !== (it.y === 1)) wrong++;
    }
  }
  return {
    coverage: both === 0 ? 0 : accepted / both,
    accepted,
    error: accepted === 0 ? null : wrong / accepted,
    errorUpper: accepted === 0 ? null : clopperPearsonUpper(wrong, accepted, 0.05),
  };
}

export const f3 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "-" : x.toFixed(3);
export const pct = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "-" : `${(100 * x).toFixed(1)}%`;
export const ci = (c: CI | null | undefined, f: (x: number | null) => string = f3) =>
  !c || c.point === null ? "-" : `${f(c.point)} [${f(c.lo)}, ${f(c.hi)}]`;

// -------------------------------------------------------------------------------------- subjective panels

export interface Criterion {
  name: string;
  requirement: string;
  weight?: number;
  options?: { label: string }[];
}
interface PanelDataset {
  rubric?: Criterion[] | { criteria?: Criterion[]; rubric?: Criterion[] };
  items: {
    description?: string;
    ground_truth: string[];
    rubric?: Criterion[] | { criteria?: Criterion[]; rubric?: Criterion[] };
  }[];
}
const criteriaOf = (r: PanelDataset["rubric"]): Criterion[] =>
  Array.isArray(r) ? r : (r?.criteria ?? r?.rubric ?? []);

/**
 * MET/UNMET view of a label: binary criteria as given; ordinal criteria at the labelled midpoint (the upper
 * half of the ordered options is MET); "N/A" options and the nominal `response_length` criterion are not
 * used ("skip"); an unrecognised label is an abstention (null).
 */
export function binarise(c: Criterion, label: string | null | undefined): boolean | null | "skip" {
  if (!c.options || c.options.length === 0) {
    if (label === "MET") return true;
    if (label === "UNMET") return false;
    return null;
  }
  if (c.name === "response_length") return "skip";
  const ordinal = c.options.map((o) => o.label).filter((l) => !l.startsWith("N/A"));
  if (label === null || label === undefined) return null;
  if (label.startsWith("N/A")) return "skip";
  const idx = ordinal.indexOf(label);
  if (idx < 0) return null;
  return idx >= ordinal.length / 2;
}

export interface PanelCell {
  key: string;
  item: number;
  criterion: string;
  truth: boolean;
}
export interface Panel {
  name: string;
  cells: PanelCell[];
  /** judge id -> cell key -> decision (missing = not answered). */
  judges: Map<string, Map<string, boolean>>;
  nItems: number;
}
interface DumpRow {
  item_idx: number;
  verdicts: {
    verdict?: string | null;
    selected_label?: string | null;
    criterion?: string | null;
    error?: string | null;
    na?: boolean | null;
  }[];
}

/** Per-item verdict files copied from the Autorubric experiments by panel_items.py, plus the Decisions API file. */
export const PANEL_JUDGE_FILES = (panel: string): Record<string, string> => ({
  jev: `bench/subjective/items-${panel}-jev.jsonl`,
  "jev-choice": `bench/subjective/items-${panel}-jev-choice.jsonl`,
  "luna-dec": `bench/subjective/decisions-${panel}.jsonl`,
  "luna-chat": `bench/subjective/items-${panel}-luna-chat.jsonl`,
  "deepseek-pro": `bench/subjective/items-${panel}-deepseek-pro.jsonl`,
  claude: `bench/subjective/items-${panel}-claude.jsonl`,
});
/** DebateCheck judge that corresponds to each panel judge (top-3 condition). */
export const PANEL_TO_DEBATECHECK: Record<string, string> = {
  jev: "jev-3",
  "jev-choice": "jev-3",
  "luna-dec": "luna-dec-3",
  "luna-chat": "luna-chat",
  "deepseek-pro": "deepseek-pro",
  claude: "claude",
};

export async function loadPanel(name: string, file: string): Promise<Panel> {
  const ds = JSON.parse(await (await import("node:fs/promises")).readFile(file, "utf8")) as PanelDataset;
  const global = criteriaOf(ds.rubric);
  const cells: PanelCell[] = [];
  const rubricOf = (i: number) => (ds.items[i]!.rubric ? criteriaOf(ds.items[i]!.rubric) : global);
  ds.items.forEach((it, i) => {
    rubricOf(i).forEach((c, k) => {
      const t = binarise(c, it.ground_truth[k]);
      if (t === "skip" || t === null) return;
      cells.push({ key: `${i}|${k}`, item: i, criterion: c.name, truth: t });
    });
  });
  const judges = new Map<string, Map<string, boolean>>();
  for (const [id, path] of Object.entries(PANEL_JUDGE_FILES(name))) {
    if (!existsSync(path)) continue;
    const m = new Map<string, boolean>();
    for (const r of await readJsonl<DumpRow>(path)) {
      const rubric = rubricOf(r.item_idx);
      r.verdicts.forEach((v, k) => {
        const c = rubric[k];
        if (!c) return;
        if (v.error) return;
        const d = binarise(c, v.selected_label ?? v.verdict ?? null);
        if (d === "skip" || d === null) return;
        m.set(`${r.item_idx}|${k}`, d);
      });
    }
    if (m.size > 0) judges.set(id, m);
  }
  return { name, cells, judges, nItems: ds.items.length };
}

export interface PanelJudgeMetrics {
  n: number;
  coverage: number;
  judgePositive: number;
  labelPositive: number;
  accuracy: CI;
  kappa: CI;
}
function groupCells<T extends { cell: PanelCell }>(rows: readonly T[]): T[][] {
  const m = new Map<number, T[]>();
  for (const r of rows) {
    let g = m.get(r.cell.item);
    if (!g) m.set(r.cell.item, (g = []));
    g.push(r);
  }
  return [...m.values()];
}
export function panelJudgeMetrics(p: Panel, id: string, seed = 1): PanelJudgeMetrics | null {
  const dec = p.judges.get(id);
  if (!dec) return null;
  const rows = p.cells.flatMap((cell) => {
    const d = dec.get(cell.key);
    return d === undefined ? [] : [{ cell, d }];
  });
  const groups = groupCells(rows);
  // [agree, n, both MET, judge MET & truth UNMET, judge UNMET & truth MET, both UNMET]
  const counts = groups.map((g) => {
    const v = [0, 0, 0, 0, 0, 0];
    for (const r of g) {
      v[1]!++;
      if (r.d === r.cell.truth) v[0]!++;
      v[r.d && r.cell.truth ? 2 : r.d ? 3 : r.cell.truth ? 4 : 5]!++;
    }
    return v;
  });
  return {
    n: rows.length,
    coverage: p.cells.length === 0 ? 0 : rows.length / p.cells.length,
    judgePositive: rows.length === 0 ? 0 : rows.filter((r) => r.d).length / rows.length,
    labelPositive: rows.length === 0 ? 0 : rows.filter((r) => r.cell.truth).length / rows.length,
    accuracy: bootstrapCounts(counts, (s) => (s[1]! === 0 ? null : s[0]! / s[1]!), RESAMPLES, seed),
    kappa: bootstrapCounts(counts, (s) => kappa({ a: s[2]!, b: s[3]!, c: s[4]!, d: s[5]! }), RESAMPLES, seed),
  };
}
/** Error correlation of two panel judges on the cells both answered; intervals resample items. */
export function panelPairCorrelation(p: Panel, A: string, B: string, seed = 1): PairCorrelation | null {
  const da = p.judges.get(A),
    db = p.judges.get(B);
  if (!da || !db) return null;
  const rows = p.cells.flatMap((cell) => {
    const a = da.get(cell.key),
      b = db.get(cell.key);
    return a === undefined || b === undefined
      ? []
      : [{ cell, aWrong: a !== cell.truth, bWrong: b !== cell.truth }];
  });
  const groups = groupCells(rows);
  const counts = groups.map((g) => {
    const v = [0, 0, 0, 0];
    for (const r of g) v[r.aWrong && r.bWrong ? 0 : r.aWrong ? 1 : r.bWrong ? 2 : 3]!++;
    return v;
  });
  const t = tableOf(counts.reduce((acc, v) => acc.map((x, i) => x + v[i]!), [0, 0, 0, 0]));
  const swap = (v: number[]) => [v[0]!, v[2]!, v[1]!, v[3]!];
  const condB = conditional(t),
    condA = conditional(tableOf(swap([t.a, t.b, t.c, t.d])));
  const baseB = baseRate(t),
    baseA = (t.a + t.b) / Math.max(1, t.a + t.b + t.c + t.d);
  return {
    a: A,
    b: B,
    n: rows.length,
    nPairs: groups.length,
    table: t,
    phi: bootstrapCounts(counts, (s) => phi(tableOf(s)), RESAMPLES, seed),
    kappa: bootstrapCounts(counts, (s) => kappa(tableOf(s)), RESAMPLES, seed),
    bGivenA: bootstrapCounts(counts, (s) => conditional(tableOf(s)), RESAMPLES, seed),
    aGivenB: bootstrapCounts(counts, (s) => conditional(tableOf(swap(s))), RESAMPLES, seed),
    baseA,
    baseB,
    liftBGivenA: condB === null || baseB === 0 ? null : condB / baseB,
    liftAGivenB: condA === null || baseA === 0 ? null : condA / baseA,
  };
}

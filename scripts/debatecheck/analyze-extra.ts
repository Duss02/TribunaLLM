import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { corpusFor } from "../analysis/common";
import { type Pair, readJsonl, selectPassages } from "./lib";
import {
  type Item,
  type Judge,
  SIDES,
  TYPES,
  auroc,
  bootstrapCounts,
  ci,
  f3,
  itemKey,
  judgeMetrics,
  kappa,
  loadItems,
  loadJudges,
  pairCorrelation,
  pct,
  setScore,
  typeOf,
} from "./study-lib";

// Three follow-ups to the pre-registered study, each labelled as such: (1) version drift, the same framed
// criterion under jev-1.13.0 and jev-1.14.0; (2) an evidence gate, Jev's cheap "does a passage describe the
// same fact?" question used to predict where the LLM judges will fail together; (3) a sample of pairs built
// from sentences the debate's judge had NOT approved, so the judge does not select its own test.
// Held-out motions only, thresholds fixed in advance (0.5 and the arena's 0.7).
const { items } = await loadItems();
const judges = await loadJudges();
const J = (id: string) => judges.find((j) => j.id === id);
const held = (it: Item) => it.split === "test";
const L: string[] = [`# Follow-ups to Study 2 (held-out motions)`, ""];
const out: Record<string, unknown> = {};
const table = (header: string[], rows: string[][]) => {
  L.push(`| ${header.join(" | ")} |`, `|${header.map(() => "---").join("|")}|`);
  for (const r of rows) L.push(`| ${r.join(" | ")} |`);
  L.push("");
};
const mk = (id: string, label: string): Judge => ({
  id,
  label,
  kind: "decision",
  maker: "TypeSafe",
  condition: "20",
  scored: true,
  score: new Map(),
  decision: new Map(),
});
interface JevRow {
  id: string;
  answers: Record<
    string,
    | {
        original: { contradicts: number; sameSubject?: number | null };
        perturbed: { contradicts: number; sameSubject?: number | null };
      }
    | undefined
  >;
}
async function readAll(files: string[]): Promise<JevRow[]> {
  const r: JevRow[] = [];
  for (const f of files) if (existsSync(f)) r.push(...(await readJsonl<JevRow>(f)));
  return r;
}

// ------------------------------------------------------------------------------------ 1. version drift
L.push(`## 1. Version drift: jev-1.13.0 against jev-1.14.0 under the framed criterion`, "");
const v114 = await readAll([
  "bench/debatecheck/jev-variants-114.jsonl",
  "bench/debatecheck/jev-variants-types-114.jsonl",
]);
const drift: Record<string, unknown> = {};
if (v114.length > 0) {
  for (const [variant, cond] of [
    ["framed20", "20"],
    ["framed3", "3"],
  ] as const) {
    const n = mk(`jev114-${cond}`, `Jev 1.14.0, framed, ${cond === "20" ? "20 passages" : "top-3"}`);
    for (const r of v114) {
      const a = r.answers[variant];
      if (a) for (const s of SIDES) setScore(n, itemKey(r.id, s), a[s].contradicts);
    }
    const o = J(`jev-${cond}`)!;
    const rows: string[][] = [];
    const d: Record<string, unknown> = {};
    for (const [label, jj] of [
      ["1.13.0", o],
      ["1.14.0", n],
    ] as const) {
      const m = judgeMetrics(jj, items, held);
      const m7 = judgeMetrics(
        { ...jj, decision: new Map([...jj.score].map(([k, p]) => [k, p >= 0.7])) } as Judge,
        items,
        held,
      );
      d[label] = { all: m, at07: { recall: m7.recall, falseAlarm: m7.falseAlarm, accuracy: m7.accuracy } };
      rows.push([
        label,
        String(m.n),
        ci(m.accuracy, pct),
        ci(m.recall, pct),
        ci(m.falseAlarm, pct),
        ci(m.auroc),
        pct(m7.recall.point),
        pct(m7.falseAlarm.point),
      ]);
    }
    // per-item agreement between versions and the mean absolute change of the probability
    const both = items.filter((it) => held(it) && o.score.has(it.key) && n.score.has(it.key));
    const groups = new Map<string, number[]>();
    let absd = 0;
    for (const it of both) {
      const a = o.decision.get(it.key)!,
        b = n.decision.get(it.key)!;
      const v = groups.get(it.pairId) ?? [0, 0, 0, 0];
      v[a && b ? 0 : a ? 1 : b ? 2 : 3]!++;
      groups.set(it.pairId, v);
      absd += Math.abs(o.score.get(it.key)! - n.score.get(it.key)!);
    }
    const k = bootstrapCounts([...groups.values()], (s) => kappa({ a: s[0]!, b: s[1]!, c: s[2]!, d: s[3]! }));
    const byType: Record<string, unknown> = {};
    const trows: string[][] = [];
    for (const t of TYPES) {
      const mo = judgeMetrics(o, items, (it) => held(it) && it.type === t),
        mn = judgeMetrics(n, items, (it) => held(it) && it.type === t);
      byType[t] = { old: mo, new: mn };
      trows.push([
        t,
        pct(mo.recall.point),
        pct(mn.recall.point),
        pct(mo.falseAlarm.point),
        pct(mn.falseAlarm.point),
        f3(mo.auroc?.point),
        f3(mn.auroc?.point),
      ]);
    }
    drift[cond] = {
      ...d,
      decisionKappa: k,
      meanAbsDelta: absd / Math.max(1, both.length),
      n: both.length,
      byType,
    };
    L.push(`### ${cond === "20" ? "Twenty passages" : "Top-3"}`, "");
    table(
      [
        "version",
        "n",
        "accuracy (0.5)",
        "recall (0.5)",
        "false alarm (0.5)",
        "AUROC",
        "recall (0.7)",
        "false alarm (0.7)",
      ],
      rows,
    );
    L.push(
      `Decision agreement between versions at 0.5: kappa ${ci(k)}; mean |delta p| ${f3(absd / Math.max(1, both.length))} over ${both.length} items.`,
      "",
    );
    table(["type", "recall 1.13", "recall 1.14", "FA 1.13", "FA 1.14", "AUROC 1.13", "AUROC 1.14"], trows);
  }
} else L.push("(jev-1.14.0 runs not found)", "");
out.drift = drift;

// ----------------------------------------------------------------------------------- 2. evidence gate
L.push(`## 2. Evidence gate: Jev's same-fact question as a predictor of shared LLM errors`, "");
L.push(
  `Two-step form over the top-3 passages: the first question asks whether a passage describes the same fact as the sentence. Its probability is used as a gate, fixed at 0.5, with no fitting. Items the gate rejects are where the fact is probably not in the passages; the prediction is that the LLM judges' errors concentrate and correlate there.`,
  "",
);
const two = await readAll([
  "bench/debatecheck/jev-variants.jsonl",
  "bench/debatecheck/jev-variants-types.jsonl",
]);
const gate = new Map<string, number>();
for (const r of two) {
  const a = r.answers.twostep3;
  if (!a) continue;
  for (const s of SIDES) {
    const v = a[s].sameSubject;
    if (typeof v === "number") gate.set(itemKey(r.id, s), v);
  }
}
const { pairs } = await loadItems();
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
const gated = (it: Item) => held(it) && gate.has(it.key);
const inG = (it: Item) => gated(it) && gate.get(it.key)! >= 0.5;
const outG = (it: Item) => gated(it) && gate.get(it.key)! < 0.5;
const covered = items.filter(gated);
const share = covered.filter(inG).length / Math.max(1, covered.length);
// does the gate predict whether the fact passage is among the three? (altered sides only, where the construction defines the fact)
const pts = covered
  .filter((it) => it.side === "perturbed")
  .map((it) => ({ s: gate.get(it.key)!, y: (factInTop3.get(it.pairId) ? 1 : 0) as 0 | 1 }));
const gateAuroc = auroc(pts);
L.push(
  `Held-out items with a gate value: ${covered.length}; gate passes ${pct(share)}. AUROC of the gate for "the passage carrying the original token is among the three" on altered sentences: ${f3(gateAuroc)}.`,
  "",
);
const gateJudges = ["jev-3", "luna-dec-3", "luna-chat", "deepseek-pro", "claude", "hhem"]
  .map(J)
  .filter((j): j is Judge => j !== undefined);
const grows: string[][] = [];
const gm: Record<string, unknown> = {};
for (const j of gateJudges) {
  const a = judgeMetrics(j, items, inG),
    b = judgeMetrics(j, items, outG);
  gm[j.id] = { pass: a, reject: b };
  grows.push([
    j.label,
    `${ci(a.accuracy, pct)} (${a.n})`,
    `${ci(b.accuracy, pct)} (${b.n})`,
    pct(a.recall.point),
    pct(b.recall.point),
    pct(a.falseAlarm.point),
    pct(b.falseAlarm.point),
  ]);
}
table(
  [
    "judge",
    "accuracy, gate passes (n)",
    "accuracy, gate rejects (n)",
    "recall pass",
    "recall reject",
    "FA pass",
    "FA reject",
  ],
  grows,
);
const gc: Record<string, unknown> = {};
const crows: string[][] = [];
for (let i = 0; i < gateJudges.length; i++)
  for (let k = i + 1; k < gateJudges.length; k++) {
    const A = gateJudges[i]!,
      B = gateJudges[k]!;
    const a = pairCorrelation(A, B, items, inG),
      b = pairCorrelation(A, B, items, outG);
    if (a.n === 0 && b.n === 0) continue;
    gc[`${A.id}|${B.id}`] = { pass: a, reject: b };
    crows.push([
      `${A.label} x ${B.label}`,
      `${ci(a.phi)} (n ${a.n})`,
      `${ci(b.phi)} (n ${b.n})`,
      `${pct(a.bGivenA.point)} vs ${pct(a.baseB)}`,
      `${pct(b.bGivenA.point)} vs ${pct(b.baseB)}`,
    ]);
  }
table(
  ["pair", "phi, gate passes", "phi, gate rejects", "P(B|A) vs P(B), pass", "P(B|A) vs P(B), reject"],
  crows,
);
out.gate = { share, gateAuroc, n: covered.length, judges: gm, correlations: gc };

// -------------------------------------------------------------------- 3. pairs the judge did not approve
L.push(`## 3. Pairs built from sentences the debate's judge had not approved`, "");
L.push(
  `Same construction rule as the benchmark, applied to sentences the arena had marked unverified. The altered side is contradicted by construction as before; the unchanged side is a sentence the judge had not supported, so its false-alarm rate is not comparable and is reported for completeness.`,
  "",
);
const unv = existsSync("bench/debatecheck/pairs-unverified.jsonl")
  ? await readJsonl<Pair>("bench/debatecheck/pairs-unverified.jsonl")
  : [];
const unvRows = await readAll(["bench/debatecheck/jev-variants-unverified.jsonl"]);
if (unv.length > 0 && unvRows.length > 0) {
  const uItems: Item[] = [];
  for (const p of unv)
    for (const side of SIDES)
      uItems.push({
        key: itemKey(p.id, side),
        pairId: p.id,
        side,
        y: (side === "perturbed" ? 1 : 0) as 0 | 1,
        type: typeOf(p.kind),
        kind: p.kind,
        split: p.split,
        pack: p.pack,
        model: p.model,
      });
  const urows: string[][] = [];
  const u: Record<string, unknown> = {};
  for (const [variant, cond] of [
    ["framed20", "20"],
    ["framed3", "3"],
  ] as const) {
    const ju = mk(`jev-unv-${cond}`, `Jev, framed, ${cond === "20" ? "20 passages" : "top-3"}`);
    for (const r of unvRows) {
      const a = r.answers[variant];
      if (a) for (const s of SIDES) setScore(ju, itemKey(r.id, s), a[s].contradicts);
    }
    const sep = unvRows
      .filter((r) => r.answers[variant])
      .map((r) =>
        r.answers[variant]!.perturbed.contradicts > r.answers[variant]!.original.contradicts ? 1 : 0,
      );
    const m = judgeMetrics(ju, uItems, held);
    const main = judgeMetrics(J(`jev-${cond}`)!, items, (it) => held(it) && it.type === "number");
    u[cond] = {
      unapproved: m,
      approvedNumeric: main,
      separation: sep.reduce<number>((a, b) => a + b, 0) / Math.max(1, sep.length),
    };
    urows.push([
      cond === "20" ? "20 passages" : "top-3",
      String(m.n),
      ci(m.recall, pct),
      ci(main.recall, pct),
      ci(m.auroc),
      ci(main.auroc),
      pct(m.falseAlarm.point),
      pct(main.falseAlarm.point),
    ]);
  }
  table(
    [
      "evidence",
      "n (unapproved)",
      "recall, unapproved sample",
      "recall, benchmark (numeric)",
      "AUROC, unapproved",
      "AUROC, benchmark",
      "FA unapproved",
      "FA benchmark",
    ],
    urows,
  );
  out.unapproved = u;
} else L.push("(unapproved sample not judged yet)", "");

await writeFile("bench/debatecheck/EXTRA.md", L.join("\n") + "\n");
await writeFile("bench/debatecheck/extra.json", JSON.stringify(out, null, 1));
console.log("wrote bench/debatecheck/EXTRA.md and extra.json");

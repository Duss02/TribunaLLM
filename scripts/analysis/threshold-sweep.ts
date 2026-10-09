import { parseArgs } from "node:util";
import { POINTS, THRESHOLDS } from "@/lib/scoring/rules";
import { loadBlindResults, pct, writeReport } from "./common";

// Recomputes every blind debate's evidence points and winner under other thresholds, from the stored
// per-sentence probabilities, and reports how much the per-model contradiction rate and the win
// ranking move. Argument and judge points are kept as recorded. No network.
const { values } = parseArgs({
  options: { input: { type: "string", default: "bench/results" }, run: { type: "string" } },
});

const results = await loadBlindResults(values.input, values.run);
if (results.length === 0) {
  console.log("No blind results with transcripts.");
  process.exit(0);
}

type Verdict = "opinion" | "contradicted" | "supported" | "unverified";
const verdictAt = (
  s: { isClaim: number; supported: number; contradicts: number },
  t: { claim: number; contradicted: number; supported: number },
): Verdict => {
  if (s.isClaim < t.claim) return "opinion";
  if (s.contradicts >= t.contradicted) return "contradicted";
  if (s.supported >= t.supported) return "supported";
  return "unverified";
};

const models = [...new Set(results.flatMap((r) => [r.pro, r.con]))].sort();

function evaluate(t: { claim: number; contradicted: number; supported: number }) {
  const claims = new Map(models.map((m) => [m, 0]));
  const contradicted = new Map(models.map((m) => [m, 0]));
  const supported = new Map(models.map((m) => [m, 0]));
  const points = new Map(models.map((m) => [m, 0]));
  const games = new Map(models.map((m) => [m, 0]));
  for (const r of results) {
    const E = { PRO: 0, CON: 0 };
    for (const turn of r.transcript ?? []) {
      const model = turn.side === "PRO" ? r.pro : r.con;
      for (const s of turn.sentences) {
        if (s.dropped || s.verdict === null || s.verdict === "unjudged") continue;
        const v = verdictAt(s, t);
        if (v === "opinion") continue;
        claims.set(model, (claims.get(model) ?? 0) + 1);
        if (v === "contradicted") {
          contradicted.set(model, (contradicted.get(model) ?? 0) + 1);
          E[turn.side] += POINTS.contradicted;
        } else if (v === "supported") {
          supported.set(model, (supported.get(model) ?? 0) + 1);
          E[turn.side] += POINTS.supported;
        }
      }
    }
    const T = { PRO: E.PRO + r.score.PRO.A + r.score.PRO.J, CON: E.CON + r.score.CON.A + r.score.CON.J };
    const margin = T.PRO - T.CON;
    const winner = Math.abs(margin) < 0.5 ? "draw" : margin > 0 ? "PRO" : "CON";
    for (const side of ["PRO", "CON"] as const) {
      const model = side === "PRO" ? r.pro : r.con;
      games.set(model, (games.get(model) ?? 0) + 1);
      points.set(model, (points.get(model) ?? 0) + (winner === "draw" ? 0.5 : winner === side ? 1 : 0));
    }
  }
  return models.map((m) => ({
    model: m,
    claims: claims.get(m) ?? 0,
    contradicted: contradicted.get(m) ?? 0,
    supported: supported.get(m) ?? 0,
    rate: (claims.get(m) ?? 0) === 0 ? 0 : (contradicted.get(m) ?? 0) / (claims.get(m) ?? 1),
    winRate: (points.get(m) ?? 0) / Math.max(1, games.get(m) ?? 0),
  }));
}

function ranks(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const out = new Array<number>(values.length);
  order.forEach(([, i], rank) => (out[i] = rank));
  return out;
}
function spearman(a: number[], b: number[]): number {
  const ra = ranks(a),
    rb = ranks(b),
    n = a.length;
  if (n < 2) return Number.NaN;
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += ((ra[i] as number) - (rb[i] as number)) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const base = evaluate(THRESHOLDS);
const lines: string[] = [];
lines.push(`# Threshold sweep (${results.length} blind debates, ${models.length} models)\n`);
lines.push(
  `Baseline thresholds: claim ${THRESHOLDS.claim}, contradicted ${THRESHOLDS.contradicted}, supported ${THRESHOLDS.supported}.\n`,
);
lines.push("| model | claims | contradicted | rate | supported | win rate |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const row of base)
  lines.push(
    `| ${row.model} | ${row.claims} | ${row.contradicted} | ${pct(row.contradicted, row.claims)} | ${row.supported} | ${pct(row.winRate, 1)} |`,
  );

lines.push("\n## Moving one threshold at a time\n");
lines.push(
  "Spearman ρ compares the ranking by contradiction rate (and by win rate) with the baseline ranking. 1 means identical order.\n",
);
lines.push(
  "| threshold | value | total contradicted | total claims | ρ contradiction rank | ρ win rank | winners changed |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|");

const baseWinners = (() => {
  const t = THRESHOLDS;
  return results.map((r) => {
    const E = { PRO: 0, CON: 0 };
    for (const turn of r.transcript ?? [])
      for (const s of turn.sentences) {
        if (s.dropped || s.verdict === null || s.verdict === "unjudged") continue;
        const v = verdictAt(s, t);
        if (v === "contradicted") E[turn.side] += POINTS.contradicted;
        else if (v === "supported") E[turn.side] += POINTS.supported;
      }
    const m = E.PRO + r.score.PRO.A + r.score.PRO.J - (E.CON + r.score.CON.A + r.score.CON.J);
    return Math.abs(m) < 0.5 ? "draw" : m > 0 ? "PRO" : "CON";
  });
})();

const sweep: Array<[keyof typeof THRESHOLDS & ("claim" | "contradicted" | "supported"), number[]]> = [
  ["claim", [0.3, 0.4, 0.5, 0.6, 0.7]],
  ["contradicted", [0.5, 0.6, 0.7, 0.8, 0.9]],
  ["supported", [0.5, 0.6, 0.7, 0.8, 0.9]],
];
for (const [name, values_] of sweep) {
  for (const value of values_) {
    const t = {
      claim: THRESHOLDS.claim,
      contradicted: THRESHOLDS.contradicted,
      supported: THRESHOLDS.supported,
      [name]: value,
    };
    const rows = evaluate(t);
    const winners = results.map((r) => {
      const E = { PRO: 0, CON: 0 };
      for (const turn of r.transcript ?? [])
        for (const s of turn.sentences) {
          if (s.dropped || s.verdict === null || s.verdict === "unjudged") continue;
          const v = verdictAt(s, t);
          if (v === "contradicted") E[turn.side] += POINTS.contradicted;
          else if (v === "supported") E[turn.side] += POINTS.supported;
        }
      const m = E.PRO + r.score.PRO.A + r.score.PRO.J - (E.CON + r.score.CON.A + r.score.CON.J);
      return Math.abs(m) < 0.5 ? "draw" : m > 0 ? "PRO" : "CON";
    });
    const changed = winners.filter((w, i) => w !== baseWinners[i]).length;
    lines.push(
      `| ${name} | ${value} | ${rows.reduce((s, r) => s + r.contradicted, 0)} | ${rows.reduce((s, r) => s + r.claims, 0)} | ${spearman(
        base.map((r) => r.rate),
        rows.map((r) => r.rate),
      ).toFixed(2)} | ${spearman(
        base.map((r) => r.winRate),
        rows.map((r) => r.winRate),
      ).toFixed(2)} | ${changed} / ${results.length} |`,
    );
  }
}

lines.push("\n## Distribution of the judge's probabilities\n");
const all = results.flatMap((r) =>
  (r.transcript ?? []).flatMap((t) =>
    t.sentences.filter((s) => !s.dropped && s.verdict !== null && s.verdict !== "unjudged"),
  ),
);
const hist = (pick: (s: (typeof all)[number]) => number) => {
  const bins = new Array<number>(10).fill(0);
  for (const s of all) bins[Math.min(9, Math.floor(pick(s) * 10))]!++;
  return bins.map((b) => String(b).padStart(5)).join(" ");
};
lines.push("```");
lines.push("bins        0.0   0.1   0.2   0.3   0.4   0.5   0.6   0.7   0.8   0.9");
lines.push(`is_claim    ${hist((s) => s.isClaim)}`);
lines.push(`supported   ${hist((s) => s.supported)}`);
lines.push(`contradicts ${hist((s) => s.contradicts)}`);
lines.push("```");

const text = lines.join("\n") + "\n";
console.log(text);
console.log(`Wrote ${await writeReport(`threshold-sweep${values.run ? `-${values.run}` : ""}.md`, text)}`);

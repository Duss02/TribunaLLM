import { parseArgs } from "node:util";
import { existsSync } from "node:fs";
import { appendFile, readFile, writeFile } from "node:fs/promises";
import type { Passage } from "@/lib/debate/packs";
import { wilsonInterval } from "@/lib/stats";
import { findEntry } from "@/lib/models/registry";
import { corpusFor, loadBlindResults, runPool, sentencesOf } from "./analysis/common";
import { askJev, readJsonl } from "./debatecheck/lib";

// Leaderboard v2: every claim of the stored blind debates judged again by Jev under the framed criterion
// (the question Study 2 certified) over the twenty passages the arena read, with the decision rule (0.5)
// and the confident rule (the high threshold of the guaranteed-risk region fitted on DebateCheck's training
// motions). No new debate is run; the match outcomes of the pilot are reported unchanged beside the new
// contradiction counts. Resumable per claim.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    claims: { type: "string", default: "bench/analysis/leaderboard-v2-claims.jsonl" },
    output: { type: "string", default: "bench/leaderboard-v2.json" },
    report: { type: "string", default: "bench/analysis/leaderboard-v2.md" },
    pilot: { type: "string", default: "bench/leaderboard.json" },
    concurrency: { type: "string", default: "8" },
  },
});

interface ClaimRow {
  id: string;
  runId: string;
  pack: string;
  motion: string;
  model: string;
  side: "PRO" | "CON";
  round: number;
  text: string;
  pilotVerdict: string;
  passages: number;
  contradicts: number;
  inputTokens: number;
}

const results = await loadBlindResults(values.input);
const claims = (await sentencesOf(results)).filter(
  (r) => r.verdict !== "opinion" && r.verdict !== "unjudged",
);
const done = new Set(
  existsSync(values.claims) ? (await readJsonl<ClaimRow>(values.claims)).map((r) => r.id) : [],
);
const todo = claims.filter((r) => !done.has(r.id));
console.log(
  `${results.length} debates, ${claims.length} claims, ${done.size} judged, ${todo.length} to judge (framed criterion, all passages)`,
);
let tokens = 0;
const started = Date.now();
await runPool(todo, Number(values.concurrency), async (r, i) => {
  const corpus = await corpusFor(r.pack);
  const passages = r.evidenceIds
    .map((id) => corpus.passages.get(id))
    .filter((p): p is Passage => p !== undefined);
  const answer = await askJev(r.motion, r.text, passages, "framed");
  tokens += answer.inputTokens;
  const row: ClaimRow = {
    id: r.id,
    runId: r.runId,
    pack: r.pack,
    motion: r.motion,
    model: r.model,
    side: r.side,
    round: r.round,
    text: r.text,
    pilotVerdict: r.verdict ?? "unjudged",
    passages: passages.length,
    contradicts: answer.contradicts,
    inputTokens: answer.inputTokens,
  };
  await appendFile(values.claims, JSON.stringify(row) + "\n");
  if ((i + 1) % 200 === 0)
    console.log(
      `${i + 1}/${todo.length}, ${tokens} Jev tokens ($${((tokens * 0.042) / 1e6).toFixed(3)}), ${((Date.now() - started) / 60000).toFixed(1)} min`,
    );
});
console.log(
  `judged ${todo.length} claims, ${tokens} Jev input tokens = $${((tokens * 0.042) / 1e6).toFixed(3)}`,
);

// ------------------------------------------------------------------------------------------ the board
const rows = await readJsonl<ClaimRow>(values.claims);
const study = existsSync("bench/debatecheck/study.json")
  ? (JSON.parse(await readFile("bench/debatecheck/study.json", "utf8")) as any)
  : null;
const confident: number = study?.selective?.single?.["jev-20"]?.hi ?? 0.88;
const pilot = existsSync(values.pilot) ? (JSON.parse(await readFile(values.pilot, "utf8")) as any) : null;
const pilotRow = (key: string) => (pilot?.models as any[] | undefined)?.find((m) => m.key === key);
const rate = (k: number, n: number) => (n === 0 ? null : k / n);
const models = [...new Set(rows.map((r) => r.model))].map((key) => {
  const mine = rows.filter((r) => r.model === key);
  const c50 = mine.filter((r) => r.contradicts >= 0.5).length;
  const c88 = mine.filter((r) => r.contradicts >= confident).length;
  const w50 = wilsonInterval(c50, mine.length);
  const w88 = wilsonInterval(c88, mine.length);
  const p = pilotRow(key);
  const entry = findEntry(key);
  return {
    key,
    label: entry?.label ?? key,
    vendor: entry?.vendor ?? "unknown",
    claims: mine.length,
    pilotContradicted: mine.filter((r) => r.pilotVerdict === "contradicted").length,
    contradicted: c50,
    rate: rate(c50, mine.length),
    low: w50.low,
    high: w50.high,
    contradictedConfident: c88,
    rateConfident: rate(c88, mine.length),
    lowConfident: w88.low,
    highConfident: w88.high,
    meanP: mine.reduce((a, r) => a + r.contradicts, 0) / Math.max(1, mine.length),
    rating: p?.rating ?? null,
    winRate: p?.winRate ?? null,
    wins: p?.wins ?? null,
    draws: p?.draws ?? null,
    losses: p?.losses ?? null,
    debates: p?.debates ?? null,
  };
});
models.sort((a, b) => (a.rateConfident ?? 1) - (b.rateConfident ?? 1) || (a.rate ?? 1) - (b.rate ?? 1));
const packs = [...new Set(rows.map((r) => r.pack))].sort().map((pack) => {
  const mine = rows.filter((r) => r.pack === pack);
  const c50 = mine.filter((r) => r.contradicts >= 0.5).length;
  const c88 = mine.filter((r) => r.contradicts >= confident).length;
  return {
    pack,
    claims: mine.length,
    contradicted: c50,
    rate: rate(c50, mine.length),
    contradictedConfident: c88,
    rateConfident: rate(c88, mine.length),
  };
});
const board = {
  generatedAt: new Date().toISOString(),
  judge: "jev-1.13.0, framed criterion (Autorubric binary framing), all passages the arena read",
  thresholds: { decision: 0.5, confident },
  debates: results.length,
  claims: rows.length,
  contradicted: rows.filter((r) => r.contradicts >= 0.5).length,
  contradictedConfident: rows.filter((r) => r.contradicts >= confident).length,
  pilotContradicted: rows.filter((r) => r.pilotVerdict === "contradicted").length,
  jevTokens: rows.reduce((a, r) => a + r.inputTokens, 0),
  models,
  packs,
};
await writeFile(values.output, JSON.stringify(board, null, 2) + "\n");

const pct = (x: number | null) => (x === null ? "-" : `${(100 * x).toFixed(1)}%`);
const L: string[] = [
  `# Leaderboard v2: the arena's claims under the framed criterion`,
  "",
  `${board.debates} blind debates, ${board.claims} claims, judged again by Jev 1.13.0 with the framed criterion over every passage the arena read (${board.jevTokens.toLocaleString("en")} input tokens, $${((board.jevTokens * 0.042) / 1e6).toFixed(2)}). The pilot's own question struck ${board.pilotContradicted} claims; the framed criterion marks ${board.contradicted} at the 0.5 rule and ${board.contradictedConfident} at the confident rule (p >= ${confident.toFixed(2)}, the high threshold of the guaranteed-risk region fitted on DebateCheck's training motions, 5% error target). Match outcomes (rating, wins) are the pilot's, unchanged. Wilson 95% intervals.`,
  "",
  `| model | claims | contradicted (pilot) | contradicted, 0.5 | rate | 95% CI | contradicted, confident | rate | 95% CI | mean p | pilot rating | win rate |`,
  `|---|---:|---:|---:|---:|---|---:|---:|---|---:|---:|---:|`,
];
for (const m of models)
  L.push(
    `| ${m.key} | ${m.claims} | ${m.pilotContradicted} | ${m.contradicted} | ${pct(m.rate)} | ${pct(m.low)}-${pct(m.high)} | ${m.contradictedConfident} | ${pct(m.rateConfident)} | ${pct(m.lowConfident)}-${pct(m.highConfident)} | ${m.meanP.toFixed(3)} | ${m.rating === null ? "-" : m.rating.toFixed(0)} | ${pct(m.winRate)} |`,
  );
L.push(
  "",
  `| motion | claims | contradicted, 0.5 | rate | contradicted, confident | rate |`,
  `|---|---:|---:|---:|---:|---:|`,
);
for (const p of packs)
  L.push(
    `| ${p.pack} | ${p.claims} | ${p.contradicted} | ${pct(p.rate)} | ${p.contradictedConfident} | ${pct(p.rateConfident)} |`,
  );
L.push("", `Most confidently contradicted claims (p >= ${confident.toFixed(2)}), for review:`, "");
for (const r of rows
  .filter((r) => r.contradicts >= confident)
  .sort((a, b) => b.contradicts - a.contradicts)
  .slice(0, 25))
  L.push(`- ${r.contradicts.toFixed(2)} | ${r.model} | ${r.pack} | ${r.text}`);
await writeFile(values.report, L.join("\n") + "\n");
console.log(
  `wrote ${values.output} and ${values.report}: ${board.contradicted} contradicted at 0.5, ${board.contradictedConfident} at ${confident.toFixed(2)} (pilot ${board.pilotContradicted})`,
);

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { getKey } from "@/lib/credentials";
import { judgeModelId } from "@/lib/jev/judge";
import { indexPassages } from "@/lib/debate/retrieve";
import { wilsonInterval } from "@/lib/stats";
import { corpusFor, loadBlindResults, pct, runPool, sentencesOf, writeReport } from "./common";

// Judges every claim of a run again with the sharper relation question over the three passages that
// best match the sentence (the design that detected altered numbers best without false alarms in
// perturb-variants), and reports what the leaderboard's contradiction counts would look like under it.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
    top: { type: "string", default: "3" },
    concurrency: { type: "string", default: "8" },
  },
});

const apiKey = getKey("TYPESAFE_API_KEY");
if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set.");
const client = new TypeSafeClient({ apiKey, timeout: 15_000, logLevel: "error" });
const SHARP = {
  supports: "a passage states the claim or directly implies it is true",
  contradicts:
    "a passage gives a different number, date, name, place or outcome for the same thing `sentence` describes, or states the opposite",
  says_nothing: "no passage addresses what the sentence asserts",
};

const results = await loadBlindResults(values.input, values.run);
const claims = (await sentencesOf(results)).filter(
  (r) => r.verdict !== "opinion" && r.verdict !== "unjudged",
);
console.log(`${results.length} debates, ${claims.length} claims to judge again with top ${values.top}`);
let inputTokens = 0;

const rows = await runPool(claims, Number(values.concurrency), async (r, i) => {
  const corpus = await corpusFor(r.pack);
  const all = r.evidenceIds
    .map((id) => corpus.passages.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const matched = indexPassages(all).search(r.text, Number(values.top));
  const passages = matched.length > 0 ? matched : all.slice(0, Number(values.top));
  const evidence = passages.map((p) => `${p.id}| ${p.text}`).join("\n");
  const { answers, usage } = await client.systemOne({
    state: { motion: r.motion, sentence: r.text, evidence },
    questions: { relation: choice("How does the `evidence` relate to `sentence`?", SHARP) },
    model: judgeModelId(),
  });
  inputTokens += usage.input_tokens;
  const p = answers.relation.probabilities;
  if ((i + 1) % 100 === 0) process.stdout.write(`${i + 1}/${claims.length}\n`);
  return {
    ...r,
    sharp: { supports: p.supports, contradicts: p.contradicts, saysNothing: p.says_nothing },
    shown: passages.map((x) => x.id),
  };
});

const models = [...new Set(rows.map((r) => r.model))].sort();
const lines: string[] = [
  `# Claims judged again with the sharp question over the top ${values.top} passages (${rows.length} claims, ${results.length} debates)\n`,
];
lines.push(
  "Counts under the debate's own verdicts next to counts under the sharper question. Wilson 95% intervals for the contradiction rate at 0.7.\n",
);
lines.push(
  "| model | claims | contradicted (debate) | contradicted ≥0.7 (sharp) | rate | 95% CI | contradicted ≥0.5 (sharp) | supported ≥0.7 (sharp) |",
);
lines.push("|---|---:|---:|---:|---:|---|---:|---:|");
for (const m of models) {
  const mine = rows.filter((r) => r.model === m);
  const c7 = mine.filter((r) => r.sharp.contradicts >= 0.7).length;
  const c5 = mine.filter((r) => r.sharp.contradicts >= 0.5).length;
  const s7 = mine.filter((r) => r.sharp.supports >= 0.7).length;
  const ci = wilsonInterval(c7, mine.length);
  lines.push(
    `| ${m} | ${mine.length} | ${mine.filter((r) => r.verdict === "contradicted").length} | ${c7} | ${pct(c7, mine.length).trim()} | ${(100 * ci.low).toFixed(1)}–${(100 * ci.high).toFixed(1)}% | ${c5} | ${s7} |`,
  );
}
lines.push("\n| pack | claims | contradicted ≥0.7 (sharp) | rate |");
lines.push("|---|---:|---:|---:|");
for (const pack of [...new Set(rows.map((r) => r.pack))].sort()) {
  const mine = rows.filter((r) => r.pack === pack);
  const c7 = mine.filter((r) => r.sharp.contradicts >= 0.7).length;
  lines.push(`| ${pack} | ${mine.length} | ${c7} | ${pct(c7, mine.length).trim()} |`);
}
lines.push(`\n## Sentences at p(contradicts) ≥ 0.7 under the sharp question, for review\n`);
let n = 0;
for (const r of rows
  .filter((r) => r.sharp.contradicts >= 0.7)
  .sort((a, b) => b.sharp.contradicts - a.sharp.contradicts)) {
  const corpus = await corpusFor(r.pack);
  n++;
  lines.push(
    `### ${n}. ${r.model} (${r.side}, ${r.turn}) on ${r.pack} · p ${r.sharp.contradicts.toFixed(2)} (debate verdict: ${r.verdict})\n`,
  );
  lines.push(`> ${r.text}\n`);
  for (const id of r.shown) lines.push(`- **${id}** ${corpus.passages.get(id)?.text.slice(0, 500)}`);
  lines.push("\nReviewer: ____\n");
}
lines.push(`\nJev input tokens: ${inputTokens} ($${((inputTokens * 0.042) / 1e6).toFixed(4)}).`);
const text = lines.join("\n") + "\n";
console.log(text.split("\n## Sentences")[0]);
const suffix = values.run ? `-${values.run}` : "";
await writeFile(
  `bench/analysis/rejudge${suffix}.jsonl`,
  rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
);
console.log(`Wrote ${await writeReport(`rejudge${suffix}.md`, text)}`);

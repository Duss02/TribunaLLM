import { parseArgs } from "node:util";
import { indexPassages } from "@/lib/debate/retrieve";
import { corpusFor, loadBlindResults, sentencesOf, writeReport } from "./common";

// Lists every contradicted sentence with the passages most likely to contain the contradiction, for a
// reader to check by hand whether the retraction was right. No network.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
    verdict: { type: "string", default: "contradicted" },
    limit: { type: "string", default: "200" },
  },
});

const results = await loadBlindResults(values.input, values.run);
const records = (await sentencesOf(results))
  .filter((r) => r.verdict === values.verdict)
  .slice(0, Number(values.limit));
const lines: string[] = [`# ${values.verdict} sentences for review (${records.length})\n`];
lines.push(
  "For each sentence: the model, the motion, Jev's probabilities, and the three evidence passages that share the most terms with it. Mark each as RIGHT (the evidence really contradicts it), WRONG (it does not), or UNCLEAR.\n",
);
let n = 0;
for (const r of records) {
  const corpus = await corpusFor(r.pack);
  const shown = r.evidenceIds
    .map((id) => corpus.passages.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  const top = indexPassages(shown).search(r.text, 3);
  n++;
  lines.push(`## ${n}. ${r.model} (${r.side}, ${r.turn}) on ${r.pack}\n`);
  lines.push(`Motion: ${r.motion}\n`);
  lines.push(`> ${r.text}\n`);
  lines.push(
    `is_claim ${r.isClaim.toFixed(2)} · supported ${r.supported.toFixed(2)} · contradicts ${r.contradicts.toFixed(2)} · best passage ${r.passage ?? "none"}\n`,
  );
  for (const p of top) lines.push(`- **${p.id}** ${p.text}`);
  lines.push("\nVerdict by reviewer: ____\n");
}
const text = lines.join("\n") + "\n";
console.log(
  `Wrote ${await writeReport(`review-${values.verdict}${values.run ? `-${values.run}` : ""}.md`, text)} (${records.length} sentences)`,
);

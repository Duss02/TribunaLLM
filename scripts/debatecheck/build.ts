import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { seededRandom } from "@/lib/random";
import { corpusFor, loadBlindResults, rebuildEvidence, sentencesOf } from "../analysis/common";
import { type Pair, TEST_PACKS, TRAIN_PACKS, perturb } from "./lib";

// Builds the DebateCheck pairs from every blind debate with a transcript: one pair per supported sentence
// that carries a number. The split is by motion, so a criterion tuned on the training motions is tested on
// motions it never saw.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    seed: { type: "string", default: "2026" },
    out: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    /** Which of the debate's verdicts to draw sentences from: `supported` (the benchmark) or `unverified` (a sample the judge did not select). */
    verdict: { type: "string", default: "supported" },
  },
});

const results = await loadBlindResults(values.input);
const records = (await sentencesOf(results)).filter((r) => r.verdict === values.verdict);
const pairs: Pair[] = [];
let i = 0;
for (const r of records) {
  const corpus = await corpusFor(r.pack);
  const evidence = rebuildEvidence(corpus, r.evidenceIds);
  const change = perturb(r.text, seededRandom(Number(values.seed) + i++), evidence.text);
  if (!change) continue;
  pairs.push({
    id: r.id,
    runId: r.runId,
    pack: r.pack,
    motion: r.motion,
    model: r.model,
    side: r.side,
    turn: r.turn,
    original: r.text,
    perturbed: change.text,
    kind: change.kind,
    from: change.from,
    to: change.to,
    evidenceIds: r.evidenceIds,
    split: TEST_PACKS.includes(r.pack) ? "test" : TRAIN_PACKS.includes(r.pack) ? "train" : "test",
    debate: { isClaim: r.isClaim, supported: r.supported, contradicts: r.contradicts },
  });
}
await writeFile(values.out, pairs.map((p) => JSON.stringify(p)).join("\n") + "\n");
const count = (pick: (p: Pair) => string) => {
  const out = new Map<string, number>();
  for (const p of pairs) out.set(pick(p), (out.get(pick(p)) ?? 0) + 1);
  return [...out].map(([k, v]) => `${k} ${v}`).join(", ");
};
console.log(
  `${pairs.length} pairs from ${records.length} ${values.verdict} sentences in ${results.length} debates -> ${values.out}`,
);
console.log(`split: ${count((p) => p.split)}`);
console.log(`kind: ${count((p) => p.kind)}`);
console.log(`pack: ${count((p) => p.pack)}`);
console.log(`model: ${count((p) => p.model)}`);

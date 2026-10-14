import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { corpusFor } from "../analysis/common";
import { type Pair, SHARP, evidenceText, readJsonl, selectPassages } from "./lib";

// Writes a split of DebateCheck as an Autorubric RubricDataset file: one item per sentence, the evidence the
// judge reads in the item's prompt, one binary criterion that is MET when the evidence contradicts the
// sentence. Altered sentences are MET by construction, unchanged ones UNMET.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    split: { type: "string", default: "test" },
    top: { type: "string", default: "3" },
    limit: { type: "string" },
    out: { type: "string" },
  },
});
const pairs = (await readJsonl<Pair>(values.pairs))
  .filter((p) => values.split === "all" || p.split === values.split)
  .slice(0, values.limit ? Number(values.limit) : undefined);
const top = values.top === "all" ? null : Number(values.top);
const items: unknown[] = [];
for (const p of pairs) {
  const corpus = await corpusFor(p.pack);
  for (const which of ["original", "perturbed"] as const) {
    const sentence = p[which];
    const evidence = evidenceText(selectPassages(corpus, p.evidenceIds, sentence, top));
    items.push({
      submission: sentence,
      // Opaque: nothing in the item names its label, in case a judge ever sees the description.
      description: `item-${String(items.length + 1).padStart(4, "0")}`,
      prompt: `Motion under debate: ${p.motion}\n\nEvidence passages (id| text):\n${evidence}`,
      ground_truth: [which === "perturbed" ? "MET" : "UNMET"],
      ground_truth_reasons: [
        which === "perturbed"
          ? `number altered ${p.from} -> ${p.to}; the evidence has ${p.from}`
          : "unchanged sentence the debate judge called supported",
      ],
    });
  }
}
const key = pairs.flatMap((p) =>
  ["original", "perturbed"].map((which, i) => ({
    item: `item-${String(2 * pairs.indexOf(p) + i + 1).padStart(4, "0")}`,
    id: p.id,
    which,
    kind: p.kind,
    model: p.model,
    pack: p.pack,
  })),
);
const dataset = {
  name: `debatecheck-${values.split}-top${values.top}`,
  prompt: null,
  rubric: [
    {
      name: "contradicted_by_evidence",
      weight: -10,
      requirement: `A passage in the evidence ${SHARP.contradicts.replace("a passage ", "").replace("`sentence`", "the sentence")}.`,
    },
  ],
  items,
};
const out =
  values.out ??
  `bench/debatecheck/autorubric-${values.split}-top${values.top}${values.limit ? `-${values.limit}` : ""}.json`;
await writeFile(out, JSON.stringify(dataset, null, 1));
await writeFile(out.replace(/\.json$/, "-key.jsonl"), key.map((k) => JSON.stringify(k)).join("\n") + "\n");
console.log(`${items.length} items (${pairs.length} pairs) -> ${out}`);
console.log(`criterion: ${(dataset.rubric[0] as { requirement: string }).requirement}`);

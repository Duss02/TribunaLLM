import { parseArgs } from "node:util";
import { readFile } from "node:fs/promises";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { getKey } from "@/lib/credentials";
import { judgeModelId } from "@/lib/jev/judge";
import { indexPassages } from "@/lib/debate/retrieve";
import { corpusFor, pct, runPool, writeReport } from "./common";

// Re-asks the judge about the perturbation pairs with other question designs, to see whether a wrong
// number becomes visible when the evidence is narrowed to the passages that match the sentence, when
// "contradicts" is described more sharply, or when the question is asked directly. Costs Jev input only.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/analysis/perturb-pilot-blind-a.jsonl" },
    concurrency: { type: "string", default: "6" },
    out: { type: "string", default: "perturb-variants-pilot-blind-a.md" },
  },
});

const apiKey = getKey("TYPESAFE_API_KEY");
if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set.");
const client = new TypeSafeClient({ apiKey, timeout: 15_000, logLevel: "error" });

interface Pair {
  id: string;
  model: string;
  pack: string;
  original: string;
  perturbed: string;
  kind: string;
  from: string;
  to: string;
  again: { contradicts: number; supported: number; verdict: string };
  altered: { contradicts: number; supported: number; verdict: string };
}
const pairs: Pair[] = (await readFile(values.pairs, "utf8"))
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

const SHARP = {
  supports: "a passage states the claim or directly implies it is true",
  contradicts:
    "a passage gives a different number, date, name, place or outcome for the same thing `sentence` describes, or states the opposite",
  says_nothing: "no passage addresses what the sentence asserts",
};
const LOOSE = {
  supports: "a passage states the claim or directly implies it is true",
  contradicts: "a passage states or directly implies the claim is false",
  says_nothing: "no passage addresses what the sentence asserts",
};

type Variant = { name: string; top: number | null; wording: "loose" | "sharp"; direct: boolean };
const VARIANTS: Variant[] = [
  { name: "loose, all 20 (as in the debate)", top: null, wording: "loose", direct: false },
  { name: "sharp, all 20", top: null, wording: "sharp", direct: false },
  { name: "sharp, top 3 by BM25", top: 3, wording: "sharp", direct: false },
  { name: "sharp, top 1 by BM25", top: 1, wording: "sharp", direct: false },
  { name: "direct yes/no, top 3", top: 3, wording: "sharp", direct: true },
];

async function judge(pair: Pair, sentence: string, variant: Variant): Promise<number> {
  const corpus = await corpusFor(pair.pack);
  // The 20 passages the judge read in the debate are rebuilt from the original record of this sentence.
  const record = sentenceEvidence.get(pair.id);
  if (!record) throw new Error(`no evidence ids for ${pair.id}`);
  let passages = record
    .map((id) => corpus.passages.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);
  if (variant.top !== null) {
    const matched = indexPassages(passages).search(sentence, variant.top);
    passages = matched.length > 0 ? matched : passages.slice(0, variant.top);
  }
  const evidence = passages.map((p) => `${p.id}| ${p.text}`).join("\n");
  const state = { motion: corpus.pack.motion, sentence, evidence };
  if (variant.direct) {
    const { answers } = await client.systemOne({
      state,
      questions: {
        differs: noul(
          "Does a passage in `evidence` give a different figure, date, name or outcome for what `sentence` asserts, or state the opposite of it?",
        ),
      },
      model: judgeModelId(),
    });
    return answers.differs.noul;
  }
  const { answers } = await client.systemOne({
    state,
    questions: {
      relation: choice(
        "How does the `evidence` relate to `sentence`?",
        variant.wording === "sharp" ? SHARP : LOOSE,
      ),
    },
    model: judgeModelId(),
  });
  return answers.relation.probabilities.contradicts;
}

// Evidence ids per sentence come from the result lines, matched by the perturb record id.
const sentenceEvidence = new Map<string, string[]>();
{
  const { loadBlindResults, sentencesOf } = await import("./common");
  const results = await loadBlindResults("bench/results");
  for (const r of await sentencesOf(results)) sentenceEvidence.set(r.id, r.evidenceIds);
}

const rows = await runPool(pairs, Number(values.concurrency), async (pair, i) => {
  const out: Record<string, { original: number; perturbed: number }> = {};
  for (const variant of VARIANTS) {
    const [original, perturbed] = await Promise.all([
      judge(pair, pair.original, variant),
      judge(pair, pair.perturbed, variant),
    ]);
    out[variant.name] = { original, perturbed };
  }
  process.stdout.write(
    `${i + 1}/${pairs.length} ${pair.kind} ${pair.from}->${pair.to}: ${VARIANTS.map((v) => out[v.name]!.perturbed.toFixed(2)).join(" ")}\n`,
  );
  return { pair, out };
});

const lines: string[] = [`# Question variants on the perturbation pairs (${rows.length} pairs)\n`];
lines.push(
  "p(contradicts) for the unchanged sentence (should stay low) and for the sentence with one number altered (should rise). Detection is the share of altered sentences at or above the threshold; false alarm is the share of unchanged sentences at or above it.\n",
);
lines.push(
  "| variant | altered: mean p | detection ≥0.7 | detection ≥0.5 | unchanged: mean p | false alarm ≥0.7 | false alarm ≥0.5 |",
);
lines.push("|---|---:|---:|---:|---:|---:|---:|");
for (const v of VARIANTS) {
  const alt = rows.map((r) => r.out[v.name]!.perturbed);
  const org = rows.map((r) => r.out[v.name]!.original);
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
  lines.push(
    `| ${v.name} | ${mean(alt).toFixed(2)} | ${pct(alt.filter((p) => p >= 0.7).length, alt.length).trim()} | ${pct(alt.filter((p) => p >= 0.5).length, alt.length).trim()} | ${mean(org).toFixed(2)} | ${pct(org.filter((p) => p >= 0.7).length, org.length).trim()} | ${pct(org.filter((p) => p >= 0.5).length, org.length).trim()} |`,
  );
}
lines.push("\n## By kind of number, detection ≥0.5\n");
lines.push(`| kind | n | ${VARIANTS.map((v) => v.name).join(" | ")} |`);
lines.push(`|---|---:|${VARIANTS.map(() => "---:").join("|")}|`);
for (const kind of ["year", "percent", "other"]) {
  const items = rows.filter((r) => r.pair.kind === kind);
  if (items.length === 0) continue;
  lines.push(
    `| ${kind} | ${items.length} | ${VARIANTS.map((v) => pct(items.filter((r) => r.out[v.name]!.perturbed >= 0.5).length, items.length).trim()).join(" | ")} |`,
  );
}
const best = VARIANTS[2]!;
lines.push(`\n## Altered sentences still below 0.5 under "${best.name}"\n`);
for (const r of rows.filter((r) => r.out[best.name]!.perturbed < 0.5).slice(0, 30)) {
  lines.push(
    `- (${r.pair.model}, ${r.pair.pack}) ${r.pair.from} → ${r.pair.to}: "${r.pair.perturbed}" · p ${r.out[best.name]!.perturbed.toFixed(2)}`,
  );
}
const text = lines.join("\n") + "\n";
console.log(text);
console.log(`Wrote ${await writeReport(values.out, text)}`);

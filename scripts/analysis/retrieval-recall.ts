import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { generateText } from "ai";
import { libraryPassages } from "@/lib/debate/library";
import { listPacks } from "@/lib/debate/packs";
import { indexPassages } from "@/lib/debate/retrieve";
import { splitSentences } from "@/lib/debate/sentences";
import { resolveDebater } from "@/lib/models/debater";
import { seededRandom, shuffled } from "@/lib/random";
import { corpusFor, pct, runPool, writeReport } from "./common";

// Measures whether BM25 puts the right library passage among the ones the judge reads. For sampled
// library passages a cheap model writes one claim in its own words; recall@k is how often the source
// passage ranks within the top k for that claim. The verbatim first sentence is the easy upper bound.
const { values } = parseArgs({
  options: {
    model: { type: "string", default: "deepseek-v4-flash" },
    "per-pack": { type: "string", default: "30" },
    packs: { type: "string", default: "all" },
    seed: { type: "string", default: "5" },
    concurrency: { type: "string", default: "4" },
  },
});

const debater = await resolveDebater(values.model, { paced: false });
const packs = values.packs === "all" ? (await listPacks()).map((p) => p.slug) : values.packs.split(",");
const perPack = Number(values["per-pack"]);
const random = seededRandom(Number(values.seed));
const K = [5, 10, 20, 30];

interface Trial {
  pack: string;
  passage: string;
  claim: string;
  rank: number | null;
  verbatimRank: number | null;
}
const trials: Trial[] = [];
let inputTokens = 0,
  outputTokens = 0;

for (const slug of packs) {
  const corpus = await corpusFor(slug);
  const all = [...corpus.pack.passages, ...libraryPassages(corpus.library)];
  const index = indexPassages(all);
  const candidates = all.filter((p) => p.id.startsWith("W") && p.text.split(/\s+/).length >= 40);
  const sample = shuffled(candidates, random).slice(0, perPack);
  const rankOf = (query: string, id: string) => {
    const found = index.search(query, 50).findIndex((p) => p.id === id);
    return found === -1 ? null : found + 1;
  };
  const rows = await runPool(sample, Number(values.concurrency), async (passage) => {
    const body = passage.text.replace(/^\([^)]*\) /, "");
    const { text, usage } = await generateText({
      model: debater.model,
      system:
        "You turn an encyclopedia passage into one sentence a debater might say. Output only the sentence.",
      prompt: `Passage:\n${body}\n\nWrite ONE sentence of at most 25 words that states one specific fact from the passage (a number, date, name or outcome), in your own words, without copying phrases. Output only the sentence.`,
      maxOutputTokens: 1500,
      reasoning: "low",
      temperature: 0.7,
    });
    inputTokens += usage.inputTokens ?? 0;
    outputTokens += usage.outputTokens ?? 0;
    const claim = splitSentences(text.trim(), { final: true }).sentences[0] ?? text.trim();
    const first = splitSentences(body, { final: true }).sentences[0] ?? body;
    return {
      pack: slug,
      passage: passage.id,
      claim,
      rank: rankOf(claim, passage.id),
      verbatimRank: rankOf(first, passage.id),
    };
  });
  trials.push(...rows);
  const at20 = rows.filter((r) => r.rank !== null && r.rank <= 20).length;
  console.log(`${slug}: recall@20 ${pct(at20, rows.length)} over ${rows.length} claims`);
}

const lines: string[] = [
  `# Retrieval recall (${trials.length} generated claims, ${values.model}, seed ${values.seed})\n`,
];
lines.push(
  "recall@k: share of claims whose source passage ranks within the top k by BM25 over the pack plus the library. The judge reads the top 20 for a sentence and the top 30 for a turn.\n",
);
lines.push(`| query | ${K.map((k) => `recall@${k}`).join(" | ")} | median rank |`);
lines.push(`|---|${K.map(() => "---:").join("|")}|---:|`);
const summarise = (name: string, pick: (t: Trial) => number | null) => {
  const ranks = trials.map(pick);
  const found = ranks.filter((r): r is number => r !== null).sort((a, b) => a - b);
  const median = found.length === 0 ? "-" : String(found[Math.floor(found.length / 2)]);
  lines.push(
    `| ${name} | ${K.map((k) => pct(ranks.filter((r) => r !== null && r <= k).length, trials.length).trim()).join(" | ")} | ${median} |`,
  );
};
summarise("model-written claim", (t) => t.rank);
summarise("verbatim first sentence", (t) => t.verbatimRank);
lines.push("\n| pack | claims | recall@20 (claim) | recall@20 (verbatim) |");
lines.push("|---|---:|---:|---:|");
for (const slug of packs) {
  const rows = trials.filter((t) => t.pack === slug);
  lines.push(
    `| ${slug} | ${rows.length} | ${pct(rows.filter((r) => r.rank !== null && r.rank <= 20).length, rows.length).trim()} | ${pct(rows.filter((r) => r.verbatimRank !== null && r.verbatimRank <= 20).length, rows.length).trim()} |`,
  );
}
lines.push("\n## Claims whose passage was not in the top 20\n");
for (const t of trials.filter((t) => t.rank === null || t.rank > 20).slice(0, 30))
  lines.push(`- (${t.pack}, ${t.passage}, rank ${t.rank ?? ">50"}) ${t.claim}`);
lines.push(`\nGeneration used ${inputTokens} input and ${outputTokens} output tokens of ${values.model}.`);
const text = lines.join("\n") + "\n";
console.log(text);
await writeFile(
  "bench/analysis/retrieval-recall.jsonl",
  trials.map((t) => JSON.stringify(t)).join("\n") + "\n",
);
console.log(`Wrote ${await writeReport("retrieval-recall.md", text)}`);

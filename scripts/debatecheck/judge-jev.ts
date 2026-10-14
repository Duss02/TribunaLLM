import { parseArgs } from "node:util";
import { appendFile } from "node:fs/promises";
import { corpusFor, runPool } from "../analysis/common";
import {
  type JevAnswer,
  type Pair,
  VARIANTS,
  type VariantName,
  askJev,
  readJsonl,
  selectPassages,
} from "./lib";

// Judges both sentences of every pair under each criterion variant with Jev. Resumable: pairs already in
// the output file are skipped. Costs Jev input tokens only.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    out: { type: "string", default: "bench/debatecheck/jev-variants.jsonl" },
    variants: { type: "string", default: VARIANTS.map((v) => v.name).join(",") },
    concurrency: { type: "string", default: "8" },
    limit: { type: "string" },
    /** Add the requested variants to rows that lack them, rewriting the file, instead of skipping judged pairs. */
    fill: { type: "boolean", default: false },
  },
});

export interface JevRow {
  id: string;
  answers: Partial<Record<VariantName, { original: JevAnswer; perturbed: JevAnswer }>>;
}

const wanted = new Set(values.variants.split(",") as VariantName[]);
const variants = VARIANTS.filter((v) => wanted.has(v.name));
const pairs = await readJsonl<Pair>(values.pairs);
const existing = new Map((await readJsonl<JevRow>(values.out)).map((r) => [r.id, r]));
const todo = (
  values.fill
    ? pairs.filter((p) => variants.some((v) => !existing.get(p.id)?.answers[v.name]))
    : pairs.filter((p) => !existing.has(p.id))
).slice(0, values.limit ? Number(values.limit) : undefined);
console.log(
  `${pairs.length} pairs, ${existing.size} rows, ${todo.length} to judge under ${variants.map((v) => v.name).join(", ")}${values.fill ? " (fill)" : ""}`,
);
let tokens = 0;
let n = 0;
const started = Date.now();
const { writeFile } = await import("node:fs/promises");
const flush = () =>
  writeFile(values.out, [...existing.values()].map((r) => JSON.stringify(r)).join("\n") + "\n");
await runPool(todo, Number(values.concurrency), async (pair) => {
  const corpus = await corpusFor(pair.pack);
  const row: JevRow = existing.get(pair.id) ?? { id: pair.id, answers: {} };
  for (const v of variants) {
    if (values.fill && row.answers[v.name]) continue;
    const [original, perturbed] = await Promise.all([
      askJev(
        pair.motion,
        pair.original,
        selectPassages(corpus, pair.evidenceIds, pair.original, v.top),
        v.form,
      ),
      askJev(
        pair.motion,
        pair.perturbed,
        selectPassages(corpus, pair.evidenceIds, pair.perturbed, v.top),
        v.form,
      ),
    ]);
    row.answers[v.name] = { original, perturbed };
    tokens += original.inputTokens + perturbed.inputTokens;
  }
  if (values.fill) {
    existing.set(pair.id, row);
    if (n % 100 === 99) await flush();
  } else await appendFile(values.out, JSON.stringify(row) + "\n");
  n++;
  if (n % 50 === 0)
    console.log(
      `${n}/${todo.length} pairs, ${tokens} Jev tokens ($${((tokens * 0.042) / 1e6).toFixed(3)}), ${((Date.now() - started) / 60000).toFixed(1)} min`,
    );
});
if (values.fill) await flush();
console.log(`done: ${n} pairs, ${tokens} Jev input tokens = $${((tokens * 0.042) / 1e6).toFixed(4)}`);

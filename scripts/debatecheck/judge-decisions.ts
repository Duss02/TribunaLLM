import { parseArgs } from "node:util";
import { appendFile } from "node:fs/promises";
import { corpusFor, runPool } from "../analysis/common";
import {
  FRAMED,
  LOOSE,
  RELATION_QUESTION,
  SHARP,
  type Pair,
  evidenceText,
  readJsonl,
  selectPassages,
} from "./lib";

// GPT-6 Luna through OpenAI's Decisions API (public beta, October 2026): a second decision model, asked the
// same framed criterion as Jev over the same evidence, in two evidence conditions. Input tokens only are
// billed ($0.10 per million at the beta price). Resumable per pair.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    out: { type: "string", default: "bench/debatecheck/decisions-gpt-6-luna.jsonl" },
    conditions: { type: "string", default: "20,3" },
    /** framed (the study's criterion), or loose / sharp: the relation question as a choice question, same input text. */
    question: { type: "string", default: "framed" },
    concurrency: { type: "string", default: "6" },
    limit: { type: "string" },
  },
});
const key = process.env.OPENAI_API_KEY;
if (!key) throw new Error("OPENAI_API_KEY is not set.");
const PRICE_PER_TOKEN = 0.1e-6;

interface Side {
  probability: number;
  inputTokens: number;
  probabilities?: Record<string, number>;
}
export interface DecisionRow {
  id: string;
  judge: string;
  answers: Record<string, { original: Side; perturbed: Side }>;
}

async function ask(motion: string, sentence: string, evidence: string): Promise<Side> {
  const relation = values.question === "loose" ? LOOSE : values.question === "sharp" ? SHARP : null;
  const body = {
    model: "gpt-6-luna",
    input: `Motion under debate: ${motion}\n\nEvidence passages (id| text):\n${evidence}\n\nSentence to check (the submission): ${sentence}`,
    questions: relation
      ? [
          {
            name: "relation",
            type: "choice",
            instructions: RELATION_QUESTION,
            choices: Object.entries(relation).map(([value, description]) => ({ value, description })),
          },
        ]
      : [
          {
            name: "contradicted",
            type: "predicate",
            instructions: `${FRAMED.task} ${FRAMED.prefix}${FRAMED.criterion}`,
          },
        ],
  };
  for (let attempt = 1; attempt <= 4; attempt++) {
    const r = await fetch("https://api.openai.com/v1/decisions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = (await r.json()) as {
        answers: {
          name: string;
          probability?: number;
          probabilities?: { value: string; probability: number }[];
        }[];
        usage: { input_tokens: number };
      };
      if (relation) {
        const a = j.answers.find((x) => x.name === "relation");
        if (!a?.probabilities) throw new Error(`no relation answer in ${JSON.stringify(j).slice(0, 200)}`);
        const probabilities = Object.fromEntries(a.probabilities.map((p) => [p.value, p.probability]));
        return {
          probability: probabilities.contradicts ?? 0,
          inputTokens: j.usage.input_tokens,
          probabilities,
        };
      }
      const a = j.answers.find((x) => x.name === "contradicted");
      if (!a || a.probability === undefined)
        throw new Error(`no answer in ${JSON.stringify(j).slice(0, 200)}`);
      return { probability: a.probability, inputTokens: j.usage.input_tokens };
    }
    const text = await r.text();
    if (r.status === 429 || r.status >= 500) {
      await new Promise((res) => setTimeout(res, 1500 * attempt));
      continue;
    }
    throw new Error(`decisions API ${r.status}: ${text.slice(0, 300)}`);
  }
  throw new Error("decisions API: gave up after 4 attempts");
}

if (!["framed", "loose", "sharp"].includes(values.question))
  throw new Error(`unknown question ${values.question}`);
const conditions = values.conditions.split(",").map((c) => (c === "20" ? null : Number(c)));
const pairs = await readJsonl<Pair>(values.pairs);
const done = new Set((await readJsonl<DecisionRow>(values.out)).map((r) => r.id));
const todo = pairs.filter((p) => !done.has(p.id)).slice(0, values.limit ? Number(values.limit) : undefined);
console.log(
  `${pairs.length} pairs, ${done.size} done, ${todo.length} to judge under conditions ${values.conditions}`,
);
let tokens = 0,
  n = 0;
const started = Date.now();
await runPool(todo, Number(values.concurrency), async (pair) => {
  const corpus = await corpusFor(pair.pack);
  const row: DecisionRow = {
    id: pair.id,
    judge: values.question === "framed" ? "gpt-6-luna-decisions" : `gpt-6-luna-decisions-${values.question}`,
    answers: {},
  };
  for (const top of conditions) {
    const [original, perturbed] = await Promise.all([
      ask(
        pair.motion,
        pair.original,
        evidenceText(selectPassages(corpus, pair.evidenceIds, pair.original, top)),
      ),
      ask(
        pair.motion,
        pair.perturbed,
        evidenceText(selectPassages(corpus, pair.evidenceIds, pair.perturbed, top)),
      ),
    ]);
    row.answers[top === null ? "d20" : `d${top}`] = { original, perturbed };
    tokens += original.inputTokens + perturbed.inputTokens;
  }
  await appendFile(values.out, JSON.stringify(row) + "\n");
  n++;
  if (n % 50 === 0)
    console.log(
      `${n}/${todo.length} pairs, ${tokens} tokens ($${(tokens * PRICE_PER_TOKEN).toFixed(3)}), ${((Date.now() - started) / 60000).toFixed(1)} min`,
    );
});
console.log(`done: ${n} pairs, ${tokens} input tokens = $${(tokens * PRICE_PER_TOKEN).toFixed(3)}`);

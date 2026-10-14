import { parseArgs } from "node:util";
import { appendFile } from "node:fs/promises";
import { generateText } from "ai";
import { resolveDebater } from "@/lib/models/debater";
import { corpusFor, runPool } from "../analysis/common";
import { FRAMED, type Pair, SHARP, evidenceText, readJsonl, selectPassages } from "./lib";

// A language model judges both sentences of each pair over the same top-3 passages as Jev's `sharp3` and
// `framed3` variants. Two framings: `sharp`, the pilot's relation question (supports / contradicts /
// says_nothing), and `framed`, the study's default, Autorubric's binary criterion with its MET / UNMET
// definitions over the same input text the Decisions API judge receives. Resumable per judge. Output: one
// JSONL line per pair.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    judge: { type: "string", default: "gpt-6-luna" },
    reasoning: { type: "string", default: "low" },
    framing: { type: "string", default: "framed" },
    concurrency: { type: "string", default: "6" },
    limit: { type: "string" },
    split: { type: "string" },
    out: { type: "string" },
  },
});
if (values.framing !== "framed" && values.framing !== "sharp")
  throw new Error(`unknown framing ${values.framing}`);

type Label = "supports" | "contradicts" | "says_nothing" | "not_contradicted";
interface LlmSide {
  label: Label | null;
  /** Framed mode only: the grader's MET / UNMET answer (MET = the criterion holds = contradicted). */
  verdict?: "MET" | "UNMET" | null;
  isClaim: boolean | null;
  passage: string | null;
  raw?: string;
  inputTokens?: number;
  outputTokens: number;
}
export interface LlmRow {
  id: string;
  judge: string;
  framing?: "framed" | "sharp";
  original: LlmSide;
  perturbed: LlmSide;
}

const SHARP_SYSTEM = `You are a strict fact-check judge. You see a motion, one sentence a debater said, and numbered evidence passages. Answer only with JSON of this exact shape:
{"is_claim": true|false, "relation": "supports"|"contradicts"|"says_nothing", "passage": "<id>"|null}
relation is "supports" when ${SHARP.supports}; "contradicts" when ${SHARP.contradicts}; "says_nothing" when ${SHARP.says_nothing}. is_claim is false for opinions, value judgments, questions or rhetorical framing.`;

const FRAMED_SYSTEM = `You are a grader. ${FRAMED.task}
${FRAMED.prefix}${FRAMED.criterion}
MET: ${FRAMED.met}
UNMET: ${FRAMED.unmet}
Answer only with JSON of this exact shape: {"verdict": "MET"|"UNMET"}`;

const out = values.out ?? `bench/debatecheck/llm-${values.judge}.jsonl`;
const pairs = (await readJsonl<Pair>(values.pairs)).filter((p) => !values.split || p.split === values.split);
const done = new Set((await readJsonl<LlmRow>(out)).map((r) => r.id));
const todo = pairs.filter((p) => !done.has(p.id)).slice(0, values.limit ? Number(values.limit) : undefined);
console.log(
  `${values.judge} (${values.framing}): ${pairs.length} pairs, ${done.size} done, ${todo.length} to judge`,
);
const debater = await resolveDebater(values.judge, { paced: false });
let inputTokens = 0,
  outputTokens = 0,
  n = 0;

async function ask(motion: string, sentence: string, evidence: string): Promise<LlmSide> {
  const framed = values.framing === "framed";
  const request = () =>
    generateText({
      model: debater.model,
      system: framed ? FRAMED_SYSTEM : SHARP_SYSTEM,
      prompt: framed
        ? `Motion under debate: ${motion}\n\nEvidence passages (id| text):\n${evidence}\n\nSentence to check (the submission): ${sentence}`
        : `Motion: ${motion}\nSentence: ${sentence}\n\nEvidence:\n${evidence}`,
      maxOutputTokens: 2500,
      reasoning: values.reasoning as "low" | "medium" | "high",
      temperature: 0,
    });
  // DeepSeek lowers the allowed concurrency with the balance and answers 429 when it is exceeded; the SDK's
  // three retries are not enough for a long run, so a rate-limited request waits and tries again.
  let result: Awaited<ReturnType<typeof request>> | null = null;
  for (let attempt = 1; result === null; attempt++) {
    try {
      result = await request();
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}`
          : String(error);
      if (attempt >= 12 || !/too many requests|rate limit|429|overloaded|concurrency/i.test(message))
        throw error;
      await new Promise((resolve) => setTimeout(resolve, Math.min(60_000, 5_000 * attempt)));
    }
  }
  const { text, usage } = result;
  inputTokens += usage.inputTokens ?? 0;
  outputTokens += usage.outputTokens ?? 0;
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  let parsed: { is_claim?: boolean; relation?: string; passage?: string | null; verdict?: string } = {};
  try {
    parsed = json ? JSON.parse(json) : {};
  } catch {
    parsed = {};
  }
  if (framed) {
    const v = typeof parsed.verdict === "string" ? parsed.verdict.trim().toUpperCase() : "";
    const verdict = v === "MET" || v === "UNMET" ? v : null;
    return {
      label: verdict === "MET" ? "contradicts" : verdict === "UNMET" ? "not_contradicted" : null,
      verdict,
      isClaim: null,
      passage: null,
      raw: verdict ? undefined : text.slice(0, 200),
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    };
  }
  const label =
    parsed.relation === "supports" || parsed.relation === "contradicts" || parsed.relation === "says_nothing"
      ? parsed.relation
      : null;
  return {
    label,
    isClaim: typeof parsed.is_claim === "boolean" ? parsed.is_claim : null,
    passage: parsed.passage ?? null,
    raw: label ? undefined : text.slice(0, 200),
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}

const started = Date.now();
await runPool(todo, Number(values.concurrency), async (pair) => {
  const corpus = await corpusFor(pair.pack);
  const [original, perturbed] = await Promise.all([
    ask(pair.motion, pair.original, evidenceText(selectPassages(corpus, pair.evidenceIds, pair.original, 3))),
    ask(
      pair.motion,
      pair.perturbed,
      evidenceText(selectPassages(corpus, pair.evidenceIds, pair.perturbed, 3)),
    ),
  ]);
  await appendFile(
    out,
    JSON.stringify({
      id: pair.id,
      judge: values.judge,
      framing: values.framing as "framed" | "sharp",
      original,
      perturbed,
    } satisfies LlmRow) + "\n",
  );
  n++;
  if (n % 50 === 0)
    console.log(
      `${n}/${todo.length}, in ${inputTokens} out ${outputTokens} tokens, ${((Date.now() - started) / 60000).toFixed(1)} min`,
    );
});
console.log(`done: ${n} pairs, ${inputTokens} input and ${outputTokens} output tokens of ${values.judge}`);

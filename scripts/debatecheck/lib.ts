import { CONTRADICTION_CRITERION } from "@/lib/jev/criterion";
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";
import { getKey } from "@/lib/credentials";
import { judgeModelId } from "@/lib/jev/judge";
import type { Passage } from "@/lib/debate/packs";
import { indexPassages } from "@/lib/debate/retrieve";
import { type Corpus } from "../analysis/common";

/**
 * DebateCheck: contrastive pairs mined from the blind debates. Each pair is a sentence the judge called
 * supported and the same sentence with one number altered, so the altered side is wrong by construction
 * and the evidence that was read in the debate is kept with it.
 */
export interface Pair {
  id: string;
  runId: string;
  pack: string;
  motion: string;
  model: string;
  side: "PRO" | "CON";
  turn: string;
  original: string;
  perturbed: string;
  kind: "year" | "percent" | "other";
  from: string;
  to: string;
  evidenceIds: string[];
  split: "train" | "test";
  debate: { isClaim: number; supported: number; contradicts: number };
}

// A number may carry thousands separators but never ends in a comma: `2009,` is 2009 and a comma.
const NUMBER = /\d(?:[\d,]*\d)?(?:\.\d+)?/g;

export interface Perturbation {
  text: string;
  kind: "year" | "percent" | "other";
  from: string;
  to: string;
}

/** Alters the first number of a sentence to one the evidence does not contain. Null when there is none. */
export function perturb(text: string, random: () => number, evidenceText: string): Perturbation | null {
  const matches = [...text.matchAll(NUMBER)].filter((m) => !/\[[PW]\d*$/.test(text.slice(0, m.index)));
  for (const match of matches) {
    const raw = match[0];
    const value = Number.parseFloat(raw.replaceAll(",", ""));
    if (!Number.isFinite(value)) continue;
    const start = match.index ?? 0;
    const after = text.slice(start + raw.length, start + raw.length + 12).toLowerCase();
    const isYear = /^(1[89]|20)\d\d$/.test(raw);
    const isPercent = /^\s*(percent|%|per cent|percentage)/.test(after);
    for (let attempt = 0; attempt < 6; attempt++) {
      let next: number;
      if (isYear) next = value + (random() < 0.5 ? -1 : 1) * (3 + Math.floor(random() * 5));
      else if (isPercent)
        next =
          value < 50
            ? Math.round(value * (1.6 + random() * 0.6))
            : Math.round(value * (0.45 + random() * 0.2));
      else next = Math.round(value * (1.9 + random() * 1.2) * 10) / 10;
      if (Number.isInteger(value)) next = Math.round(next);
      if (next === value || next <= 0) continue;
      let replacement = String(next);
      if (raw.includes(",")) replacement = next.toLocaleString("en-US");
      if (evidenceText.replaceAll(",", "").includes(replacement.replaceAll(",", ""))) continue;
      return {
        text: text.slice(0, start) + replacement + text.slice(start + raw.length),
        kind: isYear ? "year" : isPercent ? "percent" : "other",
        from: raw,
        to: replacement,
      };
    }
  }
  return null;
}

/** The criterion texts under test. `loose` is the debate's own wording; `sharp` names what a contradiction looks like. */
export const RELATION_QUESTION = "How does the `evidence` relate to `sentence`?";
export const LOOSE = {
  supports: "a passage states the claim or directly implies it is true",
  contradicts: "a passage states or directly implies the claim is false",
  says_nothing: "no passage addresses what the sentence asserts",
};
export const SHARP = {
  supports: "a passage states the claim or directly implies it is true",
  contradicts:
    "a passage gives a different number, date, name, place or outcome for the same thing `sentence` describes, or states the opposite",
  says_nothing: "no passage addresses what the sentence asserts",
};
export const DIRECT_QUESTION =
  "Does a passage in `evidence` give a different figure, date, name or outcome for what `sentence` asserts, or state the opposite of it?";
export const TWO_STEP = {
  same_subject:
    "Does a passage in `evidence` describe the same fact that `sentence` asserts, meaning the same entity, measure, event or source?",
  differs:
    "For that fact, does the `evidence` give a different figure, date, name or outcome than `sentence` does?",
};

export type VariantName = "loose20" | "sharp20" | "sharp3" | "direct3" | "twostep3" | "framed20" | "framed3";
export interface Variant {
  name: VariantName;
  top: number | null;
  form: "relation-loose" | "relation-sharp" | "direct" | "twostep" | "framed";
}
export const VARIANTS: Variant[] = [
  { name: "loose20", top: null, form: "relation-loose" },
  { name: "sharp20", top: null, form: "relation-sharp" },
  { name: "sharp3", top: 3, form: "relation-sharp" },
  { name: "direct3", top: 3, form: "direct" },
  { name: "twostep3", top: 3, form: "twostep" },
  { name: "framed20", top: null, form: "framed" },
  { name: "framed3", top: 3, form: "framed" },
];

/**
 * Autorubric's binary framing for a decision model (Rao and Callison-Burch, 2026), reproduced verbatim from
 * the library: the state carries the task as `input` and the text to grade as `submission`; the yes/no
 * question wraps the criterion in a fixed task sentence, and its outcomes carry the MET/UNMET definitions
 * of a negative (error-describing) criterion.
 */
// The framed criterion is the arena's own (lib/jev/criterion.ts), so the benchmark and the judge ask one question.
export const FRAMED = CONTRADICTION_CRITERION;

let client: TypeSafeClient | null = null;
function jev(): TypeSafeClient {
  if (client) return client;
  const apiKey = getKey("TYPESAFE_API_KEY");
  if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set.");
  client = new TypeSafeClient({ apiKey, timeout: 15_000, logLevel: "error" });
  return client;
}

/** The passages the judge reads: all the debate's twenty, or the `top` that match the sentence best by BM25. */
export function selectPassages(
  corpus: Corpus,
  evidenceIds: readonly string[],
  sentence: string,
  top: number | null,
): Passage[] {
  const all = evidenceIds.map((id) => corpus.passages.get(id)).filter((p): p is Passage => p !== undefined);
  if (top === null) return all;
  const matched = indexPassages(all).search(sentence, top);
  return matched.length > 0 ? matched : all.slice(0, top);
}

export const evidenceText = (passages: readonly Passage[]) =>
  passages.map((p) => `${p.id}| ${p.text}`).join("\n");

export interface JevAnswer {
  /** Probability that the evidence contradicts the sentence under this variant. */
  contradicts: number;
  supports: number | null;
  saysNothing: number | null;
  /** The two factors of the two-step form; null for the others. */
  sameSubject: number | null;
  differs: number | null;
  inputTokens: number;
}

/** One Jev request for one sentence under one criterion text. `contradictsText` overrides the sharp description. */
export async function askJev(
  motion: string,
  sentence: string,
  passages: readonly Passage[],
  form: Variant["form"],
  contradictsText?: string,
): Promise<JevAnswer> {
  const state = { motion, sentence, evidence: evidenceText(passages) };
  const model = judgeModelId();
  if (form === "framed") {
    const framedState = {
      input: `Motion under debate: ${motion}\n\nEvidence passages (id| text):\n${evidenceText(passages)}`,
      submission: sentence,
    };
    const { answers, usage } = await jev().systemOne({
      state: framedState,
      questions: {
        met: noul(`${FRAMED.task} ${FRAMED.prefix}${contradictsText ?? FRAMED.criterion}`, {
          true: FRAMED.met,
          false: FRAMED.unmet,
        }),
      },
      model,
    });
    return {
      contradicts: answers.met.noul,
      supports: null,
      saysNothing: null,
      sameSubject: null,
      differs: null,
      inputTokens: usage.input_tokens,
    };
  }
  if (form === "direct") {
    const { answers, usage } = await jev().systemOne({
      state,
      questions: { differs: noul(contradictsText ?? DIRECT_QUESTION) },
      model,
    });
    return {
      contradicts: answers.differs.noul,
      supports: null,
      saysNothing: null,
      sameSubject: null,
      differs: answers.differs.noul,
      inputTokens: usage.input_tokens,
    };
  }
  if (form === "twostep") {
    const { answers, usage } = await jev().systemOne({
      state,
      questions: {
        same_subject: noul(TWO_STEP.same_subject),
        differs: noul(contradictsText ?? TWO_STEP.differs),
      },
      model,
    });
    const same = answers.same_subject.noul;
    const differs = answers.differs.noul;
    return {
      contradicts: same * differs,
      supports: null,
      saysNothing: null,
      sameSubject: same,
      differs,
      inputTokens: usage.input_tokens,
    };
  }
  const options =
    form === "relation-loose" ? LOOSE : { ...SHARP, contradicts: contradictsText ?? SHARP.contradicts };
  const { answers, usage } = await jev().systemOne({
    state,
    questions: { relation: choice(RELATION_QUESTION, options) },
    model,
  });
  const p = answers.relation.probabilities;
  return {
    contradicts: p.contradicts,
    supports: p.supports,
    saysNothing: p.says_nothing,
    sameSubject: null,
    differs: null,
    inputTokens: usage.input_tokens,
  };
}

/** Lines of a JSONL file as objects, or an empty list when the file is missing. */
export async function readJsonl<T>(file: string): Promise<T[]> {
  const { readFile } = await import("node:fs/promises");
  const text = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return "";
    throw error;
  });
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as T);
}

export const TRAIN_PACKS = ["nuclear-power", "sugar-tax", "congestion-pricing", "four-day-week"];
export const TEST_PACKS = ["crewed-spaceflight", "rent-control"];

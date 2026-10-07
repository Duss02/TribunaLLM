import { APIError, type EntryType, type Questions, TypeSafeClient } from "@typesafe-ai/sdk";
import { getKey } from "@/lib/credentials";
import { MissingKeyError } from "@/lib/errors";
import { isMockMode } from "@/lib/mock-mode";
import { createLimiter } from "./limiter";
import { mockFinalAnswers, mockSentenceAnswers, mockTurnAnswers } from "./mock";
import { finalQuestions, sentenceQuestions, turnQuestions } from "./questions";
import type {
  CallStats,
  FinalInput,
  FinalJudgment,
  RawFinalAnswers,
  RawSentenceAnswers,
  RawTurnAnswers,
  SentenceInput,
  SentenceJudgment,
  TurnInput,
  TurnJudgment,
} from "./types";
import { verdictFor } from "./verdict";

export const DEFAULT_JUDGE_MODEL = "jev-1.13.0";

const INPUT_USD_PER_TOKEN = 0.042 / 1_000_000;
// Jev allows 80 req/s; eight in flight keeps a long debate well under it.
const limit = createLimiter(8);

export function judgeModelId(): string {
  return isMockMode() ? "jev-mock" : process.env.TYPESAFE_MODEL || DEFAULT_JUDGE_MODEL;
}

/** Why the judge cannot run, or null when it can. Says which variable to set. */
export function judgeSetupProblem(): string | null {
  if (isMockMode() || getKey("TYPESAFE_API_KEY")) return null;
  return "TYPESAFE_API_KEY is not set. Get a key at https://api.typesafe.ai and add it on the Settings page or in .env.local, or run with JEV_MOCK=1.";
}

/** A rejected or missing key will fail every call, so it ends the debate instead of leaving sentences unjudged. */
export function isFatalJudgeError(error: unknown): boolean {
  return (
    error instanceof MissingKeyError ||
    (error instanceof APIError && (error.status === 401 || error.status === 403))
  );
}

function createClient(): TypeSafeClient {
  const apiKey = getKey("TYPESAFE_API_KEY");
  if (!apiKey) {
    throw new MissingKeyError(
      "TYPESAFE_API_KEY",
      "Get a key at https://api.typesafe.ai and put it in .env.local, or run with JEV_MOCK=1.",
    );
  }
  return new TypeSafeClient({ apiKey, timeout: 15_000, logLevel: "error" });
}

async function ask<const Q extends Questions>(
  state: EntryType,
  questions: Q,
  signal: AbortSignal | undefined,
) {
  return limit(async () => {
    signal?.throwIfAborted();
    const client = createClient();
    const started = performance.now();
    const { answers, usage } = await client.systemOne(
      { state, questions, model: judgeModelId() },
      { signal },
    );
    return {
      answers,
      latencyMs: Math.round(performance.now() - started),
      inputTokens: usage.input_tokens,
    };
  });
}

function stats(raw: { latencyMs: number; inputTokens: number }): CallStats {
  return {
    latencyMs: raw.latencyMs,
    inputTokens: raw.inputTokens,
    costUsd: raw.inputTokens * INPUT_USD_PER_TOKEN,
  };
}

async function sentenceAnswers(input: SentenceInput): Promise<RawSentenceAnswers> {
  if (isMockMode()) return mockSentenceAnswers(input);
  const state = {
    motion: input.motion,
    side: input.side,
    sentence: input.sentence,
    evidence: input.evidence.text,
  };
  const { answers, latencyMs, inputTokens } = await ask(
    state,
    sentenceQuestions(input.evidence.ids),
    input.signal,
  );
  return {
    isClaim: answers.is_claim.noul,
    supported: answers.supported.noul,
    contradicts: answers.relation.probabilities.contradicts,
    onMotion: answers.on_motion.noul,
    which: answers.which.choice,
    latencyMs,
    inputTokens,
  };
}

export async function judgeSentence(input: SentenceInput): Promise<SentenceJudgment> {
  const raw = await sentenceAnswers(input);
  return {
    verdict: verdictFor(raw),
    isClaim: raw.isClaim,
    supported: raw.supported,
    contradicts: raw.contradicts,
    onMotion: raw.onMotion,
    passage: raw.which === "none" ? null : raw.which,
    ...stats(raw),
  };
}

async function turnAnswers(input: TurnInput): Promise<RawTurnAnswers> {
  if (isMockMode()) return mockTurnAnswers(input);
  const state = {
    motion: input.motion,
    side: input.side,
    turn: input.turn,
    opponentTurn: input.opponentTurn,
    evidence: input.evidence.text,
  };
  const withRebuts = input.opponentTurn !== null;
  const { answers, latencyMs, inputTokens } = await ask(state, turnQuestions(withRebuts), input.signal);
  return {
    rebuts: withRebuts && "rebuts" in answers ? answers.rebuts.noul : null,
    onMotion: answers.on_motion.noul,
    evidenceUse: answers.evidence_use.score,
    latencyMs,
    inputTokens,
  };
}

export async function judgeTurn(input: TurnInput): Promise<TurnJudgment> {
  const raw = await turnAnswers(input);
  return {
    rebuts: raw.rebuts,
    onMotion: raw.onMotion,
    evidenceUse: raw.evidenceUse,
    ...stats(raw),
  };
}

async function finalAnswers(input: FinalInput): Promise<RawFinalAnswers> {
  if (isMockMode()) return mockFinalAnswers(input);
  const state = {
    motion: input.motion,
    transcriptPro: input.transcriptPro,
    transcriptCon: input.transcriptCon,
  };
  const { answers, latencyMs, inputTokens } = await ask(state, finalQuestions(), input.signal);
  const { PRO, CON, tie } = answers.verdict.probabilities;
  return { pro: PRO, con: CON, tie, latencyMs, inputTokens };
}

export async function judgeFinal(input: FinalInput): Promise<FinalJudgment> {
  const raw = await finalAnswers(input);
  return { pro: raw.pro, con: raw.con, tie: raw.tie, ...stats(raw) };
}

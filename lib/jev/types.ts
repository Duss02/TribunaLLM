import type { DebateMode } from "@/lib/debate/mode";
import type { Side } from "@/lib/side";
import type { Verdict } from "./verdict";

export interface Evidence {
  /** Lines of the form `P07| text`, already in the order the judge will see them. */
  text: string;
  /** Passage ids in the same order as `text`. */
  ids: readonly string[];
}

export interface SentenceInput {
  motion: string;
  side: Side;
  sentence: string;
  evidence: Evidence;
  /** Decides what a claim the evidence is silent on becomes. Evidence mode when absent. */
  mode?: DebateMode;
  signal?: AbortSignal;
}

export interface TurnInput {
  motion: string;
  side: Side;
  turn: string;
  /** The opponent's previous turn, absent when this side opens the debate. */
  opponentTurn: string | null;
  evidence: Evidence;
  mode?: DebateMode;
  signal?: AbortSignal;
}

export interface FinalInput {
  motion: string;
  transcriptPro: string;
  transcriptCon: string;
  mode?: DebateMode;
  signal?: AbortSignal;
}

export interface CallStats {
  latencyMs: number;
  inputTokens: number;
  costUsd: number;
}

export interface SentenceJudgment extends CallStats {
  verdict: Verdict;
  isClaim: number;
  supported: number;
  contradicts: number;
  onMotion: number;
  /** Best supporting passage id, or null when the judge picked none. */
  passage: string | null;
}

export interface TurnJudgment extends CallStats {
  rebuts: number | null;
  onMotion: number;
  evidenceUse: number;
}

export interface FinalJudgment extends CallStats {
  pro: number;
  con: number;
  tie: number;
}

/** What a Jev call (real or mock) hands back before it is mapped to a judgment. */
export interface RawSentenceAnswers {
  isClaim: number;
  supported: number;
  contradicts: number;
  onMotion: number;
  which: string;
  latencyMs: number;
  inputTokens: number;
}

export interface RawTurnAnswers {
  rebuts: number | null;
  onMotion: number;
  evidenceUse: number;
  latencyMs: number;
  inputTokens: number;
}

export interface RawFinalAnswers {
  pro: number;
  con: number;
  tie: number;
  latencyMs: number;
  inputTokens: number;
}

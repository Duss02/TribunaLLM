import type { DebateMode } from "@/lib/debate/mode";
import { THRESHOLDS } from "@/lib/scoring/rules";

/**
 * `unverified` exists only in blind mode: a claim the judge's library neither supports nor contradicts.
 * The debater never saw the library, so silence there is not held against it.
 */
export type Verdict = "opinion" | "contradicted" | "supported" | "unsupported" | "uncertain" | "unverified";

/** A verdict, or `unjudged` when the Jev call for that sentence failed. */
export type JudgedVerdict = Verdict | "unjudged";

export interface SentenceProbabilities {
  isClaim: number;
  supported: number;
  /** p(contradicts) of the relation question; decides only when `contradicted` is absent (pilot data). */
  contradicts: number;
  /** p(MET) of the framed contradiction criterion, the certified question (rules v2). */
  contradicted?: number;
}

export function verdictFor(
  { isClaim, supported, contradicts, contradicted }: SentenceProbabilities,
  mode: DebateMode = "evidence",
): Verdict {
  if (isClaim < THRESHOLDS.claim) return "opinion";
  if ((contradicted ?? contradicts) >= THRESHOLDS.contradicted) return "contradicted";
  if (supported >= THRESHOLDS.supported) return "supported";
  if (mode === "blind") return "unverified";
  if (supported <= THRESHOLDS.unsupported) return "unsupported";
  return "uncertain";
}

export function isRetracted(verdict: JudgedVerdict): boolean {
  return verdict === "contradicted" || verdict === "unsupported";
}

import { THRESHOLDS } from "@/lib/scoring/rules";

export type Verdict = "opinion" | "contradicted" | "supported" | "unsupported" | "uncertain";

/** A verdict, or `unjudged` when the Jev call for that sentence failed. */
export type JudgedVerdict = Verdict | "unjudged";

export interface SentenceProbabilities {
  isClaim: number;
  supported: number;
  contradicts: number;
}

export function verdictFor({ isClaim, supported, contradicts }: SentenceProbabilities): Verdict {
  if (isClaim < THRESHOLDS.claim) return "opinion";
  if (contradicts >= THRESHOLDS.contradicted) return "contradicted";
  if (supported >= THRESHOLDS.supported) return "supported";
  if (supported <= THRESHOLDS.unsupported) return "unsupported";
  return "uncertain";
}

export function isRetracted(verdict: JudgedVerdict): boolean {
  return verdict === "contradicted" || verdict === "unsupported";
}

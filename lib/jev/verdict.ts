import { THRESHOLDS } from "@/lib/scoring/rules";

export type Verdict = "opinion" | "contradicted" | "supported" | "unsupported" | "uncertain";

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

export function isRetracted(verdict: Verdict): boolean {
  return verdict === "contradicted" || verdict === "unsupported";
}

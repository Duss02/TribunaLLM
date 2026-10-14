import { noul } from "@typesafe-ai/sdk";

/**
 * The contradiction criterion the arena strikes sentences with, posed in Autorubric's binary framing
 * (Rao and Callison-Burch, 2026): a task sentence, the criterion as a statement about the submission, and
 * the two verdicts as outcomes. DebateCheck certified it for Jev: over the twenty passages the arena reads
 * it catches 90% of altered numbers at 4.6% false alarms at the 0.7 threshold on held-out motions
 * (bench/debatecheck/STUDY.md), against 5% for the relation question the arena asked at first. The text
 * is shared with scripts/debatecheck/lib.ts so the benchmark and the arena ask the same question.
 */
export const CONTRADICTION_CRITERION = {
  task: "Determine whether this criterion is satisfied by the `submission`.",
  prefix: "Criterion: ",
  criterion:
    "A passage in the evidence gives a different number, date, name, place or outcome for the same thing the sentence describes, or states the opposite.",
  met: "The submission advocates, states, or recommends the problematic thing",
  unmet: "The submission does NOT make this error, OR mentions it only to warn against it",
} as const;

/** The state the framed question reads: the motion and the passages as `input`, the sentence as `submission`. */
export function contradictionState(motion: string, evidenceText: string, sentence: string) {
  return {
    input: `Motion under debate: ${motion}\n\nEvidence passages (id| text):\n${evidenceText}`,
    submission: sentence,
  };
}

export function contradictionQuestions() {
  const c = CONTRADICTION_CRITERION;
  return { met: noul(`${c.task} ${c.prefix}${c.criterion}`, { true: c.met, false: c.unmet }) };
}

import { choice, noul, score } from "@typesafe-ai/sdk";
import type { DebateMode } from "@/lib/debate/mode";

export function sentenceQuestions(passageIds: readonly string[]) {
  const which: Record<string, string | null> = {};
  for (const id of passageIds) which[id] = null;
  which.none = "No passage supports it";

  return {
    is_claim: noul(
      "Does `sentence` assert a checkable fact about the world (numbers, events, causes), rather than an opinion, value judgment, question, or rhetorical framing?",
    ),
    supported: noul("Is `sentence` supported by the `evidence`?", {
      true: "a passage states it or directly implies it",
      false: "no passage addresses it, or a passage contradicts it",
    }),
    relation: choice("How does the `evidence` relate to `sentence`?", {
      supports: "a passage states the claim or directly implies it is true",
      contradicts: "a passage states or directly implies the claim is false",
      says_nothing: "no passage addresses what the sentence asserts",
    }),
    which: choice("Which evidence passage best supports `sentence`?", which),
    on_motion: noul("Is `sentence` relevant to arguing for or against the `motion`?"),
  };
}

export function turnQuestions(withRebuts: boolean, mode: DebateMode = "evidence") {
  // In blind mode the debater never saw the evidence, so the question is whether its facts hold up, not whether it cited.
  const evidenceUse =
    mode === "blind"
      ? score("How well is `turn` built on specific, checkable facts that the `evidence` confirms?", [
          "vague or no facts",
          "some facts, loosely",
          "specific facts the evidence confirms",
        ])
      : score("How well does `turn` use the `evidence` to make its case?", [
          "ignores it",
          "mentions it loosely",
          "builds the argument on specific passages",
        ]);
  const questions = {
    on_motion: noul(
      "Is `turn` as a whole arguing for or against the `motion`, rather than drifting off topic?",
    ),
    evidence_use: evidenceUse,
  };
  if (!withRebuts) return questions;
  return {
    rebuts: noul("Does `turn` directly answer or undermine a specific point made in `opponentTurn`?"),
    ...questions,
  };
}

export function finalQuestions(mode: DebateMode = "evidence") {
  const question =
    mode === "blind"
      ? "Which side made the stronger and more factually sound case for its position?"
      : "Which side made the stronger evidence-backed case for its position?";
  return {
    verdict: choice(question, {
      PRO: null,
      CON: null,
      tie: "neither side is clearly stronger",
    }),
  };
}

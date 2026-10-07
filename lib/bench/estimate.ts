import { estimateTokens } from "@/lib/debate/packs";
import type { EvidencePack } from "@/lib/debate/packs";

const INPUT_USD_PER_TOKEN = 0.042 / 1_000_000;
// A round figure. Each result file records its real word and sentence counts.
const WORDS_PER_SENTENCE = 22;
const QUESTION_OVERHEAD_TOKENS = 450;
const WHICH_TOKENS_PER_PASSAGE = 4;

interface JudgeEstimate {
  calls: number;
  inputTokens: number;
  costUsd: number;
}

/** A rough upper-middle estimate of the Jev bill for one debate on this pack. Debater cost is not included. */
export function estimateJudgeCost(pack: EvidencePack, rounds: number, maxWords: number): JudgeEstimate {
  const evidenceTokens = estimateTokens(pack.passages.map((p) => `${p.id}| ${p.text}`).join("\n"));
  const perSentence = evidenceTokens + QUESTION_OVERHEAD_TOKENS + WHICH_TOKENS_PER_PASSAGE * pack.passages.length;
  const sentences = rounds * 2 * Math.ceil(maxWords / WORDS_PER_SENTENCE);
  const turns = rounds * 2;
  const perTurn = evidenceTokens + 2 * Math.ceil(maxWords * 1.4) + 200;
  const final = 2 * rounds * Math.ceil(maxWords * 1.4) + 150;
  const inputTokens = sentences * perSentence + turns * perTurn + final;
  return { calls: sentences + turns + 1, inputTokens, costUsd: inputTokens * INPUT_USD_PER_TOKEN };
}

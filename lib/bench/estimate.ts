import { type Library, libraryPassages } from "@/lib/debate/library";
import type { DebateMode } from "@/lib/debate/mode";
import { estimateTokens } from "@/lib/debate/packs";
import type { EvidencePack } from "@/lib/debate/packs";

const INPUT_USD_PER_TOKEN = 0.042 / 1_000_000;
// A round figure. Each result file records its real word and sentence counts.
const WORDS_PER_SENTENCE = 22;
const QUESTION_OVERHEAD_TOKENS = 450;
const WHICH_TOKENS_PER_PASSAGE = 4;
// Blind mode sends the best-matching passages, not the whole library (see the orchestrator).
const BLIND_PASSAGES_PER_SENTENCE = 20;
const BLIND_PASSAGES_PER_TURN = 30;

interface JudgeEstimate {
  calls: number;
  inputTokens: number;
  costUsd: number;
}

/** A rough upper-middle estimate of the Jev bill for one debate on this pack. Debater cost is not included. */
export function estimateJudgeCost(
  pack: EvidencePack,
  rounds: number,
  maxWords: number,
  mode: DebateMode = "evidence",
  library: Library | null = null,
): JudgeEstimate {
  const lines = (passages: { id: string; text: string }[]) => passages.map((p) => `${p.id}| ${p.text}`);
  let sentenceEvidence: number;
  let turnEvidence: number;
  let options: number;
  if (mode === "blind") {
    const corpus = lines([...pack.passages, ...libraryPassages(library)]);
    const average = estimateTokens(corpus.join("\n")) / Math.max(1, corpus.length);
    sentenceEvidence = average * Math.min(BLIND_PASSAGES_PER_SENTENCE, corpus.length);
    turnEvidence = average * Math.min(BLIND_PASSAGES_PER_TURN, corpus.length);
    options = Math.min(BLIND_PASSAGES_PER_SENTENCE, corpus.length);
  } else {
    sentenceEvidence = turnEvidence = estimateTokens(lines(pack.passages).join("\n"));
    options = pack.passages.length;
  }
  const perSentence = sentenceEvidence + QUESTION_OVERHEAD_TOKENS + WHICH_TOKENS_PER_PASSAGE * options;
  const sentences = rounds * 2 * Math.ceil(maxWords / WORDS_PER_SENTENCE);
  const turns = rounds * 2;
  const perTurn = turnEvidence + 2 * Math.ceil(maxWords * 1.4) + 200;
  const final = 2 * rounds * Math.ceil(maxWords * 1.4) + 150;
  const inputTokens = sentences * perSentence + turns * perTurn + final;
  return {
    calls: sentences + turns + 1,
    inputTokens: Math.round(inputTokens),
    costUsd: inputTokens * INPUT_USD_PER_TOKEN,
  };
}

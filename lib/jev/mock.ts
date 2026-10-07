import { hashString, seededRandom } from "@/lib/random";
import type {
  FinalInput,
  RawFinalAnswers,
  RawSentenceAnswers,
  RawTurnAnswers,
  SentenceInput,
  TurnInput,
} from "./types";

const CITATION = /\[P\d+\]/g;
const NUMBER = /\d[\d,]*(?:\.\d+)?/g;

export function numbersIn(text: string): string[] {
  return (text.replace(CITATION, "").match(NUMBER) ?? []).map((n) => n.replaceAll(",", ""));
}

function passagesOf(evidenceText: string): Array<{ id: string; text: string }> {
  return evidenceText.split("\n").flatMap((line) => {
    const split = line.indexOf("| ");
    return split > 0 ? [{ id: line.slice(0, split), text: line.slice(split + 2) }] : [];
  });
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().match(/[a-z]{4,}/g) ?? []);
}

function bestPassage(sentence: string, evidenceText: string): string {
  const mine = words(sentence);
  let best = { id: "none", overlap: 2 };
  for (const passage of passagesOf(evidenceText)) {
    let overlap = 0;
    for (const word of words(passage.text)) if (mine.has(word)) overlap++;
    if (overlap > best.overlap) best = { id: passage.id, overlap };
  }
  return best.id;
}

function fakeLatency(random: () => number): number {
  return 90 + Math.floor(random() * 180);
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * Deterministic stand-in for Jev. Verdicts come from the text hash, steered by
 * one crude check: a number the evidence never mentions is a bad sign. It makes
 * the demo and the tournament runnable without a key; it is not a judge.
 */
export async function mockSentenceAnswers(input: SentenceInput): Promise<RawSentenceAnswers> {
  const random = seededRandom(hashString(`${input.side}|${input.sentence}`));
  const [u1, u2, u3] = [random(), random(), random()] as const;
  const latencyMs = fakeLatency(random);
  await sleep(latencyMs, input.signal);

  const numbers = numbersIn(input.sentence);
  const known = new Set(numbersIn(input.evidence.text));
  const looksFactual = numbers.length > 0 || /\[P\d+\]/.test(input.sentence);
  const invented = numbers.some((n) => !known.has(n));

  const isClaim = looksFactual ? 0.85 + 0.1 * u1 : 0.1 + 0.3 * u1;
  let supported = 0.3;
  let contradicts = 0.05;
  if (looksFactual && invented) {
    if (u2 < 0.5) contradicts = 0.82 + 0.15 * u3;
    else supported = 0.05 + 0.2 * u3;
  } else if (looksFactual) {
    supported = u2 < 0.12 ? 0.45 + 0.2 * u3 : 0.78 + 0.2 * u3;
  }

  return {
    isClaim,
    supported,
    contradicts,
    onMotion: 0.8 + 0.18 * u3,
    which: supported >= 0.7 ? bestPassage(input.sentence, input.evidence.text) : "none",
    latencyMs,
    inputTokens: Math.ceil((input.sentence.length + input.evidence.text.length) / 4),
  };
}

export async function mockTurnAnswers(input: TurnInput): Promise<RawTurnAnswers> {
  const random = seededRandom(hashString(`${input.side}|${input.turn}`));
  const latencyMs = fakeLatency(random);
  await sleep(latencyMs, input.signal);
  const citations = input.turn.match(CITATION)?.length ?? 0;
  return {
    rebuts: input.opponentTurn === null ? null : 0.45 + 0.5 * random(),
    onMotion: 0.85 + 0.12 * random(),
    evidenceUse: Math.min(2, 0.3 + 0.55 * citations + 0.2 * random()),
    latencyMs,
    inputTokens: Math.ceil((input.turn.length + input.evidence.text.length) / 4),
  };
}

export async function mockFinalAnswers(input: FinalInput): Promise<RawFinalAnswers> {
  const random = seededRandom(hashString(input.transcriptPro + input.transcriptCon));
  const latencyMs = fakeLatency(random);
  await sleep(latencyMs, input.signal);
  const cited = (text: string) => text.match(CITATION)?.length ?? 0;
  const lean = Math.max(-0.4, Math.min(0.4, (cited(input.transcriptPro) - cited(input.transcriptCon)) * 0.05));
  const tie = 0.08 + 0.1 * random();
  const pro = (1 - tie) * (0.5 + lean + 0.2 * (random() - 0.5));
  return {
    pro,
    con: 1 - tie - pro,
    tie,
    latencyMs,
    inputTokens: Math.ceil((input.transcriptPro.length + input.transcriptCon.length) / 4),
  };
}

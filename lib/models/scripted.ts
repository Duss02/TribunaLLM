import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { splitSentences } from "@/lib/debate/sentences";
import { hashString, seededRandom } from "@/lib/random";

const OPINIONS = {
  PRO: [
    "The record points one way here.",
    "That is a strong reason to support the motion.",
    "Nothing the other side has said changes that.",
  ],
  CON: [
    "The case for the motion is weaker than it sounds.",
    "That should give anyone pause.",
    "The other side leaves out what matters most.",
  ],
} as const;

interface PackSentence {
  passage: string;
  text: string;
}

function packSentences(prompt: string): PackSentence[] {
  const out: PackSentence[] = [];
  for (const match of prompt.matchAll(/^(P\d+)\| (.+)$/gm)) {
    const [, passage, text] = match;
    if (!passage || !text) continue;
    for (const sentence of splitSentences(text, { final: true }).sentences) {
      if (sentence.split(" ").length >= 5) out.push({ passage, text: sentence });
    }
  }
  return out;
}

function cite({ passage, text }: PackSentence): string {
  return text.replace(/([.!?])$/, ` [${passage}]$1`);
}

/** Replaces the first number with one the evidence does not contain. */
function inventNumber(text: string, known: Set<string>): string | null {
  const match = /\d[\d,]*(?:\.\d+)?/.exec(text);
  if (!match) return null;
  let value = Math.round(Number.parseFloat(match[0].replaceAll(",", "")) * 1.7) + 7;
  while (known.has(String(value))) value += 3;
  return text.replace(match[0], String(value));
}

function scriptTurn(prompt: string, name: string): string {
  const random = seededRandom(hashString(`${name}|${prompt}`));
  // Each scripted model has its own habit, so a mock tournament has something to rank.
  const inventRate = 0.08 + 0.3 * ((hashString(name) % 100) / 100);
  const side = /Your side: (PRO|CON)/.exec(prompt)?.[1] === "CON" ? "CON" : "PRO";
  const maxWords = Number(/at most (\d+) words/.exec(prompt)?.[1] ?? 110);
  const restarted = prompt.includes("The judge retracted this sentence");
  const pool = packSentences(prompt);
  const known = new Set(
    pool.flatMap((s) => s.text.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((n) => n.replaceAll(",", "")),
  );

  const sentences: string[] = [];
  let words = 0;
  const target = Math.min(maxWords * 0.75, restarted ? 30 : 90);
  while (words < target && pool.length > 0) {
    const pick = pool[Math.floor(random() * pool.length)];
    if (!pick) break;
    const invented = !restarted && random() < inventRate ? inventNumber(pick.text, known) : null;
    const sentence = cite({ ...pick, text: invented ?? pick.text });
    if (sentences.includes(sentence)) continue;
    sentences.push(sentence);
    words += sentence.split(" ").length;
    if (random() < 0.3) {
      const opinion = OPINIONS[side][Math.floor(random() * OPINIONS[side].length)] as string;
      sentences.push(opinion);
      words += opinion.split(" ").length;
    }
  }
  return sentences.join(" ");
}

function promptText(prompt: readonly { role: string; content: unknown }[]): string {
  return prompt
    .map(({ content }) =>
      typeof content === "string"
        ? content
        : (content as { type: string; text?: string }[]).map((part) => part.text ?? "").join(""),
    )
    .join("\n");
}

/** A debater that quotes the evidence pack, so the demo and the tournament run without keys. */
export function scriptedModel({ paced, name }: { paced: boolean; name: string }): MockLanguageModelV4 {
  return new MockLanguageModelV4({
    provider: "scripted",
    modelId: name,
    doStream: async ({ prompt }) => {
      const input = promptText(prompt);
      const text = scriptTurn(input, name);
      const pieces = text.match(/\S+\s*/g) ?? [];
      return {
        stream: simulateReadableStream({
          initialDelayInMs: paced ? 250 : 0,
          chunkDelayInMs: paced ? 38 : 0,
          chunks: [
            { type: "text-start", id: "t" },
            ...pieces.map((delta) => ({ type: "text-delta" as const, id: "t", delta })),
            { type: "text-end", id: "t" },
            {
              type: "finish",
              finishReason: { unified: "stop", raw: undefined },
              usage: {
                inputTokens: {
                  total: Math.ceil(input.length / 4),
                  noCache: Math.ceil(input.length / 4),
                  cacheRead: undefined,
                  cacheWrite: undefined,
                },
                outputTokens: {
                  total: Math.ceil(text.length / 4),
                  text: Math.ceil(text.length / 4),
                  reasoning: 0,
                },
              },
            },
          ],
        }),
      };
    },
  });
}

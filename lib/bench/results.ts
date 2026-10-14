import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { type DebateEvent, type FinalEvent, verdictKind } from "@/lib/debate/events";

const sideScore = z.object({ E: z.number(), A: z.number(), J: z.number(), T: z.number() });
const tokens = z.object({ input: z.number(), output: z.number(), reasoning: z.number() });
const counts = z.object({
  sentences: z.number(),
  claims: z.number(),
  supported: z.number(),
  unsupported: z.number(),
  contradicted: z.number(),
  uncertain: z.number(),
  opinions: z.number(),
  unverified: z.number().default(0),
  unjudged: z.number(),
});

const transcriptSentence = z.object({
  id: z.string(),
  text: z.string(),
  /** Null for a sentence dropped by a rewind before its verdict arrived. */
  verdict: verdictKind.nullable(),
  isClaim: z.number(),
  supported: z.number(),
  contradicts: z.number(),
  contradicted: z.number().default(0),
  passage: z.string().nullable(),
  /** What the judge read, as passage ids in the order it read them. */
  evidenceIds: z.array(z.string()),
  dropped: z.boolean(),
});

const transcriptTurn = z.object({
  id: z.string(),
  side: z.enum(["PRO", "CON"]),
  round: z.number().int(),
  model: z.string(),
  words: z.number(),
  truncated: z.boolean(),
  attempts: z.number(),
  tokens,
  sentences: z.array(transcriptSentence),
  judgment: z
    .object({ rebuts: z.number().nullable(), onMotion: z.number(), evidenceUse: z.number() })
    .nullable(),
});

/** What a result line records about where its text and verdicts came from. */
const provenance = z.object({
  PRO: z.object({ route: z.string(), modelId: z.string() }),
  CON: z.object({ route: z.string(), modelId: z.string() }),
  maxWords: z.number(),
  /** SHA-256 (first 16 hex digits) of the debater prompts, judge questions and scoring rules source files. */
  promptHash: z.string(),
  /** SHA-256 (first 16 hex digits) of the pack file. */
  packHash: z.string(),
  library: z.object({ builtAt: z.string(), passages: z.number() }).nullable(),
});

export type Transcript = z.infer<typeof transcriptTurn>[];
export type Provenance = z.infer<typeof provenance>;

const identity = {
  runId: z.string(),
  pack: z.string(),
  pro: z.string(),
  con: z.string(),
  repeat: z.number().int(),
  at: z.string(),
};

const okResult = z.object({
  status: z.literal("ok"),
  ...identity,
  rules: z.string(),
  mode: z.enum(["blind", "evidence"]).default("evidence"),
  judge: z.string(),
  seed: z.number(),
  rounds: z.number().int(),
  score: z.object({
    PRO: sideScore,
    CON: sideScore,
    weightedT: z.object({ PRO: z.number(), CON: z.number() }),
    winner: z.enum(["PRO", "CON", "draw"]),
    margin: z.number(),
  }),
  verdict: z.object({ pro: z.number(), con: z.number(), tie: z.number() }),
  counts: z.object({ PRO: counts, CON: counts }),
  words: z.object({ PRO: z.number(), CON: z.number() }),
  tokens: z.object({ PRO: tokens, CON: tokens }),
  judgeStats: z.object({
    calls: z.number(),
    inputTokens: z.number(),
    costUsd: z.number(),
    errors: z.number(),
    medianLatencyMs: z.number(),
  }),
  wallMs: z.number(),
  /** Absent in lines written before transcripts were recorded. */
  transcript: z.array(transcriptTurn).optional(),
  provenance: provenance.optional(),
});

const failedResult = z.object({ status: z.literal("failed"), ...identity, error: z.string() });

const resultLine = z.discriminatedUnion("status", [okResult, failedResult]);

export type OkResult = z.infer<typeof okResult>;
export type FailedResult = z.infer<typeof failedResult>;
export type ResultLine = z.infer<typeof resultLine>;

export interface DebateIdentity {
  runId: string;
  pack: string;
  pro: string;
  con: string;
  repeat: number;
}

export const debateKey = ({ pack, pro, con, repeat }: Pick<DebateIdentity, "pack" | "pro" | "con" | "repeat">) =>
  `${pack}|${pro}|${con}|${repeat}`;

/** The turns, sentences and verdicts of one debate, read back from its events. */
export function transcriptFrom(events: readonly DebateEvent[]): Transcript {
  const turns: Transcript = [];
  const byTurn = new Map<string, Transcript[number]>();
  const bySentence = new Map<string, Transcript[number]["sentences"][number]>();
  for (const event of events) {
    switch (event.type) {
      case "turn_start": {
        const turn: Transcript[number] = {
          id: event.turn,
          side: event.side,
          round: event.round,
          model: event.model,
          words: 0,
          truncated: false,
          attempts: 1,
          tokens: { input: 0, output: 0, reasoning: 0 },
          sentences: [],
          judgment: null,
        };
        turns.push(turn);
        byTurn.set(event.turn, turn);
        break;
      }
      case "sentence": {
        const sentence = {
          id: event.id,
          text: event.text,
          verdict: null,
          isClaim: 0,
          supported: 0,
          contradicted: 0,
          contradicts: 0,
          passage: null,
          evidenceIds: [] as string[],
          dropped: false,
        };
        byTurn.get(event.turn)?.sentences.push(sentence);
        bySentence.set(event.id, sentence);
        break;
      }
      case "verdict": {
        const sentence = bySentence.get(event.id);
        if (!sentence) break;
        sentence.verdict = event.verdict;
        sentence.isClaim = event.isClaim;
        sentence.supported = event.supported;
        sentence.contradicts = event.contradicts;
        sentence.contradicted = event.contradicted;
        sentence.passage = event.passage?.id ?? null;
        sentence.evidenceIds = event.evidenceIds;
        break;
      }
      case "rewind":
        for (const id of event.dropped) {
          const sentence = bySentence.get(id);
          if (sentence) sentence.dropped = true;
        }
        break;
      case "turn_verdict": {
        const turn = byTurn.get(event.turn);
        if (turn) turn.judgment = { rebuts: event.rebuts, onMotion: event.onMotion, evidenceUse: event.evidenceUse };
        break;
      }
      case "turn_end": {
        const turn = byTurn.get(event.turn);
        if (!turn) break;
        turn.words = event.words;
        turn.truncated = event.truncated;
        turn.attempts = event.attempts;
        turn.tokens = event.tokens;
        break;
      }
      default:
        break;
    }
  }
  return turns;
}

export function okResultFrom(
  identity: DebateIdentity,
  context: { rules: string; judge: string; seed: number; rounds: number },
  final: FinalEvent,
  record: { transcript?: Transcript; provenance?: Provenance } = {},
): OkResult {
  const { stats, score, verdict } = final;
  return {
    status: "ok",
    ...identity,
    at: new Date().toISOString(),
    ...context,
    mode: final.mode,
    score,
    verdict: { pro: verdict.pro, con: verdict.con, tie: verdict.tie },
    counts: { PRO: stats.PRO.counts, CON: stats.CON.counts },
    words: { PRO: stats.PRO.words, CON: stats.CON.words },
    tokens: { PRO: stats.PRO.tokens, CON: stats.CON.tokens },
    judgeStats: {
      calls: stats.judge.calls,
      inputTokens: stats.judge.inputTokens,
      costUsd: stats.judge.costUsd,
      errors: stats.judge.errors,
      medianLatencyMs: stats.judge.medianLatencyMs,
    },
    wallMs: stats.wallMs,
    ...record,
  };
}

export function failedResultFrom(identity: DebateIdentity, error: unknown): FailedResult {
  return {
    status: "failed",
    ...identity,
    at: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
  };
}

export function parseResultLines(text: string, file: string): ResultLine[] {
  return text
    .split("\n")
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line !== "")
    .map(({ line, number }) => {
      const parsed = resultLine.safeParse(safeJson(line));
      if (!parsed.success) throw new Error(`${file}:${number} is not a valid result line: ${parsed.error.issues[0]?.message}`);
      return parsed.data;
    });
}

function safeJson(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

export async function readResultsDirectory(directory: string): Promise<ResultLine[]> {
  const files = (await readdir(directory).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return [];
    throw error;
  }))
    .filter((file) => file.endsWith(".jsonl"))
    .sort();
  const perFile = await Promise.all(
    files.map(async (file) => parseResultLines(await readFile(path.join(directory, file), "utf8"), file)),
  );
  return perFile.flat();
}

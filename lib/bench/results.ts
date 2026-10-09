import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { FinalEvent } from "@/lib/debate/events";

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

export function okResultFrom(
  identity: DebateIdentity,
  context: { rules: string; judge: string; seed: number; rounds: number },
  final: FinalEvent,
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

import { z } from "zod";

const side = z.enum(["PRO", "CON"]);
const verdictKind = z.enum([
  "opinion",
  "contradicted",
  "supported",
  "unsupported",
  "uncertain",
  "unverified",
  "unjudged",
]);

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

const sideStats = z.object({ counts, words: z.number(), tokens });

export const debateEvent = z.discriminatedUnion("type", [
  z.object({ type: z.literal("turn_start"), turn: z.string(), side, round: z.number(), model: z.string() }),
  z.object({ type: z.literal("token"), turn: z.string(), text: z.string() }),
  z.object({
    type: z.literal("sentence"),
    id: z.string(),
    turn: z.string(),
    side,
    round: z.number(),
    index: z.number(),
    text: z.string(),
    /** Text after the last confirmed sentence: what is still being written. */
    rest: z.string(),
  }),
  z.object({
    type: z.literal("verdict"),
    id: z.string(),
    verdict: verdictKind,
    isClaim: z.number(),
    supported: z.number(),
    contradicts: z.number(),
    passage: z.object({ id: z.string(), text: z.string() }).nullable(),
    latencyMs: z.number(),
    inputTokens: z.number(),
    costUsd: z.number(),
  }),
  z.object({
    type: z.literal("turn_verdict"),
    turn: z.string(),
    side,
    round: z.number(),
    rebuts: z.number().nullable(),
    onMotion: z.number(),
    evidenceUse: z.number(),
    latencyMs: z.number(),
    costUsd: z.number(),
  }),
  z.object({ type: z.literal("score"), PRO: sideScore, CON: sideScore }),
  z.object({
    type: z.literal("rewind"),
    turn: z.string(),
    retracted: z.string(),
    dropped: z.array(z.string()),
    restarts: z.number(),
  }),
  z.object({
    type: z.literal("turn_end"),
    turn: z.string(),
    words: z.number(),
    truncated: z.boolean(),
    tokens,
  }),
  z.object({
    type: z.literal("final"),
    verdict: z.object({
      pro: z.number(),
      con: z.number(),
      tie: z.number(),
      latencyMs: z.number(),
      costUsd: z.number(),
    }),
    score: z.object({
      PRO: sideScore,
      CON: sideScore,
      weightedT: z.object({ PRO: z.number(), CON: z.number() }),
      winner: z.enum(["PRO", "CON", "draw"]),
      margin: z.number(),
    }),
    /** How the debate was run; absent in results written before blind mode existed. */
    mode: z.enum(["blind", "evidence"]).default("evidence"),
    stats: z.object({
      PRO: sideStats,
      CON: sideStats,
      judge: z.object({
        calls: z.number(),
        medianLatencyMs: z.number(),
        inputTokens: z.number(),
        costUsd: z.number(),
        errors: z.number(),
      }),
      wallMs: z.number(),
    }),
  }),
  z.object({ type: z.literal("error"), message: z.string() }),
]);

export type DebateEvent = z.infer<typeof debateEvent>;
export type FinalEvent = Extract<DebateEvent, { type: "final" }>;

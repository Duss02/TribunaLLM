import { z } from "zod";
import { hashString } from "@/lib/random";
import { mean, sum, wilsonInterval } from "@/lib/stats";
import { VENDORS } from "@/lib/models/registry";
import { type Game, ratingsWithInterval } from "./rating";
import type { OkResult } from "./results";

const nullableNumber = z.number().nullable();

const modelInfo = z.object({
  key: z.string(),
  label: z.string(),
  vendor: z.enum([...VENDORS, "unknown"]),
  openWeights: z.boolean(),
});

const modelRow = modelInfo.extend({
  rating: z.number(),
  ratingLow: z.number(),
  ratingHigh: z.number(),
  debates: z.number(),
  wins: z.number(),
  draws: z.number(),
  losses: z.number(),
  winRate: z.number(),
  claims: z.number(),
  retracted: z.number(),
  contradicted: z.number(),
  retractionRate: nullableNumber,
  retractionLow: nullableNumber,
  retractionHigh: nullableNumber,
  contradictionRate: nullableNumber,
  pointsPer100Sentences: nullableNumber,
  avgE: z.number(),
  avgA: z.number(),
  avgJ: z.number(),
  avgT: z.number(),
  wordsPerSentence: nullableNumber,
  tokensPerTurn: z.number(),
  reasoningTokensPerTurn: z.number(),
});

const extreme = z.object({ model: z.string(), retractionRate: z.number() }).nullable();

const packRow = z.object({
  pack: z.string(),
  debates: z.number(),
  claims: z.number(),
  retractionRate: nullableNumber,
  contradictionRate: nullableNumber,
  best: extreme,
  worst: extreme,
});

export const leaderboard = z.object({
  generatedAt: z.string(),
  judge: z.string(),
  rules: z.string(),
  mock: z.boolean(),
  debates: z.number(),
  failed: z.number(),
  rounds: z.array(z.number()),
  packs: z.array(z.string()),
  firstDebateAt: z.string(),
  lastDebateAt: z.string(),
  models: z.array(modelRow),
  headToHead: z.object({ models: z.array(z.string()), wins: z.array(z.array(z.number())) }),
  perPack: z.array(packRow),
});

export type ModelInfo = z.infer<typeof modelInfo>;
export type ModelRow = z.infer<typeof modelRow>;
export type PackRow = z.infer<typeof packRow>;
export type Leaderboard = z.infer<typeof leaderboard>;

/** A pack-level best or worst needs this many claims from a model to mean anything. */
const MIN_CLAIMS_FOR_EXTREMES = 10;

const rate = (part: number, whole: number) => (whole === 0 ? null : part / whole);

export function selectComparable(
  results: readonly OkResult[],
  choice: { judge?: string; rules?: string; rounds?: number },
): OkResult[] {
  const combos = [...new Set(results.map((r) => `${r.judge} / ${r.rules}`))];
  const wanted = results.filter(
    (r) =>
      (!choice.judge || r.judge === choice.judge) &&
      (!choice.rules || r.rules === choice.rules) &&
      (choice.rounds === undefined || r.rounds === choice.rounds),
  );
  const chosen = [...new Set(wanted.map((r) => `${r.judge} / ${r.rules}`))];
  if (chosen.length > 1) {
    throw new Error(
      `Results mix judge and rules versions (${combos.join(", ")}). Ratings from different judges are not comparable. Pass --judge and --rules to pick one.`,
    );
  }
  // Points per debate grow with the number of turns, so a 1-round debate and a 3-round one do not rank together.
  const lengths = [...new Set(wanted.map((r) => r.rounds))].sort((a, b) => a - b);
  if (lengths.length > 1) {
    throw new Error(
      `Results mix debates of ${lengths.join(" and ")} rounds. Points per debate are not comparable across lengths. Pass --rounds to pick one.`,
    );
  }
  return wanted;
}

function sideOf(result: OkResult, model: string) {
  const side = result.pro === model ? "PRO" : "CON";
  return { side, counts: result.counts[side], score: result.score[side], words: result.words[side], tokens: result.tokens[side] } as const;
}

export function buildLeaderboard(input: {
  results: readonly OkResult[];
  failed: number;
  describe: (key: string) => ModelInfo;
  generatedAt: string;
}): Leaderboard {
  const { results } = input;
  if (results.length === 0) throw new Error("There are no completed debates to rank.");

  const keys = [...new Set(results.flatMap((r) => [r.pro, r.con]))].sort();
  const games: Game[] = results.flatMap((r) => {
    if (r.score.winner === "draw") return [{ winner: r.pro, loser: r.con, draw: true }];
    return r.score.winner === "PRO" ? [{ winner: r.pro, loser: r.con }] : [{ winner: r.con, loser: r.pro }];
  });
  const ratings = ratingsWithInterval(keys, games, hashString(results.map((r) => r.runId + r.pack + r.pro).join("|")));

  const models = keys.map((key): ModelRow => {
    const played = results.filter((r) => r.pro === key || r.con === key);
    const sides = played.map((r) => sideOf(r, key));
    const wins = played.filter((r) => r.score.winner === sideOf(r, key).side).length;
    const draws = played.filter((r) => r.score.winner === "draw").length;
    const claims = sum(sides.map((s) => s.counts.claims));
    const retracted = sum(sides.map((s) => s.counts.unsupported + s.counts.contradicted));
    const contradicted = sum(sides.map((s) => s.counts.contradicted));
    const sentences = sum(sides.map((s) => s.counts.sentences));
    const turns = sum(played.map((r) => r.rounds));
    const interval = claims === 0 ? null : wilsonInterval(retracted, claims);
    const { rating, low, high } = ratings.get(key) as { rating: number; low: number; high: number };

    return {
      ...input.describe(key),
      rating,
      ratingLow: low,
      ratingHigh: high,
      debates: played.length,
      wins,
      draws,
      losses: played.length - wins - draws,
      winRate: (wins + draws / 2) / played.length,
      claims,
      retracted,
      contradicted,
      retractionRate: rate(retracted, claims),
      retractionLow: interval?.low ?? null,
      retractionHigh: interval?.high ?? null,
      contradictionRate: rate(contradicted, claims),
      pointsPer100Sentences: sentences === 0 ? null : (100 * sum(sides.map((s) => s.score.T))) / sentences,
      avgE: mean(sides.map((s) => s.score.E)),
      avgA: mean(sides.map((s) => s.score.A)),
      avgJ: mean(sides.map((s) => s.score.J)),
      avgT: mean(sides.map((s) => s.score.T)),
      wordsPerSentence: sentences === 0 ? null : sum(sides.map((s) => s.words)) / sentences,
      tokensPerTurn: sum(sides.map((s) => s.tokens.output)) / turns,
      reasoningTokensPerTurn: sum(sides.map((s) => s.tokens.reasoning)) / turns,
    };
  });
  models.sort((a, b) => b.rating - a.rating);

  const order = keys;
  const wins = order.map(() => order.map(() => 0));
  for (const r of results) {
    const p = order.indexOf(r.pro);
    const c = order.indexOf(r.con);
    if (r.score.winner === "PRO") wins[p]![c]! += 1;
    else if (r.score.winner === "CON") wins[c]![p]! += 1;
    else {
      wins[p]![c]! += 0.5;
      wins[c]![p]! += 0.5;
    }
  }
  const byRating = models.map((m) => m.key);
  const reordered = byRating.map((row) => byRating.map((col) => wins[order.indexOf(row)]![order.indexOf(col)]!));

  const packs = [...new Set(results.map((r) => r.pack))].sort();
  const perPack = packs.map((pack): PackRow => {
    const inPack = results.filter((r) => r.pack === pack);
    const perModel = keys.flatMap((key) => {
      const sides = inPack.filter((r) => r.pro === key || r.con === key).map((r) => sideOf(r, key));
      const claims = sum(sides.map((s) => s.counts.claims));
      const retracted = sum(sides.map((s) => s.counts.unsupported + s.counts.contradicted));
      return claims >= MIN_CLAIMS_FOR_EXTREMES ? [{ model: key, retractionRate: retracted / claims }] : [];
    });
    perModel.sort((a, b) => a.retractionRate - b.retractionRate);
    const all = inPack.flatMap((r) => [r.counts.PRO, r.counts.CON]);
    const claims = sum(all.map((c) => c.claims));
    return {
      pack,
      debates: inPack.length,
      claims,
      retractionRate: rate(sum(all.map((c) => c.unsupported + c.contradicted)), claims),
      contradictionRate: rate(sum(all.map((c) => c.contradicted)), claims),
      best: perModel[0] ?? null,
      worst: perModel.length > 1 ? (perModel.at(-1) ?? null) : null,
    };
  });

  const times = results.map((r) => r.at).sort();
  return {
    generatedAt: input.generatedAt,
    judge: results[0]!.judge,
    rules: results[0]!.rules,
    mock: results.some((r) => r.judge === "jev-mock"),
    debates: results.length,
    failed: input.failed,
    rounds: [...new Set(results.map((r) => r.rounds))].sort(),
    packs,
    firstDebateAt: times[0]!,
    lastDebateAt: times.at(-1)!,
    models,
    headToHead: { models: byRating, wins: reordered },
    perPack,
  };
}

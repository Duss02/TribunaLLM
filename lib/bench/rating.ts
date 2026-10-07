import { seededRandom } from "@/lib/random";

export interface Game {
  winner: string;
  loser: string;
  /** A draw counts half a win to each side. */
  draw?: boolean;
}

export interface Rating {
  rating: number;
  low: number;
  high: number;
}

const ELO_SCALE = 400 / Math.LN10;
const PRIOR_DRAW_WEIGHT = 0.25;
const BOOTSTRAP_RESAMPLES = 500;

/**
 * Bradley-Terry strengths by minorisation-maximisation, on the Elo scale with
 * the mean at 1500. A quarter of a draw against every other model keeps a
 * model that has never lost from running off to infinity.
 */
export function bradleyTerry(models: readonly string[], games: readonly Game[]): Map<string, number> {
  const index = new Map(models.map((model, i) => [model, i]));
  const n = models.length;
  const played = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  const wins = new Array<number>(n).fill(0);

  const record = (a: number, b: number, aWins: number, bWins: number) => {
    played[a]![b]! += aWins + bWins;
    played[b]![a]! += aWins + bWins;
    wins[a]! += aWins;
    wins[b]! += bWins;
  };

  for (const game of games) {
    const w = index.get(game.winner);
    const l = index.get(game.loser);
    if (w === undefined || l === undefined) continue;
    if (game.draw) record(w, l, 0.5, 0.5);
    else record(w, l, 1, 0);
  }
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) record(a, b, PRIOR_DRAW_WEIGHT / 2, PRIOR_DRAW_WEIGHT / 2);
  }

  let strength = new Array<number>(n).fill(1);
  for (let iteration = 0; iteration < 1000; iteration++) {
    const next = strength.map((s, i) => {
      let denominator = 0;
      for (let j = 0; j < n; j++) if (j !== i) denominator += played[i]![j]! / (s + strength[j]!);
      return denominator === 0 ? s : wins[i]! / denominator;
    });
    const geometricMean = Math.exp(next.reduce((sum, s) => sum + Math.log(s), 0) / n);
    const normalised = next.map((s) => s / geometricMean);
    const change = Math.max(...normalised.map((s, i) => Math.abs(Math.log(s / strength[i]!))));
    strength = normalised;
    if (change < 1e-10) break;
  }

  return new Map(models.map((model, i) => [model, 1500 + ELO_SCALE * Math.log(strength[i]!)]));
}

function percentile(sorted: readonly number[], p: number): number {
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return (sorted[lower] as number) + ((sorted[upper] as number) - (sorted[lower] as number)) * (position - lower);
}

/** Ratings with a 95 percent interval from resampling the games with replacement. */
export function ratingsWithInterval(
  models: readonly string[],
  games: readonly Game[],
  seed: number,
): Map<string, Rating> {
  const point = bradleyTerry(models, games);
  const random = seededRandom(seed);
  const samples = new Map(models.map((model) => [model, [] as number[]]));

  for (let i = 0; i < BOOTSTRAP_RESAMPLES; i++) {
    const resample = Array.from({ length: games.length }, () => games[Math.floor(random() * games.length)] as Game);
    for (const [model, rating] of bradleyTerry(models, resample)) samples.get(model)?.push(rating);
  }

  return new Map(
    models.map((model) => {
      const sorted = (samples.get(model) as number[]).sort((a, b) => a - b);
      const rating = point.get(model) as number;
      return [model, games.length === 0 ? { rating, low: rating, high: rating } : { rating, low: percentile(sorted, 0.025), high: percentile(sorted, 0.975) }];
    }),
  );
}

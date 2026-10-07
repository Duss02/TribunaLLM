import { describe, expect, it } from "vitest";
import { bradleyTerry, ratingsWithInterval, type Game } from "@/lib/bench/rating";

const wins = (winner: string, loser: string, times: number): Game[] =>
  Array.from({ length: times }, () => ({ winner, loser }));

describe("bradleyTerry", () => {
  it("centres ratings on 1500", () => {
    const ratings = bradleyTerry(
      ["a", "b", "c"],
      [...wins("a", "b", 3), ...wins("b", "c", 2), ...wins("a", "c", 4)],
    );
    const total = [...ratings.values()].reduce((s, r) => s + r, 0);
    expect(total / 3).toBeCloseTo(1500, 6);
  });

  it("rates equal records equally", () => {
    const ratings = bradleyTerry(["a", "b"], [...wins("a", "b", 5), ...wins("b", "a", 5)]);
    expect(ratings.get("a")).toBeCloseTo(ratings.get("b") as number, 6);
  });

  it("puts a 3 to 1 winner about 177 Elo points ahead, after the small prior", () => {
    // Odds are (3 + 0.125) / (1 + 0.125); 400 * log10(2.78) = 177.
    const ratings = bradleyTerry(["a", "b"], [...wins("a", "b", 3), ...wins("b", "a", 1)]);
    expect((ratings.get("a") as number) - (ratings.get("b") as number)).toBeCloseTo(177.2, 0);
  });

  it("orders a chain of wins", () => {
    const ratings = bradleyTerry(
      ["a", "b", "c"],
      [...wins("a", "b", 4), ...wins("b", "c", 4), ...wins("a", "c", 4)],
    );
    expect(ratings.get("a")).toBeGreaterThan(ratings.get("b") as number);
    expect(ratings.get("b")).toBeGreaterThan(ratings.get("c") as number);
  });

  it("stays finite for a model that never lost", () => {
    const ratings = bradleyTerry(["a", "b"], wins("a", "b", 10));
    expect(Number.isFinite(ratings.get("a"))).toBe(true);
  });

  it("counts a draw as half a win to each side", () => {
    const drawn = bradleyTerry(
      ["a", "b"],
      [
        { winner: "a", loser: "b", draw: true },
        { winner: "a", loser: "b" },
        { winner: "b", loser: "a" },
      ],
    );
    const even = bradleyTerry(["a", "b"], [...wins("a", "b", 1), ...wins("b", "a", 1)]);
    expect(drawn.get("a")).toBeCloseTo(even.get("a") as number, 6);
  });
});

describe("ratingsWithInterval", () => {
  const games = [...wins("a", "b", 12), ...wins("b", "a", 4)];

  it("brackets the point estimate", () => {
    const { rating, low, high } = ratingsWithInterval(["a", "b"], games, 1).get("a")!;
    expect(low).toBeLessThan(rating);
    expect(high).toBeGreaterThan(rating);
  });

  it("is wider with fewer games", () => {
    const small = ratingsWithInterval(["a", "b"], [...wins("a", "b", 3), ...wins("b", "a", 1)], 1).get("a")!;
    const large = ratingsWithInterval(["a", "b"], games, 1).get("a")!;
    expect(small.high - small.low).toBeGreaterThan(large.high - large.low);
  });

  it("gives the same interval for the same seed", () => {
    expect(ratingsWithInterval(["a", "b"], games, 9)).toEqual(ratingsWithInterval(["a", "b"], games, 9));
  });
});

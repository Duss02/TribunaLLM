import { describe, expect, it } from "vitest";
import { buildLeaderboard, selectComparable, type ModelInfo } from "@/lib/bench/leaderboard";
import { parseResultLines, type OkResult } from "@/lib/bench/results";

const counts = (claims: number, unsupported: number, contradicted: number, sentences = claims + 2) => ({
  sentences,
  claims,
  supported: claims - unsupported - contradicted,
  unsupported,
  contradicted,
  uncertain: 0,
  unverified: 0,
  opinions: sentences - claims,
  unjudged: 0,
});

const zeroTokens = { input: 100, output: 200, reasoning: 50 };

function debate(
  pack: string,
  pro: string,
  con: string,
  winner: "PRO" | "CON" | "draw",
  proCounts: ReturnType<typeof counts>,
  conCounts: ReturnType<typeof counts>,
  overrides: Partial<OkResult> = {},
): OkResult {
  const side = (T: number) => ({ E: T, A: 0, J: 0, T });
  return {
    status: "ok",
    mode: "evidence",
    runId: "r1",
    pack,
    pro,
    con,
    repeat: 1,
    at: "2026-10-07T10:00:00.000Z",
    rules: "rules-v1",
    judge: "jev-1.13.0",
    seed: 1,
    rounds: 3,
    score: {
      PRO: side(winner === "PRO" ? 5 : 1),
      CON: side(winner === "CON" ? 5 : 1),
      weightedT: { PRO: 0, CON: 0 },
      winner,
      margin: winner === "PRO" ? 4 : winner === "CON" ? -4 : 0,
    },
    verdict: { pro: 0.4, con: 0.4, tie: 0.2 },
    counts: { PRO: proCounts, CON: conCounts },
    words: { PRO: 300, CON: 300 },
    tokens: { PRO: zeroTokens, CON: zeroTokens },
    judgeStats: { calls: 30, inputTokens: 90000, costUsd: 0.004, errors: 0, medianLatencyMs: 180 },
    wallMs: 30000,
    ...overrides,
  };
}

const describe_ = (key: string): ModelInfo => ({
  key,
  label: key.toUpperCase(),
  vendor: "openai",
  openWeights: false,
});

describe("buildLeaderboard", () => {
  const results = [
    debate("p1", "a", "b", "PRO", counts(10, 1, 0), counts(10, 3, 2)),
    debate("p1", "b", "a", "CON", counts(10, 3, 1), counts(10, 0, 0)),
    debate("p2", "a", "b", "draw", counts(20, 2, 0), counts(20, 4, 4)),
  ];
  const board = buildLeaderboard({
    results,
    failed: 1,
    describe: describe_,
    generatedAt: "2026-10-08T00:00:00.000Z",
  });
  const row = (key: string) => board.models.find((m) => m.key === key)!;

  it("sums claims across both sides a model played and divides retractions by them", () => {
    // a: 10 claims (1 retracted) as PRO, 10 (0) as CON, 20 (2) as PRO.
    expect(row("a")).toMatchObject({ claims: 40, retracted: 3, contradicted: 0 });
    expect(row("a").retractionRate).toBeCloseTo(3 / 40);
    // b: 10 claims (3 unsupported + 2 contradicted), 10 (3 + 1), 20 (4 + 4).
    expect(row("b")).toMatchObject({ claims: 40, retracted: 17, contradicted: 7 });
    expect(row("b").retractionRate).toBeCloseTo(17 / 40);
    expect(row("b").contradictionRate).toBeCloseTo(7 / 40);
  });

  it("gives an interval around the retraction rate", () => {
    const b = row("b");
    expect(b.retractionLow!).toBeLessThan(b.retractionRate!);
    expect(b.retractionHigh!).toBeGreaterThan(b.retractionRate!);
  });

  it("counts wins, draws and losses and a draw as half a win", () => {
    expect(row("a")).toMatchObject({ debates: 3, wins: 2, draws: 1, losses: 0 });
    expect(row("a").winRate).toBeCloseTo(2.5 / 3);
    expect(row("b")).toMatchObject({ wins: 0, draws: 1, losses: 2 });
  });

  it("ranks the model that wins above the one that loses", () => {
    expect(board.models.map((m) => m.key)).toEqual(["a", "b"]);
    expect(row("a").rating).toBeGreaterThan(row("b").rating);
  });

  it("fills the head-to-head matrix by rating order, rows over columns", () => {
    expect(board.headToHead.models).toEqual(["a", "b"]);
    expect(board.headToHead.wins).toEqual([
      [0, 2.5],
      [0.5, 0],
    ]);
  });

  it("breaks results down by pack and names the best and worst model there", () => {
    const p1 = board.perPack.find((p) => p.pack === "p1")!;
    expect(p1.debates).toBe(2);
    expect(p1.claims).toBe(40);
    expect(p1.best?.model).toBe("a");
    expect(p1.worst?.model).toBe("b");
  });

  it("records what the run was", () => {
    expect(board).toMatchObject({
      judge: "jev-1.13.0",
      rules: "rules-v1",
      mock: false,
      debates: 3,
      failed: 1,
      rounds: [3],
      packs: ["p1", "p2"],
    });
  });

  it("flags results that came from the mock judge", () => {
    const mock = buildLeaderboard({
      results: results.map((r) => ({ ...r, judge: "jev-mock" })),
      failed: 0,
      describe: describe_,
      generatedAt: "x",
    });
    expect(mock.mock).toBe(true);
  });

  it("refuses to rank an empty set", () => {
    expect(() => buildLeaderboard({ results: [], failed: 0, describe: describe_, generatedAt: "x" })).toThrow(
      /no completed debates/,
    );
  });
});

describe("selectComparable", () => {
  const a = debate("p", "a", "b", "PRO", counts(5, 0, 0), counts(5, 0, 0));
  const b = { ...a, judge: "jev-1.14.0" };

  it("refuses to mix judge versions and says how to pick one", () => {
    expect(() => selectComparable([a, b], {})).toThrow(/Pass --judge and --rules/);
  });

  it("keeps one judge when asked", () => {
    expect(selectComparable([a, b], { judge: "jev-1.13.0" })).toEqual([a]);
  });
});

describe("parseResultLines", () => {
  it("reads ok and failed lines and skips blank ones", () => {
    const ok = debate("p", "a", "b", "PRO", counts(5, 0, 0), counts(5, 0, 0));
    const failed = {
      status: "failed",
      runId: "r1",
      pack: "p",
      pro: "a",
      con: "b",
      repeat: 1,
      at: "t",
      error: "timeout",
    };
    const lines = parseResultLines(`${JSON.stringify(ok)}\n\n${JSON.stringify(failed)}\n`, "r1.jsonl");
    expect(lines.map((l) => l.status)).toEqual(["ok", "failed"]);
  });

  it("names the file and line of a bad record", () => {
    expect(() => parseResultLines('{"status":"ok"}\n', "r1.jsonl")).toThrow(
      /r1\.jsonl:1 is not a valid result line/,
    );
    expect(() => parseResultLines("not json", "r2.jsonl")).toThrow(/r2\.jsonl:1/);
  });
});

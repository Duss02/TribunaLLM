import { describe, expect, it } from "vitest";
import type { DebateEvent } from "@/lib/debate/events";
import { type ArenaState, initialState, medianLatencyMs, reduceArena } from "@/lib/debate/view";

const play = (events: Array<DebateEvent | { type: "reset" }>): ArenaState =>
  events.reduce(reduceArena, initialState);

const turnStart: DebateEvent = { type: "turn_start", turn: "PRO-1", side: "PRO", round: 1, model: "Model A" };
const sentence = (index: number, text: string, rest = ""): DebateEvent => ({
  type: "sentence",
  id: `PRO-1-${index}`,
  turn: "PRO-1",
  side: "PRO",
  round: 1,
  index,
  text,
  rest,
});
const verdict = (
  index: number,
  kind: "supported" | "contradicted" | "unsupported" | "opinion",
  latencyMs = 100,
): DebateEvent => ({
  type: "verdict",
  id: `PRO-1-${index}`,
  verdict: kind,
  isClaim: 0.9,
  supported: 0.5,
  contradicts: 0,
  passage: kind === "supported" ? { id: "P02", text: "Passage two." } : null,
  latencyMs,
  inputTokens: 1000,
  costUsd: 0.00004,
});

describe("reduceArena", () => {
  it("shows text as it arrives and keeps only the unconfirmed tail as partial", () => {
    const state = play([
      { type: "reset" },
      turnStart,
      { type: "token", turn: "PRO-1", text: "Fares rose. Then " },
      sentence(1, "Fares rose.", "Then "),
      { type: "token", turn: "PRO-1", text: "they fell" },
    ]);
    expect(state.turns[0]?.sentences.map((s) => s.text)).toEqual(["Fares rose."]);
    expect(state.turns[0]?.partial).toBe("Then they fell");
  });

  it("restyles a sentence in place when its verdict arrives", () => {
    const state = play([{ type: "reset" }, turnStart, sentence(1, "Fares rose."), verdict(1, "supported")]);
    expect(state.turns[0]?.sentences[0]).toMatchObject({ status: "supported", passage: { id: "P02" } });
  });

  it("counts judged, retracted and contradicted sentences and takes the median latency", () => {
    const state = play([
      { type: "reset" },
      turnStart,
      sentence(1, "a."),
      sentence(2, "b."),
      sentence(3, "c."),
      sentence(4, "d."),
      verdict(1, "supported", 100),
      verdict(2, "contradicted", 300),
      verdict(3, "unsupported", 200),
      verdict(4, "opinion", 400),
    ]);
    expect(state).toMatchObject({ judged: 4, retracted: 2, contradicted: 1 });
    expect(medianLatencyMs(state)).toBe(250);
    expect(state.costUsd).toBeCloseTo(0.00016);
  });

  it("keeps the five most recent verdicts, newest first", () => {
    const events: DebateEvent[] = [turnStart];
    for (let i = 1; i <= 7; i++) events.push(sentence(i, `s${i}.`), verdict(i, "supported"));
    const state = play([{ type: "reset" }, ...events]);
    expect(state.recent.map((r) => r.id)).toEqual(["PRO-1-7", "PRO-1-6", "PRO-1-5", "PRO-1-4", "PRO-1-3"]);
  });

  it("on rewind drops the later sentences, keeps the retracted one struck, and notes it for the flash", () => {
    const state = play([
      { type: "reset" },
      turnStart,
      sentence(1, "Good."),
      sentence(2, "Invented 31 percent."),
      sentence(3, "Later."),
      verdict(2, "contradicted"),
      { type: "rewind", turn: "PRO-1", retracted: "PRO-1-2", dropped: ["PRO-1-3"], restarts: 1 },
    ]);
    expect(state.turns[0]?.sentences.map((s) => s.id)).toEqual(["PRO-1-1", "PRO-1-2"]);
    expect(state.turns[0]?.sentences[1]?.status).toBe("contradicted");
    expect(state.rewind).toEqual({ count: 1, text: "Invented 31 percent." });
  });

  it("finishes on final with the judge's own totals, and fails on error", () => {
    const final: DebateEvent = {
      type: "final",
      mode: "evidence",
      verdict: { pro: 0.6, con: 0.3, tie: 0.1, latencyMs: 100, costUsd: 0 },
      score: {
        PRO: { E: 3, A: 1, J: 0.9, T: 4.9 },
        CON: { E: 1, A: 0, J: -0.9, T: 0.1 },
        weightedT: { PRO: 4, CON: 1 },
        winner: "PRO",
        margin: 4.8,
      },
      stats: {
        PRO: {
          counts: {
            sentences: 5,
            claims: 4,
            supported: 3,
            unsupported: 0,
            contradicted: 0,
            uncertain: 1,
            unverified: 0,
            opinions: 1,
            unjudged: 0,
          },
          words: 90,
          tokens: { input: 1, output: 1, reasoning: 0 },
        },
        CON: {
          counts: {
            sentences: 5,
            claims: 4,
            supported: 1,
            unsupported: 0,
            contradicted: 0,
            uncertain: 3,
            unverified: 0,
            opinions: 1,
            unjudged: 0,
          },
          words: 90,
          tokens: { input: 1, output: 1, reasoning: 0 },
        },
        judge: { calls: 11, medianLatencyMs: 150, inputTokens: 5000, costUsd: 0.0021, errors: 0 },
        wallMs: 4000,
      },
    };
    const done = play([{ type: "reset" }, final]);
    expect(done.status).toBe("done");
    expect(done.costUsd).toBe(0.0021);
    expect(done.score?.PRO.T).toBe(4.9);

    const failed = play([{ type: "reset" }, { type: "error", message: "TYPESAFE_API_KEY is not set." }]);
    expect(failed).toMatchObject({ status: "error", error: "TYPESAFE_API_KEY is not set." });
  });
});

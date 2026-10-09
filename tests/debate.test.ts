import { simulateReadableStream } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type DebateEvent, type FinalEvent } from "@/lib/debate/events";
import { runDebate, type DebateConfig } from "@/lib/debate/orchestrator";
import { parsePack } from "@/lib/debate/packs";
import { type Debater, resolveDebater } from "@/lib/models/debater";
import { findEntry } from "@/lib/models/registry";
import { scriptedModel } from "@/lib/models/scripted";

const pack = parsePack(
  "ferries",
  `---
title: Harbour ferries
motion: The city should buy a second harbour ferry.
source: Written for tests
license: CC0-1.0
---

The harbour ferry carried 4,200 passengers a day in 2023, up from 3,100 a day in 2019.

A second ferry would cost 18 million euros to buy and 1.2 million euros a year to run.

Fares rose 8 percent in 2024, and the ferry still covered only 61 percent of its operating cost.

The existing ferry was out of service for 37 days in 2023 because of engine repairs.

A 2022 survey of 900 residents found that 54 percent supported a second ferry.

The bridge alternative would take 6 years to build and cost 240 million euros.

Waiting times at peak hours averaged 22 minutes in 2023.

The ferry produces 310 tonnes of carbon dioxide a year, according to the harbour authority.
`,
);

const baseConfig = (
  debaters: { pro: Debater; con: Debater },
  overrides: Partial<DebateConfig> = {},
): DebateConfig => ({
  pack,
  ...debaters,
  rounds: 2,
  maxWords: 80,
  strictMode: false,
  seed: 7,
  ...overrides,
});

async function collect(config: DebateConfig): Promise<DebateEvent[]> {
  const events: DebateEvent[] = [];
  for await (const event of runDebate(config)) events.push(event);
  return events;
}

const of = <T extends DebateEvent["type"]>(events: DebateEvent[], type: T) =>
  events.filter((event): event is Extract<DebateEvent, { type: T }> => event.type === type);

beforeEach(() => {
  vi.stubEnv("JEV_MOCK", "1");
  vi.stubEnv("TYPESAFE_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("a full debate", () => {
  let events: DebateEvent[];

  beforeAll(async () => {
    vi.stubEnv("JEV_MOCK", "1");
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const pro = await resolveDebater("claude-opus-5.5", { paced: false });
    const con = await resolveDebater("gpt-6.1-sol", { paced: false });
    events = await collect(baseConfig({ pro, con }));
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("plays the turns in order and ends with the final judgment", () => {
    expect(of(events, "turn_start").map((e) => e.turn)).toEqual(["PRO-1", "CON-1", "PRO-2", "CON-2"]);
    expect(of(events, "turn_end")).toHaveLength(4);
    expect(events.at(-1)?.type).toBe("final");
  });

  it("numbers sentences by side, round and position", () => {
    const ids = of(events, "sentence").map((e) => e.id);
    expect(ids[0]).toBe("PRO-1-1");
    expect(ids.every((id) => /^(PRO|CON)-[12]-\d+$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("streams the same text it splits into sentences", () => {
    for (const turn of ["PRO-1", "CON-1", "PRO-2", "CON-2"]) {
      const streamed = of(events, "token")
        .filter((e) => e.turn === turn)
        .map((e) => e.text)
        .join("")
        .replace(/\s+/g, " ")
        .trim();
      const sentences = of(events, "sentence")
        .filter((e) => e.turn === turn)
        .map((e) => e.text)
        .join(" ");
      expect(streamed).toBe(sentences);
    }
  });

  it("judges every sentence exactly once", () => {
    const sentenceIds = of(events, "sentence")
      .map((e) => e.id)
      .sort();
    const verdictIds = of(events, "verdict")
      .map((e) => e.id)
      .sort();
    expect(verdictIds).toEqual(sentenceIds);
  });

  it("shows a verdict after its sentence, and links supported claims to a real passage", () => {
    for (const verdict of of(events, "verdict")) {
      const sentenceAt = events.findIndex((e) => e.type === "sentence" && e.id === verdict.id);
      expect(sentenceAt).toBeGreaterThanOrEqual(0);
      expect(events.indexOf(verdict)).toBeGreaterThan(sentenceAt);
      if (verdict.verdict === "supported" && verdict.passage) {
        expect(pack.passages.find((p) => p.id === verdict.passage?.id)?.text).toBe(verdict.passage.text);
      }
    }
  });

  it("judges each turn, and asks about rebuttal only from round 2", () => {
    const turns = of(events, "turn_verdict");
    expect(turns).toHaveLength(4);
    for (const turn of turns) expect(turn.rebuts === null).toBe(turn.round === 1);
  });

  it("scores exactly as a reader recounts it from the verdicts", () => {
    const final = events.at(-1) as FinalEvent;
    const points = {
      supported: 1,
      unsupported: -1,
      contradicted: -2,
      uncertain: 0,
      unverified: 0,
      opinion: 0,
      unjudged: 0,
    };
    for (const side of ["PRO", "CON"] as const) {
      const evidence = of(events, "verdict")
        .filter((v) => v.id.startsWith(side))
        .reduce((total, v) => total + points[v.verdict], 0);
      expect(final.score[side].E).toBe(evidence);
      expect(final.score[side].T).toBeCloseTo(
        final.score[side].E + final.score[side].A + final.score[side].J,
      );
    }
    const lastScore = of(events, "score").at(-1);
    expect(lastScore?.PRO).toEqual(final.score.PRO);
  });

  it("reports counts and judge cost that add up", () => {
    const final = events.at(-1) as FinalEvent;
    const sentences = of(events, "sentence");
    expect(final.stats.PRO.counts.sentences + final.stats.CON.counts.sentences).toBe(sentences.length);
    expect(final.stats.judge.calls).toBe(sentences.length + 4 + 1);
    expect(final.stats.judge.costUsd).toBeGreaterThan(0);
    expect(final.stats.PRO.tokens.output).toBeGreaterThan(0);
  });

  it("names no model in anything the judge sees", async () => {
    const sentenceStates: unknown[] = [];
    vi.stubEnv("JEV_MOCK", "");
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      sentenceStates.push(JSON.parse(String(init.body)).state);
      return new Response("{}", { status: 422 });
    });
    const scripted = (key: string): Debater => ({
      entry: findEntry(key)!,
      route: "scripted",
      model: scriptedModel({ paced: false, name: key }),
    });
    await collect(
      baseConfig({ pro: scripted("claude-opus-5.5"), con: scripted("gpt-6.1-sol") }, { rounds: 1 }),
    ).catch(() => undefined);
    expect(sentenceStates.length).toBeGreaterThan(0);
    expect(JSON.stringify(sentenceStates)).not.toMatch(/claude|opus|gpt|anthropic|openai/i);
  });
});

/** A debater that says exactly what the test wants, and says `restart` if it is asked to continue after a retraction. */
function speaks(key: string, say: { first: string; restart: string; delayMs: number }): Debater {
  const usage = {
    inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
    outputTokens: { total: 20, text: 20, reasoning: 0 },
  };
  return {
    entry: findEntry(key)!,
    route: "scripted",
    model: new MockLanguageModelV4({
      doStream: async ({ prompt }) => {
        const text = JSON.stringify(prompt).includes("The judge retracted") ? say.restart : say.first;
        return {
          stream: simulateReadableStream({
            chunkDelayInMs: say.delayMs,
            chunks: [
              { type: "text-start", id: "t" },
              ...(text.match(/\S+\s*/g) ?? []).map((delta) => ({
                type: "text-delta" as const,
                id: "t",
                delta,
              })),
              { type: "text-end", id: "t" },
              { type: "finish", finishReason: { unified: "stop", raw: undefined }, usage },
            ],
          }),
        };
      },
    }),
  };
}

const invented = "A second ferry would cost 99 million euros to buy [P02].";
const first = [
  "The harbour ferry carried 4,200 passengers a day in 2023 [P01].",
  invented,
  "Waiting times at peak hours averaged 22 minutes in 2023 [P07].",
  "The ferry produces 310 tonnes of carbon dioxide a year [P08].",
  "Fares rose 8 percent in 2024 [P03].",
].join(" ");
const restart =
  "Waiting times at peak hours averaged 22 minutes in 2023 [P07]. Fares rose 8 percent in 2024 [P03].";

describe("strict mode", () => {
  it("rewinds a turn that is still streaming and keeps the retracted sentence on screen, struck", async () => {
    const pro = speaks("claude-opus-5.5", { first, restart, delayMs: 45 });
    const con = await resolveDebater("gpt-6.1-sol", { paced: false });
    const events = await collect(baseConfig({ pro, con }, { rounds: 1, strictMode: true }));

    const [rewind] = of(events, "rewind");
    expect(rewind).toMatchObject({ turn: "PRO-1", retracted: "PRO-1-2", restarts: 1 });
    const struck = of(events, "verdict").find((v) => v.id === "PRO-1-2");
    expect(["contradicted", "unsupported"]).toContain(struck?.verdict);

    for (const id of rewind?.dropped ?? []) {
      expect(of(events, "verdict").some((v) => v.id === id)).toBe(false);
    }
    const ids = of(events, "sentence").map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);

    const final = events.at(-1) as FinalEvent;
    const survivors = of(events, "verdict").filter(
      (v) => v.id.startsWith("PRO-1") && v.verdict !== "unjudged",
    );
    expect(final.stats.PRO.counts.sentences).toBe(survivors.length);
    expect(final.stats.PRO.counts.unsupported + final.stats.PRO.counts.contradicted).toBe(1);
  }, 30_000);

  it("restarts a turn at most twice", async () => {
    const stubborn = speaks("claude-opus-5.5", { first, restart: first, delayMs: 45 });
    const con = await resolveDebater("gpt-6.1-sol", { paced: false });
    const events = await collect(baseConfig({ pro: stubborn, con }, { rounds: 1, strictMode: true }));
    expect(of(events, "rewind").filter((r) => r.turn === "PRO-1").length).toBeLessThanOrEqual(2);
    expect(events.at(-1)?.type).toBe("final");
  }, 45_000);

  it("cannot rewind a turn that finished before the verdict arrived, but the retraction still costs points", async () => {
    const instant = speaks("claude-opus-5.5", { first, restart, delayMs: 0 });
    const con = await resolveDebater("gpt-6.1-sol", { paced: false });
    const events = await collect(baseConfig({ pro: instant, con }, { rounds: 1, strictMode: true }));
    expect(of(events, "rewind")).toHaveLength(0);
    const final = events.at(-1) as FinalEvent;
    expect(final.stats.PRO.counts.unsupported + final.stats.PRO.counts.contradicted).toBeGreaterThanOrEqual(
      1,
    );
    expect(final.score.PRO.E).toBeLessThan(final.stats.PRO.counts.supported);
  });

  it("never rewinds when strict mode is off", async () => {
    const pro = speaks("claude-opus-5.5", { first, restart, delayMs: 45 });
    const con = await resolveDebater("gpt-6.1-sol", { paced: false });
    const events = await collect(baseConfig({ pro, con }, { rounds: 1, strictMode: false }));
    expect(of(events, "rewind")).toHaveLength(0);
    expect(of(events, "sentence").filter((e) => e.turn === "PRO-1")).toHaveLength(5);
  }, 30_000);
});

describe("stopping early", () => {
  it("stops the whole debate when the reader walks away", async () => {
    const pro = await resolveDebater("claude-opus-5.5", { paced: true });
    const con = await resolveDebater("gpt-6.1-sol", { paced: true });
    const started = Date.now();
    for await (const event of runDebate(baseConfig({ pro, con }))) {
      if (event.type === "token") break;
    }
    expect(Date.now() - started).toBeLessThan(3_000);
  });
});

describe("when the judge fails", () => {
  const scripted = (key: string): Debater => ({
    entry: findEntry(key)!,
    route: "scripted",
    model: scriptedModel({ paced: false, name: key }),
  });

  beforeEach(() => {
    vi.stubEnv("JEV_MOCK", "");
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
  });

  it("stops at once when the key is rejected", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "bad key" }), { status: 401 }));
    const events: DebateEvent[] = [];
    const run = async () => {
      for await (const event of runDebate(
        baseConfig({ pro: scripted("claude-opus-5.5"), con: scripted("gpt-6.1-sol") }),
      )) {
        events.push(event);
      }
    };
    await expect(run()).rejects.toMatchObject({ status: 401 });
    expect(of(events, "final")).toHaveLength(0);
  });

  it("marks a sentence unjudged when one call is refused, and keeps going", async () => {
    vi.stubGlobal("fetch", async () => new Response(JSON.stringify({ error: "bad state" }), { status: 422 }));
    const events: DebateEvent[] = [];
    const run = async () => {
      for await (const event of runDebate(
        baseConfig({ pro: scripted("claude-opus-5.5"), con: scripted("gpt-6.1-sol") }, { rounds: 1 }),
      )) {
        events.push(event);
      }
    };
    await expect(run()).rejects.toMatchObject({ status: 422 });
    const verdicts = of(events, "verdict");
    expect(verdicts.length).toBeGreaterThan(0);
    expect(verdicts.every((v) => v.verdict === "unjudged")).toBe(true);
  });
});

describe("blind mode", () => {
  const library = {
    slug: "ferries",
    license: "CC0-1.0",
    builtAt: "2026-10-08T00:00:00.000Z",
    sources: [{ title: "Harbour ferry", url: "https://example.org/ferry", revision: 1 }],
    passages: [
      {
        id: "W0001",
        source: "Harbour ferry",
        text: "The old ferry was launched in 1987 and carries 300 people.",
      },
      { id: "W0002", source: "Harbour ferry", text: "A crossing takes 14 minutes in calm weather." },
    ],
  };

  it("gives debaters no evidence, never strikes a claim for silence and records the mode", async () => {
    const prompts: string[] = [];
    const recording = (key: string): Debater => {
      const debater = speaks(key, {
        first:
          "The old ferry was launched in 1987. It carries 777 people at once. A crossing takes 14 minutes.",
        restart: "",
        delayMs: 0,
      });
      const model = debater.model as MockLanguageModelV4;
      const stream = model.doStream.bind(model);
      model.doStream = async (options) => {
        prompts.push(JSON.stringify(options.prompt));
        return stream(options);
      };
      return debater;
    };
    const events = await collect(
      baseConfig(
        { pro: recording("claude-opus-5.5"), con: recording("gpt-6.1-sol") },
        { mode: "blind", library, rounds: 1 },
      ),
    );

    expect(prompts.length).toBeGreaterThan(0);
    for (const prompt of prompts) {
      expect(prompt).not.toContain("Evidence pack");
      expect(prompt).not.toContain("4,200 passengers");
    }
    expect(of(events, "verdict").some((e) => e.verdict === "unsupported" || e.verdict === "uncertain")).toBe(
      false,
    );
    const final = events.at(-1) as FinalEvent;
    expect(final.type).toBe("final");
    expect(final.mode).toBe("blind");
  });
});

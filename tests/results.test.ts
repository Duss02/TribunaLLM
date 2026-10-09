import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { okResultFrom, parseResultLines, transcriptFrom } from "@/lib/bench/results";
import type { DebateEvent, FinalEvent } from "@/lib/debate/events";
import { runDebate } from "@/lib/debate/orchestrator";
import { parsePack } from "@/lib/debate/packs";
import { resolveDebater } from "@/lib/models/debater";

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

Waiting times at peak hours averaged 22 minutes in 2023.
`,
);

beforeEach(() => {
  vi.stubEnv("JEV_MOCK", "1");
  vi.stubEnv("TYPESAFE_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

async function play(): Promise<DebateEvent[]> {
  const pro = await resolveDebater("claude-opus-5.5", { paced: false });
  const con = await resolveDebater("gpt-6.1-sol", { paced: false });
  const events: DebateEvent[] = [];
  for await (const event of runDebate({
    pack,
    pro,
    con,
    rounds: 2,
    maxWords: 60,
    strictMode: false,
    seed: 3,
  })) {
    events.push(event);
  }
  return events;
}

describe("transcriptFrom", () => {
  it("records every turn with its sentences, verdicts, evidence and turn judgment", async () => {
    const events = await play();
    const transcript = transcriptFrom(events);
    expect(transcript.map((t) => t.id)).toEqual(["PRO-1", "CON-1", "PRO-2", "CON-2"]);
    for (const turn of transcript) {
      expect(turn.sentences.length).toBeGreaterThan(0);
      expect(turn.words).toBeGreaterThan(0);
      expect(turn.attempts).toBe(1);
      expect(turn.judgment).not.toBeNull();
      for (const sentence of turn.sentences) {
        expect(sentence.verdict).not.toBeNull();
        expect(sentence.evidenceIds).toHaveLength(pack.passages.length);
        expect(sentence.dropped).toBe(false);
      }
    }
    expect(transcript[2]?.judgment?.rebuts).not.toBeNull();
    expect(transcript[0]?.judgment?.rebuts).toBeNull();
  });

  it("round-trips through a result line with its provenance", async () => {
    const events = await play();
    const final = events.at(-1) as FinalEvent;
    const line = okResultFrom(
      { runId: "r", pack: "ferries", pro: "claude-opus-5.5", con: "gpt-6.1-sol", repeat: 1 },
      { rules: "rules-v1", judge: "jev-mock", seed: 3, rounds: 2 },
      final,
      {
        transcript: transcriptFrom(events),
        provenance: {
          PRO: { route: "scripted", modelId: "claude-opus-5.5" },
          CON: { route: "scripted", modelId: "gpt-6.1-sol" },
          maxWords: 60,
          promptHash: "abc",
          packHash: "def",
          library: null,
        },
      },
    );
    const [parsed] = parseResultLines(`${JSON.stringify(line)}\n`, "r.jsonl");
    expect(parsed?.status).toBe("ok");
    if (parsed?.status !== "ok") return;
    expect(parsed.transcript).toHaveLength(4);
    expect(parsed.provenance?.PRO.modelId).toBe("claude-opus-5.5");
    const sentences = parsed.transcript!.flatMap((t) => t.sentences);
    expect(sentences.length).toBe(final.stats.PRO.counts.sentences + final.stats.CON.counts.sentences);
  });

  it("still reads a line written before transcripts existed", () => {
    const old = { ...JSON.parse(JSON.stringify(sample())), transcript: undefined, provenance: undefined };
    const [parsed] = parseResultLines(`${JSON.stringify(old)}\n`, "old.jsonl");
    expect(parsed?.status).toBe("ok");
    if (parsed?.status === "ok") expect(parsed.transcript).toBeUndefined();
  });
});

function sample() {
  const counts = {
    sentences: 3,
    claims: 2,
    supported: 2,
    unsupported: 0,
    contradicted: 0,
    uncertain: 0,
    opinions: 1,
    unverified: 0,
    unjudged: 0,
  };
  return {
    status: "ok",
    runId: "r",
    pack: "p",
    pro: "a",
    con: "b",
    repeat: 1,
    at: "t",
    rules: "rules-v1",
    judge: "jev-1.13.0",
    seed: 1,
    rounds: 3,
    score: {
      PRO: { E: 1, A: 0, J: 0, T: 1 },
      CON: { E: 0, A: 0, J: 0, T: 0 },
      weightedT: { PRO: 1, CON: 0 },
      winner: "PRO",
      margin: 1,
    },
    verdict: { pro: 0.5, con: 0.3, tie: 0.2 },
    counts: { PRO: counts, CON: counts },
    words: { PRO: 10, CON: 10 },
    tokens: { PRO: { input: 1, output: 1, reasoning: 0 }, CON: { input: 1, output: 1, reasoning: 0 } },
    judgeStats: { calls: 1, inputTokens: 1, costUsd: 0, errors: 0, medianLatencyMs: 1 },
    wallMs: 1,
  };
}

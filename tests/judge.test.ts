import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MissingKeyError } from "@/lib/errors";
import { judgeFinal, judgeSentence, judgeTurn } from "@/lib/jev/judge";
import type { Evidence } from "@/lib/jev/types";

const evidence: Evidence = {
  text: "P02| The ferry carried 4,200 passengers in 2023.\nP01| Fares rose 8 percent in 2024.",
  ids: ["P02", "P01"],
};

const noulAnswer = (noul: number) => ({ type: "noul", noul });
const choiceAnswer = (choice: string, probabilities: Record<string, number>) => ({
  type: "choice",
  choice,
  confidence: probabilities[choice],
  probabilities,
});

interface Captured {
  url: string;
  authorization: string | null;
  body: { state: Record<string, unknown>; model: string; questions: Record<string, unknown> };
}

function stubJev(answers: Record<string, unknown>, inputTokens = 1000): Captured[] {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({
      url,
      authorization: new Headers(init.headers).get("authorization"),
      body: JSON.parse(String(init.body)),
    });
    return new Response(
      JSON.stringify({ model: "jev-1.13.0", answers, usage: { input_tokens: inputTokens, output_tokens: 0 } }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  return calls;
}

beforeEach(() => {
  vi.stubEnv("TYPESAFE_API_KEY", "test-key");
  vi.stubEnv("JEV_MOCK", "");
  vi.stubEnv("TYPESAFE_MODEL", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("judgeSentence against the API", () => {
  const sentenceAnswers = (contradicts: number) => ({
    is_claim: noulAnswer(0.95),
    supported: noulAnswer(0.2),
    relation: choiceAnswer("contradicts", { supports: 0.1, contradicts, says_nothing: 0.9 - contradicts }),
    which: choiceAnswer("none", { P02: 0.05, P01: 0.05, none: 0.9 }),
    on_motion: noulAnswer(0.9),
  });

  it("sends one request with a pinned model, a blind state and all five questions", async () => {
    const calls = stubJev(sentenceAnswers(0.8));
    await judgeSentence({ motion: "m", side: "PRO", sentence: "Fares fell.", evidence });

    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.typesafe.ai/v1/systemone");
    expect(call?.authorization).toBe("Bearer test-key");
    expect(call?.body.model).toBe("jev-1.13.0");
    expect(call?.body.state).toEqual({
      motion: "m",
      side: "PRO",
      sentence: "Fares fell.",
      evidence: evidence.text,
    });
    expect(Object.keys(call?.body.questions ?? {})).toEqual([
      "is_claim",
      "supported",
      "relation",
      "which",
      "on_motion",
    ]);
  });

  it("offers the passages in the order given, then an explicit none", async () => {
    const calls = stubJev(sentenceAnswers(0.8));
    await judgeSentence({ motion: "m", side: "CON", sentence: "s", evidence });
    const which = calls[0]?.body.questions.which as { criteria: Record<string, unknown> };
    expect(Object.keys(which.criteria)).toEqual(["P02", "P01", "none"]);
  });

  it("maps a contradicting answer to a contradicted verdict and prices the call", async () => {
    stubJev(sentenceAnswers(0.8), 2_000_000);
    const judgment = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(judgment.verdict).toBe("contradicted");
    expect(judgment.passage).toBeNull();
    expect(judgment.costUsd).toBeCloseTo(0.084, 6);
  });

  it("returns the best passage when one supports the sentence", async () => {
    stubJev({
      ...sentenceAnswers(0.02),
      supported: noulAnswer(0.93),
      which: choiceAnswer("P02", { P02: 0.9, P01: 0.05, none: 0.05 }),
    });
    const judgment = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(judgment.verdict).toBe("supported");
    expect(judgment.passage).toBe("P02");
  });

  it("uses TYPESAFE_MODEL when set", async () => {
    vi.stubEnv("TYPESAFE_MODEL", "jev-1.14.0");
    const calls = stubJev(sentenceAnswers(0.8));
    await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(calls[0]?.body.model).toBe("jev-1.14.0");
  });

  it("names the variable to set when the key is missing", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const error = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(MissingKeyError);
    expect((error as MissingKeyError).message).toContain("TYPESAFE_API_KEY");
  });
});

describe("judgeTurn against the API", () => {
  const scoreAnswer = (score: number) => ({
    type: "score",
    score,
    confidence: 0.8,
    legend: {},
    probabilities: {},
  });

  it("asks about rebuttal only when there is an opponent turn", async () => {
    const calls = stubJev({
      rebuts: noulAnswer(0.9),
      on_motion: noulAnswer(0.95),
      evidence_use: scoreAnswer(1.7),
    });
    const withOpponent = await judgeTurn({
      motion: "m",
      side: "CON",
      turn: "t",
      opponentTurn: "o",
      evidence,
    });
    expect(Object.keys(calls[0]?.body.questions ?? {})).toContain("rebuts");
    expect(withOpponent.rebuts).toBe(0.9);
    expect(withOpponent.evidenceUse).toBe(1.7);

    const opening = await judgeTurn({ motion: "m", side: "PRO", turn: "t", opponentTurn: null, evidence });
    expect(Object.keys(calls[1]?.body.questions ?? {})).not.toContain("rebuts");
    expect(opening.rebuts).toBeNull();
  });
});

describe("judgeFinal against the API", () => {
  it("returns the three verdict probabilities", async () => {
    const calls = stubJev({
      verdict: choiceAnswer("PRO", { PRO: 0.7, CON: 0.2, tie: 0.1 }),
    });
    const final = await judgeFinal({ motion: "m", transcriptPro: "a", transcriptCon: "b" });
    expect(final).toMatchObject({ pro: 0.7, con: 0.2, tie: 0.1 });
    expect(calls[0]?.body.state).toEqual({ motion: "m", transcriptPro: "a", transcriptCon: "b" });
  });
});

describe("JEV_MOCK", () => {
  beforeEach(() => {
    vi.stubEnv("JEV_MOCK", "1");
    vi.stubEnv("TYPESAFE_API_KEY", "");
  });

  it("needs no key and makes no network call", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await judgeSentence({ motion: "m", side: "PRO", sentence: "Fares rose 8 percent in 2024.", evidence });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("gives the same verdict for the same sentence every time", async () => {
    const input = { motion: "m", side: "PRO", sentence: "Fares rose 8 percent in 2024 [P01].", evidence } as const;
    const first = await judgeSentence(input);
    const second = await judgeSentence(input);
    expect(second).toEqual(first);
  });

  it("supports a number the evidence contains and retracts one it does not", async () => {
    const grounded = await judgeSentence({
      motion: "m",
      side: "PRO",
      sentence: "Fares rose 8 percent in 2024 [P01].",
      evidence,
    });
    const invented = await judgeSentence({
      motion: "m",
      side: "PRO",
      sentence: "Fares rose 31 percent in 2024 [P01].",
      evidence,
    });
    expect(grounded.verdict).toBe("supported");
    expect(grounded.passage).toBe("P01");
    expect(["contradicted", "unsupported"]).toContain(invented.verdict);
  });

  it("calls a sentence without numbers or citations an opinion", async () => {
    const judgment = await judgeSentence({
      motion: "m",
      side: "CON",
      sentence: "Residents deserve better than this.",
      evidence,
    });
    expect(judgment.verdict).toBe("opinion");
  });
});

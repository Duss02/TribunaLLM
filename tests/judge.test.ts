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

/**
 * Answers every request with `answers`, except the framed contradiction request (the one whose only
 * question is `met`), which gets `framed` or, by default, the relation question's p(contradicts).
 */
function stubJev(answers: Record<string, unknown>, inputTokens = 1000, framed?: number): Captured[] {
  const calls: Captured[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body)) as Captured["body"];
    calls.push({ url, authorization: new Headers(init.headers).get("authorization"), body });
    const isFramed = Object.keys(body.questions).join() === "met";
    const relation = answers.relation as { probabilities?: { contradicts?: number } } | undefined;
    const reply = isFramed
      ? { met: noulAnswer(framed ?? relation?.probabilities?.contradicts ?? 0) }
      : answers;
    return new Response(
      JSON.stringify({
        model: "jev-1.13.0",
        answers: reply,
        usage: { input_tokens: inputTokens, output_tokens: 0 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  });
  return calls;
}
const relationCall = (calls: Captured[]) => calls.find((c) => "relation" in c.body.questions);
const framedCall = (calls: Captured[]) => calls.find((c) => Object.keys(c.body.questions).join() === "met");

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

  it("sends two requests with a pinned model: the five relation questions on a blind state, and the framed criterion", async () => {
    const calls = stubJev(sentenceAnswers(0.8));
    await judgeSentence({ motion: "m", side: "PRO", sentence: "Fares fell.", evidence });

    expect(calls).toHaveLength(2);
    const call = relationCall(calls);
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
    const framed = framedCall(calls);
    expect(framed?.body.model).toBe("jev-1.13.0");
    expect(framed?.body.state).toEqual({
      input: `Motion under debate: m\n\nEvidence passages (id| text):\n${evidence.text}`,
      submission: "Fares fell.",
    });
    expect(Object.keys(framed?.body.questions ?? {})).toEqual(["met"]);
  });

  it("strikes on the framed criterion, not on the relation question", async () => {
    stubJev(sentenceAnswers(0.8), 1000, 0.2);
    const notStruck = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(notStruck.contradicts).toBe(0.8);
    expect(notStruck.contradicted).toBe(0.2);
    expect(notStruck.verdict).not.toBe("contradicted");

    stubJev(sentenceAnswers(0.1), 1000, 0.9);
    const struck = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(struck.contradicted).toBe(0.9);
    expect(struck.verdict).toBe("contradicted");
  });

  it("offers the passages in the order given, then an explicit none", async () => {
    const calls = stubJev(sentenceAnswers(0.8));
    await judgeSentence({ motion: "m", side: "CON", sentence: "s", evidence });
    const which = relationCall(calls)?.body.questions.which as { criteria: Record<string, unknown> };
    expect(Object.keys(which.criteria)).toEqual(["P02", "P01", "none"]);
  });

  it("maps a contradicting answer to a contradicted verdict and prices both calls", async () => {
    stubJev(sentenceAnswers(0.8), 2_000_000);
    const judgment = await judgeSentence({ motion: "m", side: "PRO", sentence: "s", evidence });
    expect(judgment.verdict).toBe("contradicted");
    expect(judgment.passage).toBeNull();
    expect(judgment.inputTokens).toBe(4_000_000);
    expect(judgment.costUsd).toBeCloseTo(0.168, 6);
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
    expect(calls.map((c) => c.body.model)).toEqual(["jev-1.14.0", "jev-1.14.0"]);
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
    const input = {
      motion: "m",
      side: "PRO",
      sentence: "Fares rose 8 percent in 2024 [P01].",
      evidence,
    } as const;
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

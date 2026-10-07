import { describe, expect, it } from "vitest";
import type { JudgedVerdict } from "@/lib/jev/verdict";
import { countVerdicts, scoreDebate, type JudgedSentence, type JudgedTurn } from "@/lib/scoring/score";
import type { Side } from "@/lib/side";

const sentence = (
  side: Side,
  verdict: JudgedVerdict,
  supported = 0.5,
  contradicts = 0.05,
  isClaim = 0.9,
): JudgedSentence => ({
  side,
  verdict,
  isClaim,
  supported,
  contradicts,
});

const turn = (
  side: Side,
  round: number,
  rebuts: number | null,
  onMotion: number,
  evidenceUse: number,
): JudgedTurn => ({
  side,
  round,
  rebuts,
  onMotion,
  evidenceUse,
});

describe("evidence points", () => {
  it("gives +1 for supported, -1 for unsupported, -2 for contradicted and 0 otherwise", () => {
    const sentences = [
      sentence("PRO", "supported"),
      sentence("PRO", "supported"),
      sentence("PRO", "unsupported"),
      sentence("PRO", "contradicted"),
      sentence("PRO", "uncertain"),
      sentence("PRO", "opinion"),
      sentence("PRO", "unjudged"),
      sentence("CON", "contradicted"),
    ];
    const score = scoreDebate({ sentences, turns: [], final: null });
    expect(score.PRO.E).toBe(2 - 1 - 2);
    expect(score.CON.E).toBe(-2);
  });
});

describe("argument points", () => {
  it("adds a point for a rebuttal and for building on the evidence, from round 2", () => {
    const turns = [turn("CON", 2, 0.7, 0.9, 1.5)];
    expect(scoreDebate({ sentences: [], turns, final: null }).CON.A).toBe(2);
  });

  it("ignores a rebuttal in round 1 and a rebuttal under 0.7", () => {
    const turns = [turn("CON", 1, 0.95, 0.9, 0.2), turn("CON", 2, 0.69, 0.9, 0.2)];
    expect(scoreDebate({ sentences: [], turns, final: null }).CON.A).toBe(0);
  });

  it("takes a point off a turn that drifts off the motion", () => {
    const turns = [turn("PRO", 1, null, 0.34, 0.2), turn("PRO", 2, 0.1, 0.35, 0.2)];
    expect(scoreDebate({ sentences: [], turns, final: null }).PRO.A).toBe(-1);
  });
});

describe("judge points", () => {
  it("is three times the probability gap, in favour of the stronger side", () => {
    const score = scoreDebate({ sentences: [], turns: [], final: { pro: 0.7, con: 0.2, tie: 0.1 } });
    expect(score.PRO.J).toBeCloseTo(1.5);
    expect(score.CON.J).toBeCloseTo(-1.5);
  });

  it("is zero for both sides when a tie is the likeliest verdict", () => {
    const score = scoreDebate({ sentences: [], turns: [], final: { pro: 0.3, con: 0.2, tie: 0.5 } });
    expect(score.PRO.J).toBe(0);
    expect(score.CON.J).toBe(0);
  });

  it("is zero until the final judgment arrives", () => {
    expect(scoreDebate({ sentences: [], turns: [], final: null }).PRO.J).toBe(0);
  });
});

describe("totals and winner", () => {
  it("totals E=3, A=2, J=-1 as 4", () => {
    const sentences = [
      sentence("PRO", "supported"),
      sentence("PRO", "supported"),
      sentence("PRO", "supported"),
    ];
    const turns = [turn("PRO", 2, 0.8, 0.9, 1.6)];
    const final = { pro: 1 / 6, con: 1 / 2, tie: 1 / 3 - 0.0001 };
    const score = scoreDebate({ sentences, turns, final: { ...final, tie: 0.1 } });
    expect(score.PRO.E).toBe(3);
    expect(score.PRO.A).toBe(2);
    expect(score.PRO.J).toBeCloseTo(-1);
    expect(score.PRO.T).toBeCloseTo(4);
  });

  it("names the higher total the winner", () => {
    const sentences = [sentence("CON", "supported"), sentence("PRO", "contradicted")];
    const score = scoreDebate({ sentences, turns: [], final: null });
    expect(score.winner).toBe("CON");
    expect(score.margin).toBe(-3);
  });

  it("calls a total gap under 0.5 a draw", () => {
    // The judge gap of 0.04 moves each side by 3 x 0.04, so the totals differ by 0.24.
    const score = scoreDebate({ sentences: [], turns: [], final: { pro: 0.52, con: 0.48, tie: 0 } });
    expect(score.margin).toBeCloseTo(0.24);
    expect(score.winner).toBe("draw");
  });

  it("calls a total gap of 0.6 or more a win", () => {
    const score = scoreDebate({ sentences: [], turns: [], final: { pro: 0.55, con: 0.45, tie: 0 } });
    expect(score.margin).toBeCloseTo(0.6);
    expect(score.winner).toBe("PRO");
  });

  it("lets one supported claim against an off-topic turn decide it", () => {
    const score = scoreDebate({
      sentences: [sentence("PRO", "supported")],
      turns: [turn("CON", 1, null, 0.3, 0.1)],
      final: null,
    });
    expect(score.margin).toBe(2);
    expect(score.winner).toBe("PRO");
  });
});

describe("weighted variant", () => {
  it("rewards a sure supported claim and punishes a sure contradicted one", () => {
    const sentences = [sentence("PRO", "supported", 1, 0, 1), sentence("CON", "contradicted", 0, 1, 1)];
    const { weightedT } = scoreDebate({ sentences, turns: [], final: null });
    expect(weightedT.PRO).toBeCloseTo(1);
    expect(weightedT.CON).toBeCloseTo(-2);
  });

  it("counts an opinion in proportion to how factual the judge thought it was", () => {
    const sentences = [sentence("PRO", "opinion", 1, 0, 0.2)];
    expect(scoreDebate({ sentences, turns: [], final: null }).weightedT.PRO).toBeCloseTo(0.2);
  });
});

describe("countVerdicts", () => {
  it("counts claims as everything that is not an opinion or unjudged", () => {
    const sentences = [
      sentence("PRO", "supported"),
      sentence("PRO", "unsupported"),
      sentence("PRO", "contradicted"),
      sentence("PRO", "uncertain"),
      sentence("PRO", "opinion"),
      sentence("PRO", "unjudged"),
      sentence("CON", "supported"),
    ];
    expect(countVerdicts(sentences, "PRO")).toEqual({
      sentences: 6,
      claims: 4,
      supported: 1,
      unsupported: 1,
      contradicted: 1,
      uncertain: 1,
      opinions: 1,
      unjudged: 1,
    });
  });
});

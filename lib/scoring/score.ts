import type { JudgedVerdict } from "@/lib/jev/verdict";
import type { Side } from "@/lib/side";
import { DRAW_MARGIN, POINTS, THRESHOLDS } from "./rules";

export interface JudgedSentence {
  side: Side;
  verdict: JudgedVerdict;
  isClaim: number;
  supported: number;
  contradicts: number;
}

export interface JudgedTurn {
  side: Side;
  round: number;
  rebuts: number | null;
  onMotion: number;
  evidenceUse: number;
}

export interface FinalProbabilities {
  pro: number;
  con: number;
  tie: number;
}

export interface SideScore {
  E: number;
  A: number;
  J: number;
  T: number;
}

export interface DebateScore {
  PRO: SideScore;
  CON: SideScore;
  /** Total with E computed from probabilities instead of hard verdicts. Stored, never ranked on. */
  weightedT: Record<Side, number>;
  winner: Side | "draw";
  margin: number;
}

export interface VerdictCounts {
  sentences: number;
  claims: number;
  supported: number;
  unsupported: number;
  contradicted: number;
  uncertain: number;
  opinions: number;
  unjudged: number;
}

const EVIDENCE_POINTS: Record<JudgedVerdict, number> = {
  supported: POINTS.supported,
  unsupported: POINTS.unsupported,
  contradicted: POINTS.contradicted,
  uncertain: 0,
  opinion: 0,
  unjudged: 0,
};

function evidencePoints(sentences: JudgedSentence[], side: Side): number {
  return sentences.filter((s) => s.side === side).reduce((sum, s) => sum + EVIDENCE_POINTS[s.verdict], 0);
}

// Same signs and weights as the hard rule, spread over the probabilities. An
// unsupported claim is one the judge neither supports nor contradicts.
function weightedEvidencePoints(sentences: JudgedSentence[], side: Side): number {
  return sentences
    .filter((s) => s.side === side && s.verdict !== "unjudged")
    .reduce(
      (sum, s) =>
        sum +
        s.isClaim *
          (POINTS.supported * s.supported +
            POINTS.contradicted * s.contradicts +
            POINTS.unsupported * (1 - s.supported) * (1 - s.contradicts)),
      0,
    );
}

function argumentPoints(turns: JudgedTurn[], side: Side): number {
  return turns
    .filter((t) => t.side === side)
    .reduce((sum, t) => {
      let points = 0;
      if (t.round >= 2 && t.rebuts !== null && t.rebuts >= THRESHOLDS.rebuts) points += POINTS.rebuts;
      if (t.onMotion < THRESHOLDS.offMotion) points += POINTS.offMotion;
      if (t.evidenceUse >= THRESHOLDS.evidenceUse) points += POINTS.evidenceUse;
      return sum + points;
    }, 0);
}

function judgePoints(final: FinalProbabilities | null, side: Side): number {
  if (!final) return 0;
  const mine = side === "PRO" ? final.pro : final.con;
  const theirs = side === "PRO" ? final.con : final.pro;
  if (final.tie >= Math.max(mine, theirs)) return 0;
  return POINTS.judgeScale * (mine - theirs);
}

export function scoreDebate(input: {
  sentences: JudgedSentence[];
  turns: JudgedTurn[];
  final: FinalProbabilities | null;
}): DebateScore {
  const side = (which: Side): SideScore => {
    const E = evidencePoints(input.sentences, which);
    const A = argumentPoints(input.turns, which);
    const J = judgePoints(input.final, which);
    return { E, A, J, T: E + A + J };
  };
  const weighted = (which: Side) =>
    weightedEvidencePoints(input.sentences, which) +
    argumentPoints(input.turns, which) +
    judgePoints(input.final, which);

  const PRO = side("PRO");
  const CON = side("CON");
  const margin = PRO.T - CON.T;
  const winner = Math.abs(margin) < DRAW_MARGIN ? "draw" : margin > 0 ? "PRO" : "CON";
  return { PRO, CON, weightedT: { PRO: weighted("PRO"), CON: weighted("CON") }, winner, margin };
}

export function countVerdicts(sentences: JudgedSentence[], side: Side): VerdictCounts {
  const mine = sentences.filter((s) => s.side === side);
  const count = (verdict: JudgedVerdict) => mine.filter((s) => s.verdict === verdict).length;
  const supported = count("supported");
  const unsupported = count("unsupported");
  const contradicted = count("contradicted");
  const uncertain = count("uncertain");
  return {
    sentences: mine.length,
    claims: supported + unsupported + contradicted + uncertain,
    supported,
    unsupported,
    contradicted,
    uncertain,
    opinions: count("opinion"),
    unjudged: count("unjudged"),
  };
}

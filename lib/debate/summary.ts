import type { FinalEvent } from "./events";
import type { Side } from "@/lib/side";

export const percent = (value: number) => `${Math.round(value * 100)}%`;

export function retractionRate(counts: FinalEvent["stats"]["PRO"]["counts"]): number | null {
  return counts.claims === 0 ? null : (counts.unsupported + counts.contradicted) / counts.claims;
}

export function summaryText(input: {
  motion: string;
  models: Record<Side, string>;
  judgeLabel: string;
  rounds: number;
  strictMode: boolean;
  final: FinalEvent;
}): string {
  const { final } = input;
  const { score, stats, verdict } = final;
  const winner =
    score.winner === "draw"
      ? "Draw"
      : `${score.winner} (${input.models[score.winner]}) wins by ${Math.abs(score.margin).toFixed(2)}`;

  const side = (which: Side) => {
    const { counts } = stats[which];
    const rate = retractionRate(counts);
    return `${which} ${input.models[which]}: T ${score[which].T.toFixed(2)} (E ${score[which].E}, A ${score[which].A}, J ${score[which].J.toFixed(2)}); ${counts.claims} claims, ${counts.unsupported + counts.contradicted} retracted${rate === null ? "" : ` (${percent(rate)})`}`;
  };

  return [
    `Motion: ${input.motion}`,
    `${winner}. Jev verdict: PRO ${percent(verdict.pro)}, CON ${percent(verdict.con)}, tie ${percent(verdict.tie)}.`,
    side("PRO"),
    side("CON"),
    `${input.rounds} rounds, strict mode ${input.strictMode ? "on" : "off"}. Judge: ${input.judgeLabel} · ${Math.round(stats.judge.medianLatencyMs)} ms median · $${stats.judge.costUsd.toFixed(4)}`,
  ].join("\n");
}

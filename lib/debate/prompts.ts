import type { Side } from "@/lib/side";

export interface PriorTurn {
  side: Side;
  round: number;
  text: string;
}

export function debaterSystemPrompt(options: {
  side: Side;
  motion: string;
  maxWords: number;
  evidence: string;
}): string {
  const stance = options.side === "PRO" ? "You argue FOR the motion." : "You argue AGAINST the motion.";
  return [
    `You are a debater. Your side: ${options.side}. The motion: "${options.motion}"`,
    stance,
    "",
    "Rules:",
    "- Argue your side using only the evidence pack below. Every factual claim you make must come from it.",
    "- Cite passage ids in square brackets, like [P07], when you can.",
    "- Opinions and value judgments are allowed. Invented or distorted facts are not.",
    `- Write at most ${options.maxWords} words per turn, in plain prose: no lists, no headers, no markdown.`,
    "- From round 2 on, answer your opponent's last argument directly.",
    "",
    "Evidence pack:",
    options.evidence,
  ].join("\n");
}

export function turnPrompt(options: {
  side: Side;
  round: number;
  rounds: number;
  prior: PriorTurn[];
  /** Sentences of this turn that already stand, when the turn is being restarted. */
  kept: string | null;
  remainingWords: number;
}): string {
  const lines = [`Round ${options.round} of ${options.rounds}. You speak as ${options.side}.`, ""];
  if (options.prior.length === 0) {
    lines.push("You open the debate.");
  } else {
    lines.push("Debate so far:");
    for (const turn of options.prior) lines.push(`${turn.side}, round ${turn.round}: ${turn.text}`);
  }
  lines.push("");
  if (options.kept === null) {
    lines.push(`Give your round ${options.round} turn now.`);
  } else {
    lines.push(
      `Your round ${options.round} turn so far, already heard by the audience: ${options.kept || "(nothing yet)"}`,
      `Write only what comes next, in at most ${options.remainingWords} words.`,
    );
  }
  return lines.join("\n");
}

export function retractionNote(sentence: string): string {
  return `The judge retracted this sentence because the evidence does not support it: «${sentence}». Continue without repeating unsupported claims.`;
}

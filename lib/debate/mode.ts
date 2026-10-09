/**
 * How a debate is run.
 * - `blind`: debaters argue from what they know. The evidence is the judge's alone: a large reference
 *   library per motion that Jev checks each claim against. A claim it contradicts is struck, one it
 *   supports scores, one it cannot check is left alone.
 * - `evidence`: debaters get the curated evidence pack and must argue from it; a claim the pack does
 *   not support is struck too.
 */
export type DebateMode = "blind" | "evidence";

export const DEBATE_MODES: readonly DebateMode[] = ["blind", "evidence"];
export const DEFAULT_MODE: DebateMode = "blind";

export const isDebateMode = (value: unknown): value is DebateMode =>
  typeof value === "string" && (DEBATE_MODES as readonly string[]).includes(value);

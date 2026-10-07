export type Side = "PRO" | "CON";

export const SIDES: readonly Side[] = ["PRO", "CON"];

export function otherSide(side: Side): Side {
  return side === "PRO" ? "CON" : "PRO";
}

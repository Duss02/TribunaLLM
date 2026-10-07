import { readFile } from "node:fs/promises";
import path from "node:path";
import { type Leaderboard, leaderboard } from "./leaderboard";

export const LEADERBOARD_FILE = path.join("bench", "leaderboard.json");

/** The committed leaderboard, or null when no tournament has been aggregated yet. */
export async function readLeaderboard(): Promise<Leaderboard | null> {
  let raw: string;
  try {
    raw = await readFile(path.join(process.cwd(), LEADERBOARD_FILE), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const parsed = leaderboard.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error(`${LEADERBOARD_FILE} does not match the leaderboard format (${parsed.error.issues[0]?.message}). Rebuild it with pnpm leaderboard:build.`);
  }
  return parsed.data;
}

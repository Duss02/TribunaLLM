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

export const LEADERBOARD_V2_FILE = path.join("bench", "leaderboard-v2.json");

export interface CertifiedModelRow {
  key: string;
  label: string;
  vendor: string;
  claims: number;
  pilotContradicted: number;
  contradicted: number;
  rate: number | null;
  low: number;
  high: number;
  contradictedConfident: number;
  rateConfident: number | null;
  lowConfident: number;
  highConfident: number;
  winRate: number | null;
}
export interface CertifiedBoard {
  generatedAt: string;
  judge: string;
  thresholds: { decision: number; confident: number };
  debates: number;
  claims: number;
  contradicted: number;
  contradictedConfident: number;
  pilotContradicted: number;
  models: CertifiedModelRow[];
}

/** The same debates' claims judged again with the certified question (scripts/leaderboard-v2.ts), or null. */
export async function readCertifiedBoard(): Promise<CertifiedBoard | null> {
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), LEADERBOARD_V2_FILE), "utf8")) as CertifiedBoard;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

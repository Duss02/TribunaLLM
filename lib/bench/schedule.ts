import { hashString, seededRandom, shuffled } from "@/lib/random";

export interface Pairing {
  pack: string;
  pro: string;
  con: string;
  repeat: number;
}

/**
 * Every pair of models meets on every pack, once per repeat with each model
 * on PRO and once on CON, so a side advantage cancels out. The order is
 * shuffled from the run id so a resumed run reproduces it.
 */
export function buildSchedule(options: {
  models: readonly string[];
  packs: readonly string[];
  repeats: number;
  runId: string;
}): Pairing[] {
  const models = [...options.models].sort();
  const pairings: Pairing[] = [];
  for (let a = 0; a < models.length; a++) {
    for (let b = a + 1; b < models.length; b++) {
      for (const pack of options.packs) {
        for (let repeat = 1; repeat <= options.repeats; repeat++) {
          pairings.push({ pack, pro: models[a] as string, con: models[b] as string, repeat });
          pairings.push({ pack, pro: models[b] as string, con: models[a] as string, repeat });
        }
      }
    }
  }
  return shuffled(pairings, seededRandom(hashString(options.runId)));
}

export function debateSeed(runId: string, pairing: Pairing): number {
  return hashString(`${runId}|${pairing.pack}|${pairing.pro}|${pairing.con}|${pairing.repeat}`);
}

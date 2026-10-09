import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Passage } from "./packs";

/**
 * The judge's reference library for one motion in blind mode: many whole encyclopedia articles cut into
 * passages, built by `pnpm library:build` and kept in `packs/library/<slug>.json`. Debaters never see it.
 */
const librarySchema = z.object({
  slug: z.string(),
  license: z.string(),
  builtAt: z.string(),
  sources: z.array(z.object({ title: z.string(), url: z.string(), revision: z.number() })),
  passages: z.array(z.object({ id: z.string(), source: z.string(), text: z.string() })),
});

export type Library = z.infer<typeof librarySchema>;

const libraryPath = (slug: string) => path.join(process.cwd(), "packs", "library", `${slug}.json`);

/** The library for a motion, or null when none has been built for it. */
export async function loadLibrary(slug: string): Promise<Library | null> {
  let raw: string;
  try {
    raw = await readFile(libraryPath(slug), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  return librarySchema.parse(JSON.parse(raw));
}

/** Library passages as the judge reads them: the article title first, so a passage carries its subject. */
export function libraryPassages(library: Library | null): Passage[] {
  return (library?.passages ?? []).map((passage) => ({
    id: passage.id,
    text: `(${passage.source}) ${passage.text}`,
  }));
}

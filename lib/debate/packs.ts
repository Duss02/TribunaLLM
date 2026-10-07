import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Evidence } from "@/lib/jev/types";
import { seededRandom, shuffled } from "@/lib/random";

export interface Passage {
  id: string;
  text: string;
}

export interface EvidencePack {
  slug: string;
  title: string;
  motion: string;
  source: string;
  license: string;
  passages: Passage[];
}

export const PACK_LIMITS = { maxPassageWords: 120, maxPassages: 200, maxTokens: 24_000 } as const;

const REQUIRED_FIELDS = ["title", "motion", "source", "license"] as const;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class PackError extends Error {
  constructor(slug: string, problem: string) {
    super(`Pack "${slug}": ${problem}`);
    this.name = "PackError";
  }
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function parsePack(slug: string, raw: string): EvidencePack {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new PackError(slug, "missing frontmatter between --- lines");

  const fields = new Map<string, string>();
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const split = line.indexOf(":");
    if (split < 1) throw new PackError(slug, `frontmatter line "${line}" is not "key: value"`);
    fields.set(
      line.slice(0, split).trim(),
      line
        .slice(split + 1)
        .trim()
        .replace(/^(["'])(.*)\1$/, "$2"),
    );
  }
  for (const field of REQUIRED_FIELDS) {
    if (!fields.get(field)) throw new PackError(slug, `frontmatter is missing "${field}"`);
  }

  const paragraphs = (match[2] ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (paragraphs.length === 0) throw new PackError(slug, "has no passages");
  if (paragraphs.length > PACK_LIMITS.maxPassages) {
    throw new PackError(slug, `has ${paragraphs.length} passages, the limit is ${PACK_LIMITS.maxPassages}`);
  }

  const width = Math.max(2, String(paragraphs.length).length);
  const passages = paragraphs.map((text, index) => {
    const id = `P${String(index + 1).padStart(width, "0")}`;
    if (text.startsWith("#"))
      throw new PackError(slug, `${id} looks like a heading; packs hold passages only`);
    const words = text.split(" ").length;
    if (words > PACK_LIMITS.maxPassageWords) {
      throw new PackError(slug, `${id} has ${words} words, the limit is ${PACK_LIMITS.maxPassageWords}`);
    }
    return { id, text };
  });

  const tokens = estimateTokens(passages.map((p) => `${p.id}| ${p.text}`).join("\n"));
  if (tokens > PACK_LIMITS.maxTokens) {
    throw new PackError(slug, `is about ${tokens} tokens, the limit is ${PACK_LIMITS.maxTokens}`);
  }

  const get = (field: (typeof REQUIRED_FIELDS)[number]) => fields.get(field) as string;
  return {
    slug,
    title: get("title"),
    motion: get("motion"),
    source: get("source"),
    license: get("license"),
    passages,
  };
}

const packsDirectory = () => path.join(process.cwd(), "packs");

export async function loadPack(slug: string): Promise<EvidencePack> {
  if (!SLUG.test(slug)) throw new PackError(slug, "slugs use lowercase letters, digits and hyphens");
  let raw: string;
  try {
    raw = await readFile(path.join(packsDirectory(), `${slug}.md`), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new PackError(slug, "not found in packs/. Run pnpm debate:cli --list-packs to see what exists");
    }
    throw error;
  }
  return parsePack(slug, raw);
}

export async function listPacks(): Promise<EvidencePack[]> {
  const files = (await readdir(packsDirectory())).filter((file) => file.endsWith(".md")).sort();
  return Promise.all(files.map((file) => loadPack(file.slice(0, -3))));
}

const line = (passage: Passage) => `${passage.id}| ${passage.text}`;

/** Passages in their written order, as the debaters read them. */
export function evidenceForDebaters(pack: EvidencePack): string {
  return pack.passages.map(line).join("\n");
}

/** Passages in an order shuffled once per debate, as the judge reads them, to blunt first-option bias. */
export function evidenceForJudge(pack: EvidencePack, seed: number): Evidence {
  const order = shuffled(pack.passages, seededRandom(seed));
  return { text: order.map(line).join("\n"), ids: order.map((passage) => passage.id) };
}

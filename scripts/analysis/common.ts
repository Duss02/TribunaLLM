import { readFile } from "node:fs/promises";
import path from "node:path";
import { type OkResult, readResultsDirectory } from "@/lib/bench/results";
import { type Library, libraryPassages, loadLibrary } from "@/lib/debate/library";
import { type EvidencePack, type Passage, loadPack } from "@/lib/debate/packs";
import type { Evidence } from "@/lib/jev/types";
import type { JudgedVerdict } from "@/lib/jev/verdict";
import type { Side } from "@/lib/side";
import { seededRandom, shuffled } from "@/lib/random";

/** One judged sentence with everything needed to judge it again. */
export interface SentenceRecord {
  runId: string;
  pack: string;
  motion: string;
  side: Side;
  model: string;
  turn: string;
  round: number;
  id: string;
  text: string;
  verdict: JudgedVerdict;
  isClaim: number;
  supported: number;
  contradicts: number;
  passage: string | null;
  evidenceIds: string[];
}

export interface Corpus {
  pack: EvidencePack;
  library: Library | null;
  passages: Map<string, Passage>;
}

const corpora = new Map<string, Promise<Corpus>>();

/** The pack and library a blind debate was judged against, keyed by passage id. */
export function corpusFor(slug: string): Promise<Corpus> {
  let promise = corpora.get(slug);
  if (!promise) {
    promise = (async () => {
      const [pack, library] = await Promise.all([loadPack(slug), loadLibrary(slug)]);
      const passages = new Map<string, Passage>();
      for (const passage of [...pack.passages, ...libraryPassages(library)])
        passages.set(passage.id, passage);
      return { pack, library, passages };
    })();
    corpora.set(slug, promise);
  }
  return promise;
}

/** The evidence text exactly as the orchestrator built it: `id| text` lines in the recorded order. */
export function rebuildEvidence(corpus: Corpus, ids: readonly string[]): Evidence {
  const lines = ids.map((id) => {
    const passage = corpus.passages.get(id);
    if (!passage)
      throw new Error(`Passage ${id} is not in the corpus for ${corpus.pack.slug}; was the library rebuilt?`);
    return `${id}| ${passage.text}`;
  });
  return { text: lines.join("\n"), ids: [...ids] };
}

export async function loadBlindResults(input: string, runId?: string): Promise<OkResult[]> {
  const lines = await readResultsDirectory(input);
  return lines.filter(
    (line): line is OkResult =>
      line.status === "ok" &&
      line.mode === "blind" &&
      line.transcript !== undefined &&
      (!runId || line.runId === runId),
  );
}

export async function sentencesOf(results: readonly OkResult[]): Promise<SentenceRecord[]> {
  const out: SentenceRecord[] = [];
  for (const result of results) {
    const { pack } = await corpusFor(result.pack);
    for (const turn of result.transcript ?? []) {
      const model = turn.side === "PRO" ? result.pro : result.con;
      for (const sentence of turn.sentences) {
        if (sentence.dropped || sentence.verdict === null) continue;
        out.push({
          runId: result.runId,
          pack: result.pack,
          motion: pack.motion,
          side: turn.side,
          model,
          turn: turn.id,
          round: turn.round,
          id: `${result.pack}|${result.pro}|${result.con}|${result.repeat}|${sentence.id}`,
          text: sentence.text,
          verdict: sentence.verdict,
          isClaim: sentence.isClaim,
          supported: sentence.supported,
          contradicts: sentence.contradicts,
          passage: sentence.passage,
          evidenceIds: sentence.evidenceIds,
        });
      }
    }
  }
  return out;
}

/** Up to `n` items per verdict, in a seeded order, so a rerun samples the same sentences. */
export function stratified(
  records: readonly SentenceRecord[],
  perVerdict: Partial<Record<JudgedVerdict, number>>,
  seed: number,
): SentenceRecord[] {
  const random = seededRandom(seed);
  const out: SentenceRecord[] = [];
  for (const [verdict, n] of Object.entries(perVerdict) as [JudgedVerdict, number][]) {
    const pool = shuffled(
      records.filter((r) => r.verdict === verdict),
      random,
    );
    out.push(...pool.slice(0, n));
  }
  return out;
}

export async function runPool<T, R>(
  items: readonly T[],
  concurrency: number,
  work: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      for (;;) {
        const index = next++;
        if (index >= items.length) return;
        results[index] = await work(items[index] as T, index);
      }
    }),
  );
  return results;
}

export const pct = (part: number, whole: number) =>
  whole === 0 ? "   -  " : `${((100 * part) / whole).toFixed(1).padStart(5)}%`;

export async function writeReport(name: string, text: string): Promise<string> {
  const file = path.join("bench", "analysis", name);
  await (await import("node:fs/promises")).writeFile(file, text);
  return file;
}

export async function readText(file: string): Promise<string> {
  return readFile(file, "utf8");
}

/** Cohen's kappa for two labelings of the same items. */
export function cohenKappa<L extends string>(a: readonly L[], b: readonly L[]): number {
  const n = a.length;
  if (n === 0) return Number.NaN;
  const labels = [...new Set([...a, ...b])];
  let agree = 0;
  for (let i = 0; i < n; i++) if (a[i] === b[i]) agree++;
  const po = agree / n;
  let pe = 0;
  for (const label of labels) {
    pe += (a.filter((x) => x === label).length / n) * (b.filter((x) => x === label).length / n);
  }
  return pe === 1 ? 1 : (po - pe) / (1 - pe);
}

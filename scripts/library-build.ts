// Builds the judge's reference library for each motion from whole English Wikipedia articles.
// pnpm library:build                     every motion in packs/library/sources.json
// pnpm library:build congestion-pricing  one motion
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const API = "https://en.wikipedia.org/w/api.php";
const USER_AGENT =
  "TribunaLLM-library-build/0.1 (https://github.com; reference library for a debate benchmark)";
const MAX_WORDS = 110;
// Lists, links and reference sections carry no prose worth checking a claim against.
const SKIP_SECTIONS =
  /^(see also|references|external links|further reading|notes|bibliography|sources|citations|footnotes|works cited|gallery|explanatory notes)$/i;

interface Article {
  title: string;
  url: string;
  revision: number;
  text: string;
}

async function fetchArticle(title: string): Promise<Article | null> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    redirects: "1",
    prop: "extracts|revisions|info",
    inprop: "url",
    rvprop: "ids",
    explaintext: "1",
    exsectionformat: "wiki",
    titles: title,
  });
  const response = await fetch(`${API}?${params}`, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) throw new Error(`Wikipedia answered ${response.status} for "${title}"`);
  const body = (await response.json()) as {
    query?: {
      pages?: Array<{
        title: string;
        missing?: boolean;
        extract?: string;
        fullurl?: string;
        revisions?: Array<{ revid: number }>;
      }>;
    };
  };
  const page = body.query?.pages?.[0];
  if (!page || page.missing || !page.extract) return null;
  return {
    title: page.title,
    url: page.fullurl ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`,
    revision: page.revisions?.[0]?.revid ?? 0,
    text: page.extract,
  };
}

/** Article prose without skipped sections, as paragraphs. */
function paragraphs(text: string): string[] {
  const out: string[] = [];
  let skipping = false;
  for (const block of text.split(/\n+/)) {
    const heading = /^(=+)\s*(.*?)\s*\1$/.exec(block.trim());
    if (heading) {
      skipping = SKIP_SECTIONS.test(heading[2] ?? "");
      continue;
    }
    const clean = block.replace(/\s+/g, " ").trim();
    if (!skipping && clean.split(" ").length >= 8) out.push(clean);
  }
  return out;
}

/** Joins runs of short paragraphs (list items, captions) so no passage is a stray fragment. */
function merged(blocks: string[]): string[] {
  const out: string[] = [];
  for (const block of blocks) {
    const last = out.at(-1);
    const lastWords = last ? last.split(" ").length : 0;
    if (
      last &&
      (lastWords < 40 || block.split(" ").length < 25) &&
      lastWords + block.split(" ").length <= MAX_WORDS
    ) {
      out[out.length - 1] = `${last} ${block}`;
    } else {
      out.push(block);
    }
  }
  return out;
}

/** Splits a paragraph at sentence ends into passages of at most MAX_WORDS words. */
function passagesOf(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(?:["')\]]+)?\s*|[^.!?]+$/g) ?? [paragraph];
  const out: string[] = [];
  let current: string[] = [];
  let words = 0;
  for (const raw of sentences) {
    const sentence = raw.trim();
    const length = sentence.split(" ").length;
    if (words + length > MAX_WORDS && current.length > 0) {
      out.push(current.join(" "));
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += length;
  }
  if (current.length > 0) out.push(current.join(" "));
  return out.map((passage) =>
    passage
      .split(" ")
      .slice(0, MAX_WORDS * 2)
      .join(" "),
  );
}

async function build(slug: string, titles: string[]): Promise<void> {
  const sources: Array<Omit<Article, "text">> = [];
  const passages: Array<{ id: string; source: string; text: string }> = [];
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const title of titles) {
    const article = await fetchArticle(title);
    if (!article || seen.has(article.title)) {
      if (!article) missing.push(title);
      continue;
    }
    seen.add(article.title);
    sources.push({ title: article.title, url: article.url, revision: article.revision });
    for (const paragraph of merged(paragraphs(article.text))) {
      for (const text of passagesOf(paragraph)) {
        passages.push({
          id: `W${String(passages.length + 1).padStart(4, "0")}`,
          source: article.title,
          text,
        });
      }
    }
  }
  const library = {
    slug,
    license: "CC BY-SA 4.0 (Wikipedia contributors); see each source's page history for authorship",
    builtAt: new Date().toISOString(),
    sources,
    passages,
  };
  await writeFile(path.join("packs", "library", `${slug}.json`), `${JSON.stringify(library, null, 1)}\n`);
  const words = passages.reduce((total, p) => total + p.text.split(" ").length, 0);
  console.log(
    `${slug}: ${sources.length} articles, ${passages.length} passages, ${words.toLocaleString("en")} words` +
      (missing.length ? ` | not found: ${missing.join("; ")}` : ""),
  );
}

const sources = JSON.parse(await readFile(path.join("packs", "library", "sources.json"), "utf8")) as Record<
  string,
  string[]
>;
const only = process.argv[2];
for (const [slug, titles] of Object.entries(sources)) {
  if (only && slug !== only) continue;
  await build(slug, titles);
}

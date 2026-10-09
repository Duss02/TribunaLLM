import type { Passage } from "./packs";

// Short function words carry no evidence; numbers and names are what a fact check turns on, so they stay.
const STOP = new Set(
  "a about above after again against all also am an and any are as at be because been before being between both but by can could did do does doing down during each few for from further had has have having he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on once only or other our out over own same she should so some such than that the their them then there these they this those through to too under until up very was we were what when where which while who whom why will with would you your".split(
    " ",
  ),
);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

/** Lower-cased words and numbers, function words dropped, a light plural stem. `1,200` and `1200` match. */
export function tokenize(text: string): string[] {
  const words =
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/(\d),(\d{3})/g, "$1$2")
      .match(/[a-z]+|\d+(?:\.\d+)?/g) ?? [];
  return words.filter((word) => !STOP.has(word) && (word.length > 1 || /\d/.test(word))).map(stem);
}

export interface PassageIndex {
  size: number;
  /** The `limit` passages that best match `query`, best first. Passages sharing no term are never returned. */
  search(query: string, limit: number): Passage[];
}

const K1 = 1.2;
const B = 0.75;

/** An Okapi BM25 index over the passages, built once per debate. */
export function indexPassages(passages: readonly Passage[]): PassageIndex {
  const docs = passages.map((passage) => {
    const terms = tokenize(passage.text);
    const counts = new Map<string, number>();
    for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
    return { passage, length: terms.length, counts };
  });
  const frequency = new Map<string, number>();
  for (const doc of docs)
    for (const term of doc.counts.keys()) frequency.set(term, (frequency.get(term) ?? 0) + 1);
  const averageLength = docs.reduce((total, doc) => total + doc.length, 0) / Math.max(1, docs.length);
  const n = docs.length;
  const idf = (term: string) => {
    const df = frequency.get(term) ?? 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  };

  return {
    size: n,
    search(query, limit) {
      const terms = [...new Set(tokenize(query))];
      if (terms.length === 0) return [];
      const weights = terms.map((term) => [term, idf(term)] as const);
      const scored: { passage: Passage; score: number }[] = [];
      for (const doc of docs) {
        let score = 0;
        for (const [term, weight] of weights) {
          const tf = doc.counts.get(term);
          if (!tf) continue;
          score += (weight * tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / averageLength));
        }
        if (score > 0) scored.push({ passage: doc.passage, score });
      }
      return scored
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((entry) => entry.passage);
    },
  };
}

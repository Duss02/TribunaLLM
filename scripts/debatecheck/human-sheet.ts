import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import type { Passage } from "@/lib/debate/packs";
import { corpusFor } from "../analysis/common";
import { type Pair, evidenceText, readJsonl, selectPassages } from "./lib";

// Human validation sheet (pre-registration, "Human validation"): 300 items, 100 unchanged sides of numeric
// pairs, 100 unchanged and 100 altered sides of the new types (25 per type each, from disjoint pairs),
// seed 2026. Each item shows the three passages that best match its sentence plus, when missing, the
// passages among the twenty that contain the pair's original token (at most two), the same rule for both
// sides of a pair. Two copies in different seeded orders, opaque item numbers, the key kept apart. No judge
// output anywhere.
const { values } = parseArgs({
  options: {
    seed: { type: "string", default: "2026" },
    out: { type: "string", default: "bench/debatecheck/human" },
  },
});

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffled<T>(arr: readonly T[], random: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}
const norm = (s: string) => s.replaceAll(",", "").toLowerCase();
const contains = (text: string, token: string) => norm(text).includes(norm(token));

const random = rng(Number(values.seed));
const numbers = await readJsonl<Pair>("bench/debatecheck/pairs.jsonl");
const types = await readJsonl<Pair>("bench/debatecheck/pairs-types.jsonl");
const KINDS = ["polarity", "entity", "attribution", "unit"];
interface Item {
  pair: Pair;
  which: "original" | "perturbed";
  stratum: string;
}
const items: Item[] = shuffled(numbers, random)
  .slice(0, 100)
  .map((pair) => ({ pair, which: "original" as const, stratum: "numeric-unchanged" }));
for (const kind of KINDS) {
  const pool = shuffled(
    types.filter((p) => (p.kind as string) === kind),
    random,
  );
  items.push(
    ...pool.slice(0, 25).map((pair) => ({ pair, which: "original" as const, stratum: `${kind}-unchanged` })),
  );
  items.push(
    ...pool.slice(25, 50).map((pair) => ({ pair, which: "perturbed" as const, stratum: `${kind}-altered` })),
  );
}
if (items.length !== 300) throw new Error(`expected 300 items, built ${items.length}`);

interface Row {
  item: string;
  motion: string;
  sentence: string;
  evidence: string;
  key: {
    item: string;
    id: string;
    which: string;
    kind: string;
    stratum: string;
    pack: string;
    shown: string[];
  };
}
const numbered = shuffled(items, random).map((it, i) => ({
  ...it,
  item: `H-${String(i + 1).padStart(3, "0")}`,
}));
const rows: Row[] = [];
for (const it of numbered) {
  const { pair, which } = it;
  const corpus = await corpusFor(pair.pack);
  const sentence = pair[which];
  const top = selectPassages(corpus, pair.evidenceIds, sentence, 3);
  const all = selectPassages(corpus, pair.evidenceIds, pair.original, null);
  const number = /\d(?:[\d,]*\d)?(?:\.\d+)?/.exec(pair.original)?.[0];
  const score = (p: Passage) =>
    (contains(p.text, pair.from) ? 1 : 0) + (number && contains(p.text, number) ? 1 : 0);
  const fact = all
    .filter((p) => contains(p.text, pair.from) && !top.some((t) => t.id === p.id))
    .sort((a, b) => score(b) - score(a))
    .slice(0, 2);
  const shown = [...top, ...fact];
  rows.push({
    item: it.item,
    motion: pair.motion,
    sentence,
    evidence: evidenceText(shown),
    key: {
      item: it.item,
      id: pair.id,
      which,
      kind: pair.kind,
      stratum: it.stratum,
      pack: pair.pack,
      shown: shown.map((p) => p.id),
    },
  });
}

const csvField = (s: string) => `"${s.replaceAll('"', '""')}"`;
const csv = (list: Row[]) =>
  [
    "item,motion,sentence,evidence,label,notes",
    ...list.map((r) => [r.item, r.motion, r.sentence, r.evidence, "", ""].map(csvField).join(",")),
  ].join("\n") + "\n";
await mkdir(values.out, { recursive: true });
const orderA = shuffled(rows, rng(Number(values.seed) + 1));
const orderB = shuffled(rows, rng(Number(values.seed) + 2));
await writeFile(`${values.out}/sheet-A.csv`, csv(orderA));
await writeFile(`${values.out}/sheet-B.csv`, csv(orderB));
await writeFile(`${values.out}/key.jsonl`, rows.map((r) => JSON.stringify(r.key)).join("\n") + "\n");
const counts: Record<string, number> = {};
for (const r of rows) counts[r.key.stratum] = (counts[r.key.stratum] ?? 0) + 1;
const extra = rows.filter((r) => r.key.shown.length > 3).length;
console.log(
  `${rows.length} items -> ${values.out}/sheet-A.csv, sheet-B.csv, key.jsonl; ${extra} items show extra fact passages`,
);
console.log(JSON.stringify(counts));

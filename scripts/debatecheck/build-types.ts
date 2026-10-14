import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { seededRandom, shuffled } from "@/lib/random";
import { corpusFor, loadBlindResults, rebuildEvidence, sentencesOf } from "../analysis/common";
import { type Pair, TEST_PACKS, TRAIN_PACKS } from "./lib";

// New perturbation types for DebateCheck, by fixed rules, as pre-registered in
// docs/preregistration-judge-correlation.md: one edit per sentence; the original token must occur in the
// evidence the judge read, the replacement must occur nowhere in it. Candidates that fail are logged.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    seed: { type: "string", default: "2026" },
    out: { type: "string", default: "bench/debatecheck/pairs-types.jsonl" },
  },
});

type Kind = "polarity" | "unit" | "entity" | "attribution";
const POLARITY: [string, string][] = [
  ["rose", "fell"],
  ["fell", "rose"],
  ["increased", "decreased"],
  ["decreased", "increased"],
  ["increase", "decrease"],
  ["decrease", "increase"],
  ["higher", "lower"],
  ["lower", "higher"],
  ["more", "fewer"],
  ["fewer", "more"],
  ["reduced", "raised"],
  ["raised", "reduced"],
  ["grew", "shrank"],
  ["shrank", "grew"],
  ["gained", "lost"],
  ["lost", "gained"],
  ["cut", "raised"],
  ["declined", "climbed"],
  ["climbed", "declined"],
  ["dropped", "jumped"],
  ["jumped", "dropped"],
  ["below", "above"],
  ["above", "below"],
  ["lowered", "raised"],
  ["lowest", "highest"],
  ["highest", "lowest"],
  ["least", "most"],
  ["most", "least"],
  ["cheaper", "costlier"],
  ["faster", "slower"],
  ["slower", "faster"],
  ["longer", "shorter"],
  ["shorter", "longer"],
  ["growth", "decline"],
  ["decline", "growth"],
  ["rise", "fall"],
  ["fall", "rise"],
  ["up", "down"],
  ["down", "up"],
  ["earlier", "later"],
  ["later", "earlier"],
  ["before", "after"],
  ["after", "before"],
  ["supported", "opposed"],
  ["opposed", "supported"],
  ["exempted", "included"],
  ["approved", "rejected"],
  ["rejected", "approved"],
  ["positive", "negative"],
  ["negative", "positive"],
  ["majority", "minority"],
  ["surplus", "deficit"],
  ["largest", "smallest"],
  ["smallest", "largest"],
];
const UNIT: [string, string][] = [
  ["percent", "percentage points"],
  ["percentage points", "percent"],
  ["million", "billion"],
  ["billion", "million"],
  ["per year", "per month"],
  ["a year", "a month"],
  ["dollars", "euros"],
  ["euros", "dollars"],
  ["pounds", "dollars"],
  ["kilowatt-hour", "megawatt-hour"],
  ["megawatt-hour", "kilowatt-hour"],
  ["tonnes", "kilograms"],
  ["hours", "minutes"],
  ["days", "weeks"],
  ["weeks", "months"],
  ["months", "years"],
];
// Names that take "the" (the Netherlands, the Philippines) are left out so an edit never breaks the article.
const COUNTRIES = [
  "Mexico",
  "Denmark",
  "France",
  "Germany",
  "Finland",
  "Japan",
  "China",
  "India",
  "Brazil",
  "Canada",
  "Australia",
  "Sweden",
  "Norway",
  "Spain",
  "Italy",
  "Portugal",
  "Belgium",
  "Ireland",
  "Iceland",
  "Chile",
  "Argentina",
  "Colombia",
  "Peru",
  "Poland",
  "Hungary",
  "Austria",
  "Switzerland",
  "Singapore",
  "Korea",
  "Turkey",
  "Egypt",
  "Nigeria",
  "Kenya",
  "Thailand",
  "Vietnam",
  "Indonesia",
  "Malaysia",
  "Pakistan",
  "Bangladesh",
  "Russia",
  "Ukraine",
  "Greece",
  "Romania",
  "Bulgaria",
  "Croatia",
  "Serbia",
  "Slovenia",
  "Slovakia",
  "Estonia",
  "Latvia",
  "Lithuania",
  "Luxembourg",
  "Taiwan",
  "Israel",
  "Morocco",
  "Tunisia",
  "Ghana",
  "Ethiopia",
  "Uruguay",
  "Paraguay",
  "Bolivia",
  "Ecuador",
  "Venezuela",
  "Cuba",
  "Jamaica",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Jordan",
  "Lebanon",
];
const CITIES = [
  "Philadelphia",
  "Berkeley",
  "Seattle",
  "Oakland",
  "London",
  "Stockholm",
  "Gothenburg",
  "Singapore",
  "Milan",
  "Madrid",
  "Paris",
  "Berlin",
  "Vienna",
  "Prague",
  "Warsaw",
  "Lisbon",
  "Dublin",
  "Oslo",
  "Copenhagen",
  "Helsinki",
  "Zurich",
  "Geneva",
  "Amsterdam",
  "Brussels",
  "Boston",
  "Chicago",
  "Houston",
  "Denver",
  "Atlanta",
  "Miami",
  "Toronto",
  "Vancouver",
  "Montreal",
  "Sydney",
  "Melbourne",
  "Auckland",
  "Tokyo",
  "Osaka",
  "Seoul",
  "Beijing",
  "Shanghai",
  "Mumbai",
  "Delhi",
  "Bangkok",
  "Jakarta",
  "Manila",
  "Cairo",
  "Lagos",
  "Nairobi",
  "Johannesburg",
  "Cape Town",
  "Santiago",
  "Lima",
  "Bogota",
  "Buenos Aires",
  "Sao Paulo",
  "Mexico City",
  "Cambridge",
  "Oxford",
  "Manchester",
  "Edinburgh",
  "Glasgow",
  "Durham",
  "Portland",
  "Austin",
  "Dallas",
  "Phoenix",
  "Detroit",
  "Baltimore",
  "Minneapolis",
  "St. Paul",
  "Los Angeles",
  "San Francisco",
  "San Diego",
  "Washington",
  "New York",
];
const ORGS = [
  "WHO",
  "IEA",
  "IPCC",
  "OECD",
  "IMF",
  "NASA",
  "ESA",
  "NBER",
  "World Bank",
  "European Commission",
  "Cour des comptes",
  "EDF",
  "Lazard",
  "BloombergNEF",
  "Ember",
  "Eurostat",
  "CDC",
  "FDA",
  "EPA",
  "DOE",
  "GAO",
  "CBO",
  "MTA",
  "Transport for London",
  "RAND",
  "Brookings",
  "Pew Research",
  "Gallup",
  "Autonomy",
  "4 Day Week Global",
  "Stanford",
  "Harvard",
  "MIT",
  "Berkeley",
  "Oxford",
  "Cambridge",
  "Boston College",
  "Imperial College",
  "Penn",
  "Columbia",
  "Yale",
  "Princeton",
  "Cornell",
  "Chicago",
];
const JOURNALS = [
  "BMJ",
  "JAMA",
  "Lancet",
  "Nature",
  "Science",
  "PLOS Medicine",
  "Health Affairs",
  "American Economic Review",
  "Journal of Health Economics",
  "Nature Energy",
  "Nature Human Behaviour",
  "Economics and Human Biology",
  "Journal of Urban Economics",
  "Review of Economic Studies",
  "Quarterly Journal of Economics",
  "Journal of Political Economy",
  "Econometrica",
  "Annals of Internal Medicine",
  "New England Journal of Medicine",
  "Pediatrics",
  "JAMA Pediatrics",
  "JAMA Network Open",
  "Circulation",
  "Diabetes Care",
  "Obesity",
  "Transportation Research",
  "Energy Policy",
  "Journal of Public Economics",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, w: string) =>
  new RegExp(`(^|[^A-Za-z])${escape(w)}(?![A-Za-z])`, "i").test(text);
const firstWord = (text: string, w: string) =>
  new RegExp(`(^|[^A-Za-z])(${escape(w)})(?![A-Za-z])`).exec(text);

interface Attempt {
  kind: Kind;
  from: string;
  to: string;
  text: string;
}
// Journals and bodies that take "the" in running text, so "the BMJ" -> "Nature" and "JAMA" -> "the Lancet" read right.
const TAKES_THE = new Set([
  "BMJ",
  "Lancet",
  "American Economic Review",
  "Journal of Health Economics",
  "Journal of Urban Economics",
  "Review of Economic Studies",
  "Quarterly Journal of Economics",
  "Journal of Political Economy",
  "New England Journal of Medicine",
  "Journal of Public Economics",
  "World Bank",
  "European Commission",
  "Cour des comptes",
  "IEA",
  "IPCC",
  "OECD",
  "IMF",
  "WHO",
  "CDC",
  "FDA",
  "EPA",
  "DOE",
  "GAO",
  "CBO",
  "MTA",
]);
/** Replaces every whole-word occurrence of `from` in the sentence, fixing the article when the two names differ in taking "the". */
const replaceAllWords = (sentence: string, from: string, to: string) => {
  const fromThe = TAKES_THE.has(from),
    toThe = TAKES_THE.has(to);
  return sentence.replace(
    new RegExp(`(^|[^A-Za-z])((?:[Tt]he )?)${escape(from)}(?![A-Za-z])`, "g"),
    (_, pre: string, article: string) => {
      if (article && !toThe && fromThe) return pre + to;
      if (!article && toThe && !fromThe && pre.trim() !== "") return pre + "the " + to;
      return pre + article + to;
    },
  );
};
/** A name or source from one list, present in the sentence and the evidence, replaced by one of the same list absent from both. */
function tryLists(
  sentence: string,
  evidence: string,
  lists: readonly (readonly string[])[],
  kind: Kind,
  random: () => number,
): Attempt | { reject: string } {
  const candidates: { from: string; list: readonly string[] }[] = [];
  for (const list of lists)
    for (const e of list)
      if (firstWord(sentence, e) && hasWord(evidence, e)) candidates.push({ from: e, list });
  if (candidates.length === 0) return { reject: `${kind}: no listed name in both sentence and evidence` };
  const pick = candidates[Math.floor(random() * candidates.length)]!;
  const options = shuffled(
    pick.list.filter((e) => e !== pick.from && !hasWord(evidence, e) && !hasWord(sentence, e)),
    random,
  );
  if (options.length === 0)
    return { reject: `${kind}: no replacement of the same kind absent from evidence` };
  return { kind, from: pick.from, to: options[0]!, text: replaceAllWords(sentence, pick.from, options[0]!) };
}
/** The evidence passages (lines `id| text`) that contain the sentence's first number: where its fact is stated. */
function factPassages(sentence: string, evidence: string): string {
  const number = /\d(?:[\d,]*\d)?(?:\.\d+)?/.exec(sentence)?.[0]?.replaceAll(",", "");
  if (!number) return "";
  return evidence
    .split("\n")
    .filter((line) => line.replaceAll(",", "").includes(number))
    .join("\n");
}
/** A unit word: present in the sentence and the evidence, replacement absent from both (strict rule). */
function tryUnit(sentence: string, evidence: string, random: () => number): Attempt | { reject: string } {
  if (!/\d/.test(sentence)) return { reject: "unit: sentence has no number" };
  const usable = shuffled(
    UNIT.filter(
      ([a, b]) =>
        firstWord(sentence, a) && hasWord(evidence, a) && !hasWord(evidence, b) && !hasWord(sentence, b),
    ),
    random,
  );
  if (usable.length === 0)
    return { reject: "unit: no unit present in sentence and evidence with a replacement absent from both" };
  const [from, to] = usable[0]!;
  const m = firstWord(sentence, from)!;
  const idx = m.index + m[1]!.length;
  return { kind: "unit", from, to, text: sentence.slice(0, idx) + to + sentence.slice(idx + from.length) };
}
/**
 * A direction word, flipped. Direction words are common, so the strict rule is applied to the passages that
 * state the sentence's fact (those containing its first number): the original direction must be there and the
 * flipped one must not be. Pre-registered amendment of 2026-10-10, before any judge was run on these pairs.
 */
function tryPolarity(sentence: string, evidence: string, random: () => number): Attempt | { reject: string } {
  if (!/\d/.test(sentence)) return { reject: "polarity: sentence has no number" };
  const fact = factPassages(sentence, evidence);
  if (!fact) return { reject: "polarity: no evidence passage contains the sentence's number" };
  const usable = shuffled(
    POLARITY.filter(
      ([a, b]) => firstWord(sentence, a) && hasWord(fact, a) && !hasWord(fact, b) && !hasWord(sentence, b),
    ),
    random,
  );
  if (usable.length === 0)
    return {
      reject: "polarity: no direction word shared with the fact's passage whose flip is absent from it",
    };
  const [from, to] = usable[0]!;
  const m = firstWord(sentence, from)!;
  const idx = m.index + m[1]!.length;
  return {
    kind: "polarity",
    from,
    to,
    text: sentence.slice(0, idx) + to + sentence.slice(idx + from.length),
  };
}

const results = await loadBlindResults(values.input);
const records = (await sentencesOf(results)).filter((r) => r.verdict === "supported");
const random = seededRandom(Number(values.seed));
type TypedPair = Omit<Pair, "kind"> & { kind: Kind };
const pairsOut: TypedPair[] = [];
const rejections = new Map<string, number>();
const log = (reason: string) => rejections.set(reason, (rejections.get(reason) ?? 0) + 1);
for (const r of records) {
  const corpus = await corpusFor(r.pack);
  const evidence = rebuildEvidence(corpus, r.evidenceIds).text;
  const attempts: (Attempt | { reject: string })[] = [
    tryPolarity(r.text, evidence, random),
    tryUnit(r.text, evidence, random),
    tryLists(r.text, evidence, [COUNTRIES, CITIES], "entity", random),
    tryLists(r.text, evidence, [ORGS, JOURNALS], "attribution", random),
  ];
  for (const a of attempts) {
    if ("reject" in a) {
      log(a.reject);
      continue;
    }
    pairsOut.push({
      id: `${r.id}|${a.kind}`,
      runId: r.runId,
      pack: r.pack,
      motion: r.motion,
      model: r.model,
      side: r.side,
      turn: r.turn,
      original: r.text,
      perturbed: a.text,
      kind: a.kind,
      from: a.from,
      to: a.to,
      evidenceIds: r.evidenceIds,
      split: TEST_PACKS.includes(r.pack) ? "test" : TRAIN_PACKS.includes(r.pack) ? "train" : "test",
      debate: { isClaim: r.isClaim, supported: r.supported, contradicts: r.contradicts },
    });
  }
}
await writeFile(values.out, pairsOut.map((p) => JSON.stringify(p)).join("\n") + "\n");
const count = (pick: (p: TypedPair) => string) => {
  const m = new Map<string, number>();
  for (const p of pairsOut) m.set(pick(p), (m.get(pick(p)) ?? 0) + 1);
  return [...m]
    .sort()
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
};
console.log(`${pairsOut.length} pairs from ${records.length} supported sentences -> ${values.out}`);
console.log(`by kind: ${count((p) => p.kind)}`);
console.log(`by split: ${count((p) => p.split)}`);
console.log(`by kind and split: ${count((p) => `${p.kind}/${p.split}`)}`);
console.log("rejections:");
for (const [k, v] of [...rejections].sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);
console.log("\nexamples:");
for (const kind of ["polarity", "unit", "entity", "attribution"] as Kind[])
  for (const p of pairsOut.filter((p) => p.kind === kind).slice(0, 2))
    console.log(`  [${kind}] ${p.from} -> ${p.to}: ${p.perturbed}`);

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { judgeSentence } from "@/lib/jev/judge";
import { seededRandom, shuffled } from "@/lib/random";
import {
  corpusFor,
  loadBlindResults,
  pct,
  rebuildEvidence,
  runPool,
  sentencesOf,
  writeReport,
} from "./common";

// Takes sentences the judge called supported, changes one number in each, and asks the judge again
// with the same evidence. A judge that catches wrong numbers calls the altered sentence contradicted;
// one that does not leaves it supported or unverified. The unaltered sentence is judged again too, as a
// consistency check. Costs Jev input tokens only.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
    n: { type: "string", default: "150" },
    seed: { type: "string", default: "11" },
    concurrency: { type: "string", default: "6" },
  },
});

// A number may carry thousands separators but never ends in a comma: `2009,` is 2009 and a comma.
const NUMBER = /\d(?:[\d,]*\d)?(?:\.\d+)?/g;

interface Perturbation {
  text: string;
  kind: "year" | "percent" | "other";
  from: string;
  to: string;
}

function perturb(text: string, random: () => number, evidenceText: string): Perturbation | null {
  const matches = [...text.matchAll(NUMBER)].filter((m) => !/\[[PW]\d*$/.test(text.slice(0, m.index)));
  for (const match of matches) {
    const raw = match[0];
    const value = Number.parseFloat(raw.replaceAll(",", ""));
    if (!Number.isFinite(value)) continue;
    const after = text
      .slice((match.index ?? 0) + raw.length, (match.index ?? 0) + raw.length + 12)
      .toLowerCase();
    const isYear = /^(1[89]|20)\d\d$/.test(raw);
    const isPercent = /^\s*(percent|%|per cent|percentage)/.test(after);
    for (let attempt = 0; attempt < 6; attempt++) {
      let next: number;
      if (isYear) next = value + (random() < 0.5 ? -1 : 1) * (3 + Math.floor(random() * 5));
      else if (isPercent)
        next =
          value < 50
            ? Math.round(value * (1.6 + random() * 0.6))
            : Math.round(value * (0.45 + random() * 0.2));
      else next = Math.round(value * (1.9 + random() * 1.2) * 10) / 10;
      if (Number.isInteger(value)) next = Math.round(next);
      if (next === value || next <= 0) continue;
      let replacement = String(next);
      if (raw.includes(",")) replacement = next.toLocaleString("en-US");
      const plain = replacement.replaceAll(",", "");
      if (evidenceText.replaceAll(",", "").includes(plain)) continue;
      const perturbed =
        text.slice(0, match.index) + replacement + text.slice((match.index ?? 0) + raw.length);
      return {
        text: perturbed,
        kind: isYear ? "year" : isPercent ? "percent" : "other",
        from: raw,
        to: replacement,
      };
    }
  }
  return null;
}

const results = await loadBlindResults(values.input, values.run);
const supported = (await sentencesOf(results)).filter((r) => r.verdict === "supported");
const random = seededRandom(Number(values.seed));
const picked = shuffled(supported, random).slice(0, Number(values.n));
console.log(`${supported.length} supported sentences, judging ${picked.length} original and perturbed`);

const rows = await runPool(picked, Number(values.concurrency), async (r, i) => {
  const corpus = await corpusFor(r.pack);
  const evidence = rebuildEvidence(corpus, r.evidenceIds);
  const change = perturb(r.text, seededRandom(Number(values.seed) + i), evidence.text);
  if (!change) return null;
  const [again, altered] = await Promise.all([
    judgeSentence({ motion: r.motion, side: r.side, sentence: r.text, evidence, mode: "blind" }),
    judgeSentence({ motion: r.motion, side: r.side, sentence: change.text, evidence, mode: "blind" }),
  ]);
  process.stdout.write(
    `${i + 1}/${picked.length} ${change.kind} ${change.from}->${change.to}: ${again.verdict} / ${altered.verdict}\n`,
  );
  return {
    id: r.id,
    model: r.model,
    pack: r.pack,
    original: r.text,
    perturbed: change.text,
    kind: change.kind,
    from: change.from,
    to: change.to,
    again,
    altered,
  };
});
const pairs = rows.filter((r): r is NonNullable<typeof r> => r !== null);

const count = (items: typeof pairs, pick: (p: (typeof pairs)[number]) => string) => {
  const out = new Map<string, number>();
  for (const p of items) out.set(pick(p), (out.get(pick(p)) ?? 0) + 1);
  return out;
};
const lines: string[] = [`# Perturbation test (${pairs.length} sentences, seed ${values.seed})\n`];
lines.push(
  "Each sentence was judged supported during a debate. It is judged again unchanged (consistency) and with one number altered (sensitivity), against the same evidence.\n",
);
const again = count(pairs, (p) => p.again.verdict);
const altered = count(pairs, (p) => p.altered.verdict);
lines.push("| judged again | unchanged | number altered |");
lines.push("|---|---:|---:|");
for (const v of ["supported", "contradicted", "unverified", "opinion"])
  lines.push(
    `| ${v} | ${again.get(v) ?? 0} (${pct(again.get(v) ?? 0, pairs.length).trim()}) | ${altered.get(v) ?? 0} (${pct(altered.get(v) ?? 0, pairs.length).trim()}) |`,
  );
const detected = pairs.filter((p) => p.altered.verdict === "contradicted").length;
const missed = pairs.filter((p) => p.altered.verdict === "supported").length;
lines.push(
  `\n**Detection rate** (altered sentence called contradicted): ${pct(detected, pairs.length).trim()}. **Accepted as supported anyway**: ${pct(missed, pairs.length).trim()}.\n`,
);
lines.push("| number kind | n | contradicted | still supported | unverified | mean p(contradicts) |");
lines.push("|---|---:|---:|---:|---:|---:|");
for (const kind of ["year", "percent", "other"]) {
  const items = pairs.filter((p) => p.kind === kind);
  if (items.length === 0) continue;
  const c = items.filter((p) => p.altered.verdict === "contradicted").length;
  const s = items.filter((p) => p.altered.verdict === "supported").length;
  const u = items.filter((p) => p.altered.verdict === "unverified").length;
  const mean = items.reduce((t, p) => t + p.altered.contradicts, 0) / items.length;
  lines.push(
    `| ${kind} | ${items.length} | ${pct(c, items.length).trim()} | ${pct(s, items.length).trim()} | ${pct(u, items.length).trim()} | ${mean.toFixed(2)} |`,
  );
}
lines.push("\n## Misses: altered numbers the judge still called supported\n");
for (const p of pairs.filter((p) => p.altered.verdict === "supported").slice(0, 40)) {
  lines.push(
    `- (${p.model}, ${p.pack}) ${p.from} → ${p.to}: "${p.perturbed}" · p(supported) ${p.altered.supported.toFixed(2)}, p(contradicts) ${p.altered.contradicts.toFixed(2)}`,
  );
}
const cost = pairs.reduce((t, p) => t + p.again.costUsd + p.altered.costUsd, 0);
lines.push(`\nJev cost of this test: $${cost.toFixed(4)}.`);
const text = lines.join("\n") + "\n";
console.log(text);
const suffix = values.run ? `-${values.run}` : "";
await writeFile(
  `bench/analysis/perturb${suffix}.jsonl`,
  pairs.map((p) => JSON.stringify(p)).join("\n") + "\n",
);
console.log(
  `Wrote ${await writeReport(`perturb${suffix}.md`, text)} and bench/analysis/perturb${suffix}.jsonl`,
);

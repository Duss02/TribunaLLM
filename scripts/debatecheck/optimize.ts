import { parseArgs } from "node:util";
import { mkdir, writeFile } from "node:fs/promises";
import { generateText } from "ai";
import { resolveDebater } from "@/lib/models/debater";
import { seededRandom, shuffled } from "@/lib/random";
import { corpusFor, runPool } from "../analysis/common";
import { type Pair, SHARP, askJev, evidenceText, readJsonl, selectPassages } from "./lib";

// Held-out criterion optimisation for a decision model, after Autorubric's `held_out` strategy, which the
// library does not offer for decision models. Only the text of the `contradicts` option changes; the form
// (relation choice over the top-3 passages) and the other two options stay fixed. Each round: judge a
// training sample with Jev, build an error report with exemplars, ask a reviser model for candidate
// wordings, keep the best by AUROC on the training sample. The winner is then measured once on the
// held-out motions, which the loop never saw.
const { values } = parseArgs({
  options: {
    pairs: { type: "string", default: "bench/debatecheck/pairs.jsonl" },
    reviser: { type: "string", default: "gpt-6.1-sol" },
    rounds: { type: "string", default: "3" },
    candidates: { type: "string", default: "4" },
    "train-size": { type: "string", default: "400" },
    seed: { type: "string", default: "7" },
    concurrency: { type: "string", default: "8" },
    out: { type: "string", default: "bench/debatecheck/optimize" },
  },
});

interface Scored {
  id: string;
  original: number;
  perturbed: number;
  tokens: number;
}
interface Metrics {
  auroc: number;
  detection70: number;
  falseAlarm70: number;
  detection50: number;
  falseAlarm50: number;
  youden70: number;
  n: number;
  tokens: number;
}

function auroc(positives: number[], negatives: number[]): number {
  let wins = 0;
  for (const p of positives) for (const n of negatives) wins += p > n ? 1 : p === n ? 0.5 : 0;
  return wins / Math.max(1, positives.length * negatives.length);
}
function metricsOf(rows: Scored[]): Metrics {
  const pos = rows.map((r) => r.perturbed);
  const neg = rows.map((r) => r.original);
  const rate = (xs: number[], t: number) => xs.filter((x) => x >= t).length / Math.max(1, xs.length);
  const d70 = rate(pos, 0.7),
    f70 = rate(neg, 0.7);
  return {
    auroc: auroc(pos, neg),
    detection70: d70,
    falseAlarm70: f70,
    detection50: rate(pos, 0.5),
    falseAlarm50: rate(neg, 0.5),
    youden70: d70 - f70,
    n: rows.length,
    tokens: rows.reduce((t, r) => t + r.tokens, 0),
  };
}

async function score(text: string, sample: Pair[]): Promise<Scored[]> {
  return runPool(sample, Number(values.concurrency), async (pair) => {
    const corpus = await corpusFor(pair.pack);
    const [o, p] = await Promise.all([
      askJev(
        pair.motion,
        pair.original,
        selectPassages(corpus, pair.evidenceIds, pair.original, 3),
        "relation-sharp",
        text,
      ),
      askJev(
        pair.motion,
        pair.perturbed,
        selectPassages(corpus, pair.evidenceIds, pair.perturbed, 3),
        "relation-sharp",
        text,
      ),
    ]);
    return {
      id: pair.id,
      original: o.contradicts,
      perturbed: p.contradicts,
      tokens: o.inputTokens + p.inputTokens,
    };
  });
}

const all = await readJsonl<Pair>(values.pairs);
const random = seededRandom(Number(values.seed));
const train = shuffled(
  all.filter((p) => p.split === "train"),
  random,
).slice(0, Number(values["train-size"]));
const test = all.filter((p) => p.split === "test");
const byId = new Map(all.map((p) => [p.id, p]));
await mkdir(values.out, { recursive: true });
console.log(
  `train sample ${train.length} of ${all.filter((p) => p.split === "train").length}, held-out ${test.length}; reviser ${values.reviser}`,
);

const reviser = await resolveDebater(values.reviser, { paced: false });
let reviserTokens = { input: 0, output: 0 };

async function revise(
  current: string,
  scored: Scored[],
  history: { text: string; metrics: Metrics }[],
): Promise<string[]> {
  const misses = scored
    .filter((r) => r.perturbed < 0.5)
    .sort((a, b) => a.perturbed - b.perturbed)
    .slice(0, 8);
  const alarms = scored
    .filter((r) => r.original >= 0.5)
    .sort((a, b) => b.original - a.original)
    .slice(0, 8);
  const show = async (r: Scored, which: "original" | "perturbed") => {
    const pair = byId.get(r.id)!;
    const corpus = await corpusFor(pair.pack);
    const sentence = pair[which];
    const passages = selectPassages(corpus, pair.evidenceIds, sentence, 3);
    return `- sentence: "${sentence}"${which === "perturbed" ? ` (number changed ${pair.from} -> ${pair.to}; the evidence has ${pair.from})` : " (unchanged, should not be flagged)"}\n  p(contradicts) = ${r[which].toFixed(2)}\n  evidence:\n${evidenceText(
      passages,
    )
      .split("\n")
      .map((l) => "    " + l.slice(0, 400))
      .join("\n")}`;
  };
  const missText = (await Promise.all(misses.map((r) => show(r, "perturbed")))).join("\n");
  const alarmText = (await Promise.all(alarms.map((r) => show(r, "original")))).join("\n");
  const prompt = `We are tuning the wording of one option of a typed question answered by a small decision model (TypeSafe Jev). The model sees a state {motion, sentence, evidence} and answers the choice question "${"How does the `evidence` relate to `sentence`?"}" with three options:

supports: "${SHARP.supports}"
contradicts: "${current}"
says_nothing: "${SHARP.says_nothing}"

Only the description of the "contradicts" option may change. The goal is that the model gives a high probability to "contradicts" when the evidence states a different figure, date, name or outcome for the same fact the sentence asserts, and a low probability when the sentence is consistent with the evidence or when the evidence does not cover that fact. The model is not a chat model: it reads the option text literally and has no instructions beyond the state and the question. Backticked names refer to fields of the state.

Current metrics on the training sample: AUROC ${history.at(-1)!.metrics.auroc.toFixed(3)}, detection of altered sentences at 0.7: ${(100 * history.at(-1)!.metrics.detection70).toFixed(1)}%, false alarms on unchanged sentences at 0.7: ${(100 * history.at(-1)!.metrics.falseAlarm70).toFixed(1)}%.
${history.length > 1 ? `Earlier wordings tried (AUROC): ${history.map((h) => `${h.metrics.auroc.toFixed(3)} "${h.text}"`).join(" | ")}` : ""}

Altered sentences the model failed to flag (these should get a high probability):
${missText}

Unchanged sentences the model flagged (these should get a low probability):
${alarmText}

Propose ${values.candidates} alternative descriptions for the "contradicts" option. Each must be one sentence of at most 45 words, self-contained, in plain English, and may refer to the fields as \`sentence\` and \`evidence\`. Vary the strategy across candidates (for example: name the kinds of mismatch; insist on the same fact being described; say what does not count, such as a different edition, unit, year of a source, or a figure for a different thing; use an instruction-like phrasing). Output only a JSON array of ${values.candidates} strings.`;
  const { text, usage } = await generateText({
    model: reviser.model,
    prompt,
    maxOutputTokens: 4000,
    reasoning: "medium",
    temperature: 0.8,
  });
  reviserTokens.input += usage.inputTokens ?? 0;
  reviserTokens.output += usage.outputTokens ?? 0;
  const json = /\[[\s\S]*\]/.exec(text)?.[0];
  try {
    const list = JSON.parse(json ?? "[]") as unknown;
    return Array.isArray(list)
      ? list
          .filter((x): x is string => typeof x === "string" && x.trim().length > 10)
          .slice(0, Number(values.candidates))
      : [];
  } catch {
    return [];
  }
}

const history: { text: string; metrics: Metrics; round: number }[] = [];
let bestText = SHARP.contradicts;
let bestScored = await score(bestText, train);
let best = metricsOf(bestScored);
history.push({ text: bestText, metrics: best, round: 0 });
console.log(
  `round 0 seed: AUROC ${best.auroc.toFixed(3)}, det@0.7 ${(100 * best.detection70).toFixed(1)}%, FA@0.7 ${(100 * best.falseAlarm70).toFixed(1)}%`,
);
let jevTokens = best.tokens;

for (let round = 1; round <= Number(values.rounds); round++) {
  const candidates = await revise(bestText, bestScored, history);
  if (candidates.length === 0) {
    console.log(`round ${round}: reviser returned nothing usable`);
    continue;
  }
  const results: { text: string; scored: Scored[]; metrics: Metrics }[] = [];
  for (const text of candidates) {
    const scored = await score(text, train);
    const metrics = metricsOf(scored);
    jevTokens += metrics.tokens;
    results.push({ text, scored, metrics });
    history.push({ text, metrics, round });
    console.log(
      `round ${round}: AUROC ${metrics.auroc.toFixed(3)}, det@0.7 ${(100 * metrics.detection70).toFixed(1)}%, FA@0.7 ${(100 * metrics.falseAlarm70).toFixed(1)}% <- "${text.slice(0, 110)}${text.length > 110 ? "…" : ""}"`,
    );
  }
  const winner = results.sort((a, b) => b.metrics.auroc - a.metrics.auroc)[0]!;
  if (winner.metrics.auroc > best.auroc) {
    best = winner.metrics;
    bestText = winner.text;
    bestScored = winner.scored;
    console.log(`round ${round}: new best AUROC ${best.auroc.toFixed(3)}`);
  } else console.log(`round ${round}: no candidate beat ${best.auroc.toFixed(3)}`);
  await writeFile(
    `${values.out}/round-${round}.json`,
    JSON.stringify(
      {
        round,
        candidates: results.map((r) => ({ text: r.text, metrics: r.metrics })),
        best: { text: bestText, metrics: best },
      },
      null,
      2,
    ),
  );
}

console.log("\nheld-out evaluation (motions never seen by the loop):");
const seedTest = metricsOf(await score(SHARP.contradicts, test));
const bestTest = metricsOf(await score(bestText, test));
jevTokens += seedTest.tokens + bestTest.tokens;
const line = (name: string, m: Metrics) =>
  `${name.padEnd(10)} AUROC ${m.auroc.toFixed(3)}  det@0.7 ${(100 * m.detection70).toFixed(1)}%  FA@0.7 ${(100 * m.falseAlarm70).toFixed(1)}%  det@0.5 ${(100 * m.detection50).toFixed(1)}%  FA@0.5 ${(100 * m.falseAlarm50).toFixed(1)}%  (n=${m.n})`;
console.log(line("seed", seedTest));
console.log(line("optimised", bestTest));
console.log(`\nbest wording: "${bestText}"`);
console.log(
  `Jev input tokens ${jevTokens} ($${((jevTokens * 0.042) / 1e6).toFixed(3)}); reviser ${reviserTokens.input} in / ${reviserTokens.output} out`,
);
await writeFile(
  `${values.out}/result.json`,
  JSON.stringify(
    {
      seed: { text: SHARP.contradicts, train: history[0]!.metrics, test: seedTest },
      best: { text: bestText, train: best, test: bestTest },
      history,
      trainSample: train.map((p) => p.id),
      reviser: values.reviser,
      jevTokens,
      reviserTokens,
    },
    null,
    2,
  ),
);
console.log(`Wrote ${values.out}/result.json`);

import { parseArgs } from "node:util";
import { writeFile } from "node:fs/promises";
import { generateText } from "ai";
import { resolveDebater } from "@/lib/models/debater";
import {
  cohenKappa,
  corpusFor,
  loadBlindResults,
  pct,
  rebuildEvidence,
  runPool,
  sentencesOf,
  stratified,
  writeReport,
} from "./common";

// Asks a language model the judge's questions about a stratified sample of sentences, with the same
// evidence Jev read, and reports how often the two agree. Agreement is not truth, but a wide gap on
// contradictions says one of them is wrong often.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
    judge: { type: "string", default: "deepseek-v4-pro" },
    reasoning: { type: "string", default: "medium" },
    contradicted: { type: "string", default: "80" },
    supported: { type: "string", default: "60" },
    unverified: { type: "string", default: "60" },
    opinion: { type: "string", default: "30" },
    seed: { type: "string", default: "23" },
    concurrency: { type: "string", default: "4" },
  },
});

type Label = "opinion" | "supports" | "contradicts" | "says_nothing";
const jevLabel = (verdict: string): Label =>
  verdict === "opinion"
    ? "opinion"
    : verdict === "contradicted"
      ? "contradicts"
      : verdict === "supported"
        ? "supports"
        : "says_nothing";

const results = await loadBlindResults(values.input, values.run);
const records = await sentencesOf(results);
const sample = stratified(
  records,
  {
    contradicted: Number(values.contradicted),
    supported: Number(values.supported),
    unverified: Number(values.unverified),
    opinion: Number(values.opinion),
  },
  Number(values.seed),
);
console.log(
  `${records.length} sentences, judging ${sample.length} with ${values.judge} (reasoning ${values.reasoning})`,
);
const debater = await resolveDebater(values.judge, { paced: false });
let inputTokens = 0,
  outputTokens = 0;

const SYSTEM = `You are a strict fact-check judge in a debate. You see a motion, one sentence a debater said, and numbered evidence passages. Answer only with JSON of this exact shape:
{"is_claim": true|false, "relation": "supports"|"contradicts"|"says_nothing", "passage": "<id>"|null, "reason": "<at most 20 words>"}
Rules: is_claim is true when the sentence asserts a checkable fact about the world (numbers, events, causes), false for opinions, value judgments, questions or rhetorical framing. relation is "supports" when a passage states the claim or directly implies it is true, "contradicts" when a passage states or directly implies it is false (a different number, date or outcome for the same thing counts), and "says_nothing" when no passage addresses what the sentence asserts. passage is the id of the passage you relied on, or null.`;

const rows = await runPool(sample, Number(values.concurrency), async (r, i) => {
  const corpus = await corpusFor(r.pack);
  const evidence = rebuildEvidence(corpus, r.evidenceIds);
  const { text, usage } = await generateText({
    model: debater.model,
    system: SYSTEM,
    prompt: `Motion: ${r.motion}\nSide: ${r.side}\nSentence: ${r.text}\n\nEvidence:\n${evidence.text}`,
    maxOutputTokens: 3000,
    reasoning: values.reasoning as "low" | "medium" | "high",
    temperature: 0,
  });
  inputTokens += usage.inputTokens ?? 0;
  outputTokens += usage.outputTokens ?? 0;
  const json = /\{[\s\S]*\}/.exec(text)?.[0];
  let parsed: { is_claim?: boolean; relation?: string; passage?: string | null; reason?: string } = {};
  try {
    parsed = json ? JSON.parse(json) : {};
  } catch {
    parsed = {};
  }
  const llm: Label | null =
    parsed.is_claim === false
      ? "opinion"
      : parsed.relation === "supports" ||
          parsed.relation === "contradicts" ||
          parsed.relation === "says_nothing"
        ? parsed.relation
        : null;
  process.stdout.write(`${i + 1}/${sample.length} jev ${jevLabel(r.verdict)} / llm ${llm ?? "unparsed"}\n`);
  return {
    id: r.id,
    model: r.model,
    pack: r.pack,
    text: r.text,
    jev: jevLabel(r.verdict),
    jevProbabilities: { isClaim: r.isClaim, supported: r.supported, contradicts: r.contradicts },
    llm,
    llmPassage: parsed.passage ?? null,
    reason: parsed.reason ?? null,
    raw: llm ? undefined : text.slice(0, 300),
  };
});
const judged = rows.filter((r) => r.llm !== null) as (Omit<(typeof rows)[number], "llm"> & { llm: Label })[];

const labels: Label[] = ["opinion", "supports", "contradicts", "says_nothing"];
const lines: string[] = [
  `# Second judge: ${values.judge} vs Jev (${judged.length} of ${sample.length} sentences parsed, seed ${values.seed})\n`,
];
lines.push(
  "Rows are Jev's verdict, columns the model's. The sample is stratified, so the totals are not the debate's distribution.\n",
);
lines.push(`| Jev \\ ${values.judge} | ${labels.join(" | ")} | agree |`);
lines.push(`|---|${labels.map(() => "---:").join("|")}|---:|`);
for (const a of labels) {
  const mine = judged.filter((r) => r.jev === a);
  lines.push(
    `| ${a} | ${labels.map((b) => mine.filter((r) => r.llm === b).length).join(" | ")} | ${pct(mine.filter((r) => r.llm === a).length, mine.length).trim()} |`,
  );
}
const agree = judged.filter((r) => r.jev === r.llm).length;
lines.push(
  `\nOverall agreement ${pct(agree, judged.length).trim()}, Cohen's κ ${cohenKappa(
    judged.map((r) => r.jev),
    judged.map((r) => r.llm),
  ).toFixed(2)}.`,
);
const claims = judged.filter((r) => r.jev !== "opinion" && r.llm !== "opinion");
lines.push(
  `On sentences both call claims (${claims.length}): relation agreement ${pct(claims.filter((r) => r.jev === r.llm).length, claims.length).trim()}, κ ${cohenKappa(
    claims.map((r) => r.jev),
    claims.map((r) => r.llm),
  ).toFixed(2)}.`,
);
const jevC = judged.filter((r) => r.jev === "contradicts");
const llmC = judged.filter((r) => r.llm === "contradicts");
lines.push(
  `Of Jev's ${jevC.length} contradictions the model confirms ${jevC.filter((r) => r.llm === "contradicts").length}; of the model's ${llmC.length} contradictions Jev had ${llmC.filter((r) => r.jev === "contradicts").length}.\n`,
);
lines.push("## Disagreements on contradiction\n");
for (const r of judged.filter((r) => (r.jev === "contradicts") !== (r.llm === "contradicts")).slice(0, 60)) {
  lines.push(
    `- Jev **${r.jev}** (p_contra ${r.jevProbabilities.contradicts.toFixed(2)}, p_sup ${r.jevProbabilities.supported.toFixed(2)}), ${values.judge} **${r.llm}**${r.llmPassage ? ` via ${r.llmPassage}` : ""}: "${r.text}" (${r.model}, ${r.pack})${r.reason ? ` — ${r.reason}` : ""}`,
  );
}
lines.push(`\n${values.judge} used ${inputTokens} input and ${outputTokens} output tokens.`);
const text = lines.join("\n") + "\n";
console.log(text);
const suffix = `${values.run ? `-${values.run}` : ""}-${values.judge}`;
await writeFile(
  `bench/analysis/second-judge${suffix}.jsonl`,
  rows.map((r) => JSON.stringify(r)).join("\n") + "\n",
);
console.log(`Wrote ${await writeReport(`second-judge${suffix}.md`, text)}`);

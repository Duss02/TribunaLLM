import { parseArgs } from "node:util";
import { existsSync, readdirSync, readFileSync } from "node:fs";

// What the study's API calls cost per provider, from the token counts the judge files carry and the
// Autorubric experiment records, at list prices (lib/bench/prices.ts; Jev 0.042 USD per million input
// tokens; Decisions API 0.10 per million input tokens). Checks the pre-registered stopping rule.
const { values } = parseArgs({ options: { experiments: { type: "string", default: "" } } });
const rows = (f: string): any[] =>
  existsSync(f)
    ? readFileSync(f, "utf8")
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l))
    : [];
const M = 1e6;
const spend: Record<string, Record<string, number>> = {
  OpenAI: {},
  TypeSafe: {},
  DeepSeek: {},
  Anthropic: {},
};
const add = (provider: string, what: string, usd: number) =>
  (spend[provider]![what] = (spend[provider]![what] ?? 0) + usd);

for (const f of [
  "decisions-gpt-6-luna.jsonl",
  "decisions-gpt-6-luna-types.jsonl",
  "decisions-gpt-6-luna-loose.jsonl",
]) {
  let t = 0;
  for (const r of rows(`bench/debatecheck/${f}`))
    for (const a of Object.values(r.answers as Record<string, any>))
      t += a.original.inputTokens + a.perturbed.inputTokens;
  add("OpenAI", f, (t * 0.1) / M);
}
for (const f of ["jev-variants-types.jsonl"]) {
  let t = 0;
  for (const r of rows(`bench/debatecheck/${f}`))
    for (const a of Object.values(r.answers as Record<string, any>))
      t += a.original.inputTokens + a.perturbed.inputTokens;
  add("TypeSafe", f, (t * 0.042) / M);
}
const llm = (f: string, provider: string, inP: number, outP: number) => {
  let i = 0,
    o = 0;
  for (const r of rows(`bench/debatecheck/${f}`))
    for (const s of ["original", "perturbed"]) {
      i += r[s].inputTokens ?? 0;
      o += r[s].outputTokens ?? 0;
    }
  add(provider, f, (i * inP + o * outP) / M);
};
llm("llm-gpt-6-luna-framed.jsonl", "OpenAI", 0.1, 0.5);
llm("llm-gpt-6-luna-framed-types.jsonl", "OpenAI", 0.1, 0.5);
llm("llm-deepseek-v4-pro-framed.jsonl", "DeepSeek", 0.211, 0.422);
llm("llm-deepseek-v4-pro-framed-types.jsonl", "DeepSeek", 0.211, 0.422);
llm("llm-claude-sonnet-5.5-framed.jsonl", "Anthropic", 2, 10);
// Decisions API on the panels: input tokens were printed by the run, not stored per item (CHARM 114k, HealthBench 141k).
add("OpenAI", "decisions on panels", ((114_000 + 141_392) * 0.1) / M);
// Autorubric experiments: token_usage per item; cost at list price by judge name.
const price: Record<string, [number, number]> = {
  "jev-": [0.042, 0],
  "llm-openai_gpt-6-luna": [0.1, 0.5],
  "llm-deepseek_deepseek-v4-pro": [0.211, 0.422],
  "llm-anthropic_claude-sonnet-5-5": [2, 10],
};
const providerOf: Record<string, string> = {
  "jev-": "TypeSafe",
  "llm-openai_gpt-6-luna": "OpenAI",
  "llm-deepseek_deepseek-v4-pro": "DeepSeek",
  "llm-anthropic_claude-sonnet-5-5": "Anthropic",
};
for (const dir of values.experiments.split(",").filter(Boolean)) {
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (!/charm100|healthbench-100-test/.test(name)) continue;
    const key = Object.keys(price).find((k) => name.startsWith(k));
    if (!key) continue;
    const f = `${dir}/${name}/items.jsonl`;
    let i = 0,
      o = 0;
    for (const r of rows(f)) {
      const u = r.report?.token_usage;
      if (u) {
        i += u.prompt_tokens ?? 0;
        o += u.completion_tokens ?? 0;
      }
    }
    // Jev through Autorubric: the LLM-judge runs re-read Jev from the cache, so only the jev-* experiments count.
    add(providerOf[key]!, `autorubric ${name}`, (i * price[key]![0] + o * price[key]![1]) / M);
  }
}
let total = 0;
const estimate: Record<string, number> = { OpenAI: 6, TypeSafe: 3, DeepSeek: 4, Anthropic: 5 };
for (const [p, parts] of Object.entries(spend)) {
  const sum = Object.values(parts).reduce((a, b) => a + b, 0);
  total += sum;
  console.log(
    `${p}: $${sum.toFixed(2)} (estimate ${estimate[p]}, stop at ${(1.5 * estimate[p]!).toFixed(1)})`,
  );
  for (const [k, v] of Object.entries(parts)) console.log(`   ${v.toFixed(3).padStart(7)}  ${k}`);
}
console.log(`total: $${total.toFixed(2)}`);

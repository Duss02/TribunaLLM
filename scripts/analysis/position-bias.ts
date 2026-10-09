import { parseArgs } from "node:util";
import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { getKey } from "@/lib/credentials";
import { judgeModelId } from "@/lib/jev/judge";
import { isRetracted } from "@/lib/jev/verdict";
import { loadBlindResults, pct, runPool, writeReport } from "./common";

// Asks the final verdict question again for every debate, once with PRO listed first (as in the
// tournament) and once with CON first, over the same surviving transcripts. The shift in p(PRO) is the
// first-option bias Jev's documentation warns about.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
    concurrency: { type: "string", default: "6" },
  },
});

const apiKey = getKey("TYPESAFE_API_KEY");
if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set.");
const client = new TypeSafeClient({ apiKey, timeout: 15_000, logLevel: "error" });
const QUESTION = "Which side made the stronger and more factually sound case for its position?";

const results = await loadBlindResults(values.input, values.run);
const standing = (r: (typeof results)[number], side: "PRO" | "CON") =>
  (r.transcript ?? [])
    .filter((t) => t.side === side)
    .map((t) => ({
      round: t.round,
      text: t.sentences
        .filter((s) => !s.dropped && s.verdict !== null && !isRetracted(s.verdict))
        .map((s) => s.text)
        .join(" "),
    }))
    .filter((t) => t.text)
    .map((t) => `Round ${t.round}: ${t.text}`)
    .join("\n\n");

const rows = await runPool(results, Number(values.concurrency), async (r, i) => {
  const { motion } = await (await import("./common")).corpusFor(r.pack).then((c) => c.pack);
  const state = { motion, transcriptPro: standing(r, "PRO"), transcriptCon: standing(r, "CON") };
  const ask = async (first: "PRO" | "CON") => {
    const options =
      first === "PRO"
        ? { PRO: null, CON: null, tie: "neither side is clearly stronger" }
        : { CON: null, PRO: null, tie: "neither side is clearly stronger" };
    const { answers } = await client.systemOne({
      state,
      questions: { verdict: choice(QUESTION, options) },
      model: judgeModelId(),
    });
    const p = answers.verdict.probabilities as Record<string, number>;
    return { pro: p.PRO ?? 0, con: p.CON ?? 0, tie: p.tie ?? 0 };
  };
  const [proFirst, conFirst] = await Promise.all([ask("PRO"), ask("CON")]);
  process.stdout.write(
    `${i + 1}/${results.length} ${r.pack} ${r.pro} v ${r.con}: p(PRO) ${proFirst.pro.toFixed(2)} PRO-first, ${conFirst.pro.toFixed(2)} CON-first (recorded ${r.verdict.pro.toFixed(2)})\n`,
  );
  return { r, proFirst, conFirst };
});

const shift = rows.map((x) => x.proFirst.pro - x.conFirst.pro);
const mean = shift.reduce((a, b) => a + b, 0) / Math.max(1, shift.length);
const sd = Math.sqrt(shift.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, shift.length - 1));
const leader = (p: { pro: number; con: number; tie: number }) =>
  p.tie >= Math.max(p.pro, p.con) ? "tie" : p.pro > p.con ? "PRO" : "CON";
const flips = rows.filter((x) => leader(x.proFirst) !== leader(x.conFirst)).length;
const rerunDrift = rows.map((x) => Math.abs(x.proFirst.pro - x.r.verdict.pro));
const lines: string[] = [`# Position bias in the final verdict (${rows.length} blind debates)\n`];
lines.push(
  "The same surviving transcripts, the same question, the options listed PRO-first (as in the tournament) and CON-first.\n",
);
lines.push(
  `- Mean p(PRO) with PRO first: ${(rows.reduce((a, x) => a + x.proFirst.pro, 0) / rows.length).toFixed(3)}; with CON first: ${(rows.reduce((a, x) => a + x.conFirst.pro, 0) / rows.length).toFixed(3)}.`,
);
lines.push(
  `- Mean shift in p(PRO) from listing PRO first: ${mean >= 0 ? "+" : ""}${mean.toFixed(3)} (sd ${sd.toFixed(3)}, standard error ${(sd / Math.sqrt(rows.length)).toFixed(3)}).`,
);
lines.push(
  `- Leading side changes with the order in ${flips} of ${rows.length} debates (${pct(flips, rows.length).trim()}).`,
);
lines.push(
  `- Rerun drift (same order as the tournament): mean |Δp(PRO)| ${(rerunDrift.reduce((a, b) => a + b, 0) / rows.length).toFixed(3)}, max ${Math.max(...rerunDrift).toFixed(3)}.`,
);
const text = lines.join("\n") + "\n";
console.log(text);
console.log(`Wrote ${await writeReport(`position-bias${values.run ? `-${values.run}` : ""}.md`, text)}`);

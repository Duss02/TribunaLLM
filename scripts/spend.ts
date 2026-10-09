import { parseArgs } from "node:util";
import { PRICES_AS_OF, debaterCostUsd } from "@/lib/bench/prices";
import { type OkResult, readResultsDirectory } from "@/lib/bench/results";
import { findEntry } from "@/lib/models/registry";
import { sum } from "@/lib/stats";

// What the tournament has spent so far, per model and per vendor, from the tokens each result line
// records and the list prices in lib/bench/prices.ts. Jev cost is what each debate measured.
const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    run: { type: "string" },
  },
});

const lines = await readResultsDirectory(values.input);
const ok = lines.filter(
  (line): line is OkResult => line.status === "ok" && (!values.run || line.runId === values.run),
);
if (ok.length === 0) {
  console.log(`No completed debates in ${values.input}${values.run ? ` for run ${values.run}` : ""}.`);
  process.exit(0);
}

interface Row {
  debates: number;
  input: number;
  output: number;
  usd: number | null;
}
const byModel = new Map<string, Row>();
for (const r of ok) {
  for (const side of ["PRO", "CON"] as const) {
    const key = side === "PRO" ? r.pro : r.con;
    const row = byModel.get(key) ?? { debates: 0, input: 0, output: 0, usd: 0 };
    const tokens = r.tokens[side];
    row.debates++;
    row.input += tokens.input;
    row.output += tokens.output;
    const usd = debaterCostUsd(key, { inputTokens: tokens.input, outputTokens: tokens.output });
    row.usd = row.usd === null || usd === null ? null : row.usd + usd;
    byModel.set(key, row);
  }
}

const money = (usd: number | null) => (usd === null ? "   n/a" : `$${usd.toFixed(3)}`.padStart(7));
console.log(
  `${ok.length} debates in ${values.input}${values.run ? ` (run ${values.run})` : ""}, list prices as of ${PRICES_AS_OF}\n`,
);
console.log(
  "model".padEnd(24),
  "debates".padStart(7),
  "in tok".padStart(9),
  "out tok".padStart(9),
  "per deb".padStart(8),
  "total".padStart(8),
);
const byVendor = new Map<string, number | null>();
for (const [key, row] of [...byModel].sort((a, b) => (b[1].usd ?? 0) - (a[1].usd ?? 0))) {
  console.log(
    key.padEnd(24),
    String(row.debates).padStart(7),
    String(row.input).padStart(9),
    String(row.output).padStart(9),
    money(row.usd === null ? null : row.usd / row.debates).padStart(8),
    money(row.usd).padStart(8),
  );
  const vendor = findEntry(key)?.vendor ?? "unknown";
  const current = byVendor.get(vendor);
  byVendor.set(vendor, current === null || row.usd === null ? null : (current ?? 0) + row.usd);
}
console.log("\nper vendor (debaters only):");
for (const [vendor, usd] of byVendor) console.log(" ", vendor.padEnd(12), money(usd));
const jev = sum(ok.map((r) => r.judgeStats.costUsd));
console.log(`\nJev (measured): $${jev.toFixed(3)} over ${sum(ok.map((r) => r.judgeStats.calls))} calls`);

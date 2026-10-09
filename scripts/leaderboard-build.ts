import { writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { buildLeaderboard, selectComparable } from "@/lib/bench/leaderboard";
import { type OkResult, debateKey, readResultsDirectory } from "@/lib/bench/results";
import { findEntry } from "@/lib/models/registry";

const { values } = parseArgs({
  options: {
    input: { type: "string", default: "bench/results" },
    output: { type: "string", default: "bench/leaderboard.json" },
    judge: { type: "string" },
    rules: { type: "string" },
    rounds: { type: "string" },
  },
});

try {
  const lines = await readResultsDirectory(values.input);
  const ok = lines.filter((line): line is OkResult => line.status === "ok");
  const played = new Set(ok.map(debateKey));
  const failed = new Set(
    lines.filter((line) => line.status === "failed" && !played.has(debateKey(line))).map(debateKey),
  ).size;

  const board = buildLeaderboard({
    results: selectComparable(ok, {
      judge: values.judge,
      rules: values.rules,
      rounds: values.rounds === undefined ? undefined : Number(values.rounds),
    }),
    failed,
    generatedAt: new Date().toISOString(),
    describe: (key) => {
      const entry = findEntry(key);
      return entry
        ? { key, label: entry.label, vendor: entry.vendor, openWeights: entry.openWeights }
        : { key, label: key, vendor: "unknown", openWeights: false };
    },
  });

  await writeFile(values.output, `${JSON.stringify(board, null, 2)}\n`);

  console.log(
    `${board.debates} debates, ${board.models.length} models, judge ${board.judge}, ${board.rules}${board.mock ? " (MOCK: not a measurement)" : ""}`,
  );
  console.log("");
  console.log(
    "model".padEnd(24),
    "rating".padStart(7),
    "retracted".padStart(10),
    "contradicted".padStart(13),
    "win rate".padStart(9),
    "debates".padStart(8),
  );
  for (const m of board.models) {
    const pct = (v: number | null) => (v === null ? "-" : `${(v * 100).toFixed(1)}%`);
    console.log(
      m.key.padEnd(24),
      m.rating.toFixed(0).padStart(7),
      pct(m.retractionRate).padStart(10),
      pct(m.contradictionRate).padStart(13),
      pct(m.winRate).padStart(9),
      String(m.debates).padStart(8),
    );
  }
  console.log(`\nWrote ${values.output}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

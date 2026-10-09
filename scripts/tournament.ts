import { appendFile, mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { estimateJudgeCost } from "@/lib/bench/estimate";
import {
  type DebateIdentity,
  debateKey,
  failedResultFrom,
  okResultFrom,
  parseResultLines,
} from "@/lib/bench/results";
import { type Pairing, buildSchedule, debateSeed } from "@/lib/bench/schedule";
import { type FinalEvent } from "@/lib/debate/events";
import { runDebate } from "@/lib/debate/orchestrator";
import { type EvidencePack, listPacks, loadPack } from "@/lib/debate/packs";
import { judgeModelId, judgeSetupProblem } from "@/lib/jev/judge";
import { isMockMode } from "@/lib/mock-mode";
import { resolveDebater } from "@/lib/models/debater";
import { listAvailability } from "@/lib/models/availability";
import { NO_MODELS_HINT } from "@/lib/models/pick";
import { rulesVersionFor } from "@/lib/scoring/rules";
import { type Library, loadLibrary } from "@/lib/debate/library";
import { DEFAULT_MODE, isDebateMode } from "@/lib/debate/mode";

const MAX_WORDS = 110;

const { values } = parseArgs({
  options: {
    models: { type: "string" },
    packs: { type: "string", default: "all" },
    rounds: { type: "string", default: "3" },
    repeats: { type: "string", default: "1" },
    concurrency: { type: "string", default: "2" },
    run: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    mode: { type: "string", default: DEFAULT_MODE },
    resume: { type: "boolean", default: false },
  },
});

function stop(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!isDebateMode(values.mode)) stop(`--mode must be blind or evidence, not "${values.mode}".`);
const mode = values.mode;
const rules = rulesVersionFor(mode);
const rounds = Number(values.rounds);
const repeats = Number(values.repeats);
const concurrency = Number(values.concurrency);
if (![rounds, repeats, concurrency].every((n) => Number.isInteger(n) && n >= 1)) {
  stop("--rounds, --repeats and --concurrency must be whole numbers of at least 1.");
}

if (!values["dry-run"]) {
  const problem = judgeSetupProblem();
  if (problem) stop(problem);
}

const statuses = await listAvailability();
const wanted = values.models
  ?.split(",")
  .map((key) => key.trim())
  .filter(Boolean);
const chosen = wanted ?? statuses.filter((s) => s.status === "available").map((s) => s.entry.key);
for (const key of chosen) {
  const status = statuses.find((s) => s.entry.key === key);
  if (!status)
    stop(
      `Unknown model "${key}". The tournament runs registry models only; run pnpm models to list their keys.`,
    );
  if (status.status !== "available") stop(`${key} is ${status.status}: ${status.detail}.`);
}
if (chosen.length < 2)
  stop(`A tournament needs at least two models, found ${chosen.length}. ${NO_MODELS_HINT}`);

const packs: EvidencePack[] =
  values.packs === "all"
    ? await listPacks()
    : await Promise.all(values.packs.split(",").map((slug) => loadPack(slug.trim())));
if (packs.length === 0) stop("No evidence packs found in packs/.");

const directory = path.join("bench", isMockMode() ? "results-mock" : "results");
await mkdir(directory, { recursive: true });

async function latestRunId(): Promise<string> {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".jsonl"));
  const dated = await Promise.all(
    files.map(async (file) => ({ file, at: (await stat(path.join(directory, file))).mtimeMs })),
  );
  const latest = dated.sort((a, b) => b.at - a.at)[0];
  if (!latest) stop(`Nothing to resume: no .jsonl files in ${directory}.`);
  return latest.file.replace(/\.jsonl$/, "");
}

const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
const runId =
  values.run ?? (values.resume ? await latestRunId() : `${isMockMode() ? "mock-" : ""}run-${stamp}`);
const file = path.join(directory, `${runId}.jsonl`);

const existing = await readFile(file, "utf8").catch((error: NodeJS.ErrnoException) => {
  if (error.code === "ENOENT") return null;
  throw error;
});
if (existing !== null && !values.resume && !values["dry-run"]) {
  stop(`${file} already exists. Pass --resume to continue it, or choose another --run id.`);
}
const done = new Set(
  parseResultLines(existing ?? "", file)
    .filter((line) => line.status === "ok")
    .map(debateKey),
);

const schedule = buildSchedule({ models: chosen, packs: packs.map((p) => p.slug), repeats, runId });
const pending = schedule.filter((pairing) => !done.has(debateKey(pairing)));
const packBySlug = new Map(packs.map((pack) => [pack.slug, pack]));
const libraryBySlug = new Map<string, Library | null>(
  await Promise.all(
    packs.map(async (pack) => [pack.slug, mode === "blind" ? await loadLibrary(pack.slug) : null] as const),
  ),
);
if (mode === "blind") {
  const missing = packs.filter((pack) => !libraryBySlug.get(pack.slug)).map((pack) => pack.slug);
  if (missing.length > 0)
    console.warn(
      `No reference library for ${missing.join(", ")}: the judge will check those against the pack alone. Build one with pnpm library:build.`,
    );
}

if (values["dry-run"]) {
  const estimates = pending.map((p) =>
    estimateJudgeCost(
      packBySlug.get(p.pack) as EvidencePack,
      rounds,
      MAX_WORDS,
      mode,
      libraryBySlug.get(p.pack) ?? null,
    ),
  );
  console.log(
    `Run ${runId} | ${mode} mode | ${chosen.length} models | ${packs.length} packs | ${rounds} rounds | ${repeats} repeat(s)`,
  );
  console.log(
    `${schedule.length} debates scheduled, ${done.size} already done, ${pending.length} to play.\n`,
  );
  pending.forEach((p, i) =>
    console.log(`${String(i + 1).padStart(4)}  ${p.pack.padEnd(24)} PRO ${p.pro.padEnd(22)} CON ${p.con}`),
  );
  const calls = estimates.reduce((sum, e) => sum + e.calls, 0);
  const cost = estimates.reduce((sum, e) => sum + e.costUsd, 0);
  console.log(
    `\nEstimated judge load: about ${calls} Jev calls, $${cost.toFixed(2)} at $0.042 per million input tokens.`,
  );
  console.log(
    "Debater cost is not included; it depends on the models and your route. This is an estimate, not a measurement.",
  );
  process.exit(0);
}

const abort = new AbortController();
process.once("SIGINT", () => {
  console.error("\nStopping. Debates in progress are discarded; continue later with --resume.");
  abort.abort();
});

let writing: Promise<void> = Promise.resolve();
const append = (line: unknown) => {
  writing = writing.then(() => appendFile(file, `${JSON.stringify(line)}\n`));
  return writing;
};

async function play(pairing: Pairing): Promise<FinalEvent> {
  const pack = packBySlug.get(pairing.pack) as EvidencePack;
  const [pro, con] = await Promise.all([
    resolveDebater(pairing.pro, { paced: false }),
    resolveDebater(pairing.con, { paced: false }),
  ]);
  let final: FinalEvent | undefined;
  for await (const event of runDebate({
    pack,
    pro,
    con,
    rounds,
    maxWords: MAX_WORDS,
    strictMode: false,
    mode,
    library: libraryBySlug.get(pairing.pack) ?? null,
    seed: debateSeed(runId, pairing),
    signal: abort.signal,
  })) {
    if (event.type === "final") final = event;
  }
  if (!final) throw new Error("The debate ended without a final judgment.");
  return final;
}

let ok = 0;
let failed = 0;
let judgeCost = 0;
let next = 0;
const started = Date.now();
console.log(
  `Run ${runId} | ${pending.length} debates to play, ${concurrency} at a time | judge ${judgeModelId()} | ${mode} mode, ${rules}`,
);

async function worker() {
  while (!abort.signal.aborted) {
    const index = next++;
    const pairing = pending[index];
    if (!pairing) return;
    const identity: DebateIdentity = {
      runId,
      pack: pairing.pack,
      pro: pairing.pro,
      con: pairing.con,
      repeat: pairing.repeat,
    };
    const label = `[${index + 1}/${pending.length}] ${pairing.pro} (PRO) vs ${pairing.con} (CON) on ${pairing.pack}`;
    try {
      const final = await play(pairing);
      await append(
        okResultFrom(
          identity,
          { rules, judge: judgeModelId(), seed: debateSeed(runId, pairing), rounds },
          final,
        ),
      );
      ok++;
      judgeCost += final.stats.judge.costUsd;
      const { PRO, CON, winner } = final.score;
      console.log(
        `${label}: ${PRO.T.toFixed(1)} to ${CON.T.toFixed(1)}, ${winner === "draw" ? "draw" : `${winner} wins`}, ${(final.stats.wallMs / 1000).toFixed(0)} s, $${final.stats.judge.costUsd.toFixed(4)}`,
      );
    } catch (error) {
      if (abort.signal.aborted) return;
      await append(failedResultFrom(identity, error));
      failed++;
      console.error(`${label}: failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
await writing;

console.log(
  `\n${ok} played, ${failed} failed, judge cost $${judgeCost.toFixed(4)}, ${((Date.now() - started) / 60000).toFixed(1)} min.`,
);
if (abort.signal.aborted)
  console.log(`Stopped early. Continue with: pnpm tournament --resume --run ${runId}`);
else if (failed > 0) console.log(`Retry the failures with: pnpm tournament --resume --run ${runId}`);
console.log(
  isMockMode()
    ? `Mock results are in ${directory}. Build from them with: pnpm leaderboard:build --input ${directory}`
    : "Aggregate with: pnpm leaderboard:build",
);

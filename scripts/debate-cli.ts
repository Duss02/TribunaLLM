import { parseArgs } from "node:util";
import { runDebate } from "@/lib/debate/orchestrator";
import { loadLibrary } from "@/lib/debate/library";
import { DEFAULT_MODE, isDebateMode } from "@/lib/debate/mode";
import { listPacks, loadPack } from "@/lib/debate/packs";
import { judgeModelId, judgeSetupProblem } from "@/lib/jev/judge";
import { resolveDebater } from "@/lib/models/debater";
import { NO_MODELS_HINT, availableModels } from "@/lib/models/pick";

const { values } = parseArgs({
  options: {
    pack: { type: "string" },
    pro: { type: "string" },
    con: { type: "string" },
    rounds: { type: "string", default: "3" },
    "max-words": { type: "string", default: "110" },
    seed: { type: "string" },
    strict: { type: "boolean", default: false },
    mode: { type: "string", default: DEFAULT_MODE },
    "list-packs": { type: "boolean", default: false },
  },
});

if (values["list-packs"]) {
  for (const pack of await listPacks()) console.log(`${pack.slug.padEnd(24)} ${pack.motion}`);
  process.exit(0);
}

const problem = judgeSetupProblem();
if (problem) {
  console.error(problem);
  process.exit(1);
}
const available = await availableModels();
if (available.length < 2) {
  console.error(`Need two available models, found ${available.length}. ${NO_MODELS_HINT}`);
  process.exit(1);
}

const style = process.stdout.isTTY
  ? { strike: (text: string) => `\x1b[9m${text}\x1b[29m`, dim: (text: string) => `\x1b[2m${text}\x1b[22m` }
  : { strike: (text: string) => `~~${text}~~`, dim: (text: string) => text };
const MARKS = {
  supported: "+",
  contradicted: "x",
  unsupported: "x",
  uncertain: "?",
  unverified: "~",
  opinion: ".",
  unjudged: "!",
} as const;

try {
  const pack = await loadPack(values.pack ?? (await listPacks())[0]?.slug ?? "");
  const proKey = values.pro ?? available[0]?.entry.key ?? "";
  const conKey = values.con ?? available[1]?.entry.key ?? "";
  const seed = values.seed ? Number(values.seed) : Math.floor(Math.random() * 2 ** 31);
  if (!isDebateMode(values.mode)) throw new Error(`--mode must be blind or evidence, not "${values.mode}".`);
  const mode = values.mode;
  const library = mode === "blind" ? await loadLibrary(pack.slug) : null;
  const pro = await resolveDebater(proKey, { paced: false });
  const con = await resolveDebater(conKey, { paced: false });

  console.log(`Motion: ${pack.motion}`);
  console.log(
    `Pack ${pack.slug} (${pack.passages.length} passages) | PRO ${pro.entry.label} (${pro.route}) | CON ${con.entry.label} (${con.route}) | judge ${judgeModelId()} | mode ${mode}${library ? ` (${library.passages.length} library passages)` : ""} | strict ${values.strict ? "on" : "off"} | seed ${seed}`,
  );

  interface PendingTurn {
    header: string;
    sentences: { id: string; text: string }[];
    verdicts: Map<string, string>;
    notes: string[];
  }
  const turns = new Map<string, PendingTurn>();
  const printTurn = (id: string, closing?: string) => {
    const turn = turns.get(id);
    if (!turn) return;
    turns.delete(id);
    console.log(`\n${turn.header}`);
    for (const sentence of turn.sentences) {
      console.log(turn.verdicts.get(sentence.id) ?? `  [ ] ${sentence.text}`);
    }
    for (const note of turn.notes) console.log(note);
    if (closing) console.log(closing);
  };

  for await (const event of runDebate({
    pack,
    pro,
    con,
    rounds: Number(values.rounds),
    maxWords: Number(values["max-words"]),
    strictMode: values.strict,
    mode,
    library,
    seed,
  })) {
    switch (event.type) {
      case "turn_start":
        turns.set(event.turn, {
          header: `${event.side} | ${event.model} | round ${event.round}`,
          sentences: [],
          verdicts: new Map(),
          notes: [],
        });
        break;
      case "sentence":
        turns.get(event.turn)?.sentences.push({ id: event.id, text: event.text });
        break;
      case "verdict": {
        const turn = turns.get(event.id.replace(/-\d+$/, ""));
        const text = turn?.sentences.find((sentence) => sentence.id === event.id)?.text ?? "";
        const struck = event.verdict === "contradicted" || event.verdict === "unsupported";
        const detail = `${event.verdict} ${event.supported.toFixed(2)}${event.passage ? ` ${event.passage.id}` : ""} ${event.latencyMs} ms`;
        turn?.verdicts.set(
          event.id,
          `  [${MARKS[event.verdict]}] ${struck ? style.strike(text) : text}  ${style.dim(detail)}`,
        );
        break;
      }
      case "rewind": {
        const turn = turns.get(event.turn);
        turn?.sentences.splice(
          0,
          turn.sentences.length,
          ...turn.sentences.filter((s) => !event.dropped.includes(s.id)),
        );
        turn?.notes.push(
          `  rewind: ${event.retracted} retracted, dropped ${event.dropped.join(", ") || "nothing"}`,
        );
        break;
      }
      case "turn_verdict":
        printTurn(
          event.turn,
          style.dim(
            `  turn: rebuts ${event.rebuts === null ? "-" : event.rebuts.toFixed(2)} | on motion ${event.onMotion.toFixed(2)} | evidence use ${event.evidenceUse.toFixed(2)}`,
          ),
        );
        break;
      case "final": {
        for (const id of [...turns.keys()]) printTurn(id);
        const row = (label: string, s: { E: number; A: number; J: number; T: number }) =>
          `${label}  ${s.E.toFixed(1).padStart(6)} ${s.A.toFixed(1).padStart(6)} ${s.J.toFixed(2).padStart(7)} ${s.T.toFixed(2).padStart(7)}`;
        console.log("\n        E      A       J       T");
        console.log(row("PRO", event.score.PRO));
        console.log(row("CON", event.score.CON));
        const { verdict } = event;
        console.log(
          `\nWinner: ${event.score.winner}${event.score.winner === "draw" ? "" : ` by ${Math.abs(event.score.margin).toFixed(2)}`} | Jev verdict PRO ${verdict.pro.toFixed(2)}, CON ${verdict.con.toFixed(2)}, tie ${verdict.tie.toFixed(2)}`,
        );
        const { judge } = event.stats;
        console.log(
          `Judge: ${judge.calls} calls | ${Math.round(judge.medianLatencyMs)} ms median | $${judge.costUsd.toFixed(4)} | ${judge.errors} errors`,
        );
        for (const side of ["PRO", "CON"] as const) {
          const { counts } = event.stats[side];
          console.log(
            `${side}: ${counts.sentences} sentences, ${counts.claims} claims, ${counts.supported} supported, ${counts.unsupported} unsupported, ${counts.contradicted} contradicted, ${counts.uncertain} uncertain, ${counts.unverified} unverified, ${counts.opinions} opinions`,
          );
        }
        break;
      }
      default:
        break;
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

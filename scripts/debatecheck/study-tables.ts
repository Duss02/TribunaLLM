import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// LaTeX tables and number macros for the study section of the paper, from bench/debatecheck/study.json
// (written by analyze-study.ts --heldout). Nothing in paper/tables/study-* is written by hand.
const study = JSON.parse(await readFile("bench/debatecheck/study.json", "utf8")) as Record<string, any>;
const OUT = "paper/tables";
await mkdir(OUT, { recursive: true });

const SPECIAL: Record<string, string> = {
  "\\": "\\textbackslash{}",
  "{": "\\{",
  "}": "\\}",
  $: "\\$",
  "&": "\\&",
  "#": "\\#",
  "%": "\\%",
  _: "\\_",
  "^": "\\textasciicircum{}",
  "~": "\\textasciitilde{}",
};
const tex = (s: string) => s.replace(/[\\{}$&#%_^~]/g, (c) => SPECIAL[c] as string);
const pct = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || !Number.isFinite(x) ? "--" : `${(100 * x).toFixed(d)}\\%`;
const f3 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "--" : x.toFixed(3);
const num = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "--" : Math.round(n).toLocaleString("en-US");
const f2 = (x: number | null | undefined) =>
  x === null || x === undefined || !Number.isFinite(x) ? "--" : x.toFixed(2);
type CI = { point: number | null; lo: number | null; hi: number | null } | null | undefined;
const ci = (c: CI, f: (x: number | null | undefined) => string = f3) =>
  !c || c.point === null ? "--" : `${f(c.point)} [${f(c.lo)}, ${f(c.hi)}]`;
const LABEL: Record<string, string> = {
  "jev-20": "Jev, framed, 20 passages",
  "jev-3": "Jev, framed, top-3",
  "luna-dec-20": "Luna Decisions, framed, 20 passages",
  "luna-dec-3": "Luna Decisions, framed, top-3",
  "luna-dec-loose-20": "Luna Decisions, relation question, 20 passages",
  "luna-dec-loose-3": "Luna Decisions, relation question, top-3",
  "luna-chat": "Luna chat, framed, top-3",
  "deepseek-pro": "DeepSeek V4 Pro, framed, top-3",
  claude: "Claude Sonnet 5.5, framed, top-3",
  hhem: "HHEM-2.1-Open, top-3",
};
const label = (id: string) =>
  id.endsWith("@fit") ? `${LABEL[id.replace("@fit", "")] ?? id}, fitted threshold` : (LABEL[id] ?? id);
const PANEL_LABEL: Record<string, string> = {
  jev: "Jev (noul framed)",
  "jev-choice": "Jev (choice framing)",
  "luna-dec": "Luna Decisions",
  "luna-chat": "Luna chat",
  "deepseek-pro": "DeepSeek V4 Pro",
  claude: "Claude Sonnet 5.5",
};
const TYPES = ["number", "polarity", "entity", "attribution", "unit"];
const tabular = (spec: string, header: string, rows: string[]) =>
  `\\begin{tabular}{${spec}}\n\\toprule\n${header} \\\\\n\\midrule\n${rows.map((r) => `${r} \\\\`).join("\n")}\n\\bottomrule\n\\end{tabular}\n`;
const files: Record<string, string> = {};

// judges, all types
const MAIN = ["jev-20", "jev-3", "luna-dec-20", "luna-dec-3", "luna-chat", "deepseek-pro", "claude", "hhem"];
const metrics = study.metrics as Record<string, any>;
files["study-judges.tex"] = tabular(
  "lrrrrrr",
  "judge & $n$ & judge positive & accuracy & recall (altered) & false alarm & AUROC",
  MAIN.filter((id) => metrics[id] && metrics[id].all.n > 0).map((id) => {
    const m = metrics[id].all;
    return `${label(id)} & ${num(m.n)} & ${pct(m.judgePositive)} & ${ci(m.accuracy, pct)} & ${ci(m.recall, pct)} & ${ci(m.falseAlarm, pct)} & ${m.auroc ? ci(m.auroc) : "--"}`;
  }),
);
files["study-judges-fit.tex"] = tabular(
  "lrrrr",
  "judge & threshold & accuracy & recall (altered) & false alarm",
  Object.keys(metrics)
    .filter((id) => id.endsWith("@fit") && metrics[id].all.n > 0)
    .map((id) => {
      const m = metrics[id].all;
      return `${label(id)} & ${f2(study.fitted[id.replace("@fit", "")]?.threshold)} & ${ci(m.accuracy, pct)} & ${ci(m.recall, pct)} & ${ci(m.falseAlarm, pct)}`;
    }),
);
// recall and accuracy by type
for (const [name, key] of [
  ["study-recall-by-type.tex", "recall"],
  ["study-accuracy-by-type.tex", "accuracy"],
] as const) {
  files[name] = tabular(
    "l" + "r".repeat(TYPES.length),
    `judge & ${TYPES.join(" & ")}`,
    MAIN.filter((id) => metrics[id] && metrics[id].all.n > 0).map(
      (id) =>
        `${label(id)} & ${TYPES.map((t) => {
          const m = metrics[id].byType[t];
          return !m || m.n === 0 ? "--" : pct(m[key].point);
        }).join(" & ")}`,
    ),
  );
}
files["study-h3.tex"] = tabular(
  "lrrr",
  "judge & recall on numbers & mean recall, other types & drop",
  Object.entries(study.h3 as Record<string, any>)
    .filter(([id]) => metrics[id]?.all.n > 0)
    .map(
      ([id, h]) =>
        `${label(id)} & ${pct(h.numbers)} & ${pct(h.others)} & ${h.drop === null ? "--" : `${(100 * h.drop).toFixed(1)} pt`}`,
    ),
);
// correlations
const corrRow = (c: any, lab: (id: string) => string) =>
  `${lab(c.a)} $\\times$ ${lab(c.b)} & ${num(c.n)} & ${c.table.a} / ${c.table.b} / ${c.table.c} / ${c.table.d} & ${ci(c.phi)} & ${ci(c.kappa)} & ${pct(c.bGivenA.point)} vs ${pct(c.baseB)} & ${f2(c.liftBGivenA)}`;
const corr = (study.correlations.top3 as any[]).filter((c) => c.n > 0);
files["study-correlated.tex"] = tabular(
  "lrrrrrr",
  "pair & $n$ & both / A / B / neither wrong & $\\phi$ & $\\kappa$ & $P(B \\mid A)$ vs $P(B)$ & lift",
  corr.map((c) => corrRow(c, label)),
);
files["study-correlated-20.tex"] = tabular(
  "lrrrrrr",
  "pair & $n$ & both / A / B / neither wrong & $\\phi$ & $\\kappa$ & $P(B \\mid A)$ vs $P(B)$ & lift",
  (study.correlations.cond20 as any[]).filter((c) => c.n > 0).map((c) => corrRow(c, label)),
);
files["study-votes.tex"] = tabular(
  "lrrrr",
  "set & $k$ & items & mean $\\phi$ & effective votes",
  Object.entries(study.votes as Record<string, any>).map(
    ([name, v]) => `${tex(name)} & ${v.k} & ${num(v.n)} & ${f3(v.meanPhi)} & ${f2(v.effective)}`,
  ),
);
files["study-h4.tex"] = tabular(
  "llrr",
  "pair & third judge & $\\phi$, third judge right & $\\phi$, third judge wrong",
  Object.entries(study.h4 as Record<string, any>)
    .filter(([, h]) => h.right.n > 0 || h.wrong.n > 0)
    .map(([key, h]) => {
      const [a, b] = key.split("|") as [string, string];
      return `${label(a)} $\\times$ ${label(b)} & ${label(h.third)} & ${ci(h.right.phi)} ($n$ ${num(h.right.n)}) & ${ci(h.wrong.phi)} ($n$ ${num(h.wrong.n)})`;
    }),
);
files["study-h5.tex"] = tabular(
  "lrrr",
  "judge & AUROC, relation question & AUROC, framed criterion & gain",
  Object.entries(study.h5 as Record<string, any>).map(
    ([name, h]) =>
      `${tex(name)} & ${ci(h.loose)} & ${ci(h.framed)} & ${h.gain === null ? "--" : h.gain.toFixed(3)}`,
  ),
);
files["study-selective.tex"] = tabular(
  "lrrrrr",
  "judge & thresholds (low / high) & coverage & accepted & error among accepted & 95\\% upper bound",
  Object.entries(study.selective.single as Record<string, any>).map(([id, r]) =>
    r
      ? `${label(id)} & ${f2(r.lo)} / ${f2(r.hi)} & ${pct(r.coverage)} & ${num(r.accepted)} & ${pct(r.error)} & ${pct(r.errorUpper)}`
      : `${label(id)} & none at 5\\% & -- & -- & -- & --`,
  ),
);
files["study-agreement.tex"] = tabular(
  "lrrrr",
  "pair, accept when both agree & coverage & accepted & error among accepted & 95\\% upper bound",
  Object.entries(study.selective.agreement as Record<string, any>)
    .filter(([, r]) => r.accepted > 0)
    .map(([key, r]) => {
      const [a, b] = key.split("|") as [string, string];
      return `${label(a)} $\\times$ ${label(b)} & ${pct(r.coverage)} & ${num(r.accepted)} & ${pct(r.error)} & ${pct(r.errorUpper)}`;
    }),
);
// panels
const panels = study.panels as Record<string, any>;
const PANEL_TITLE: Record<string, string> = {
  charm100: "CHARM-100",
  "healthbench-100-test": "HealthBench-100 test",
};
for (const [name, p] of Object.entries(panels)) {
  files[`study-panel-${name}.tex`] = tabular(
    "lrrrrrr",
    "judge & $n$ & coverage & judge MET & label MET & accuracy & $\\kappa$",
    Object.entries(p.metrics as Record<string, any>).map(
      ([id, m]) =>
        `${PANEL_LABEL[id] ?? id} & ${num(m.n)} & ${pct(m.coverage)} & ${pct(m.judgePositive)} & ${pct(m.labelPositive)} & ${ci(m.accuracy, pct)} & ${ci(m.kappa)}`,
    ),
  );
  files[`study-panel-${name}-correlated.tex`] = tabular(
    "lrrrrr",
    "pair & $n$ & both / A / B / neither wrong & $\\phi$ & $\\kappa$ & $P(B \\mid A)$ vs $P(B)$",
    Object.values(p.correlations as Record<string, any>).map(
      (c: any) =>
        `${PANEL_LABEL[c.a] ?? c.a} $\\times$ ${PANEL_LABEL[c.b] ?? c.b} & ${num(c.n)} & ${c.table.a} / ${c.table.b} / ${c.table.c} / ${c.table.d} & ${ci(c.phi)} & ${ci(c.kappa)} & ${pct(c.bGivenA.point)} vs ${pct(c.baseB)}`,
    ),
  );
}
// H1 comparison: same pair on DebateCheck and on each panel
const P2D: Record<string, string> = {
  jev: "jev-3",
  "luna-dec": "luna-dec-3",
  "luna-chat": "luna-chat",
  "deepseek-pro": "deepseek-pro",
  claude: "claude",
};
const dc = new Map<string, any>();
for (const c of corr) {
  dc.set(`${c.a}|${c.b}`, c);
  dc.set(`${c.b}|${c.a}`, c);
}
const h1rows: string[] = [];
const panelNames = Object.keys(panels);
const pairKeys = new Set<string>();
for (const p of Object.values(panels)) for (const k of Object.keys(p.correlations)) pairKeys.add(k);
for (const key of pairKeys) {
  const [a, b] = key.split("|") as [string, string];
  const d = dc.get(`${P2D[a]}|${P2D[b]}`);
  const cells = panelNames.map((n) => ci(panels[n].correlations[key]?.phi));
  h1rows.push(`${PANEL_LABEL[a]} $\\times$ ${PANEL_LABEL[b]} & ${ci(d?.phi)} & ${cells.join(" & ")}`);
}
files["study-h1.tex"] = tabular(
  "l" + "r".repeat(1 + panelNames.length),
  `pair & $\\phi$ on DebateCheck & ${panelNames.map((n) => `$\\phi$ on ${PANEL_TITLE[n] ?? n}`).join(" & ")}`,
  h1rows,
);

// macros
const macros: string[] = [];
const cap = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : ""))
    .replace(/^[a-z]/, (c) => c.toUpperCase());
const macroName = (s: string) =>
  `\\study${cap(s).replace(/[0-9]/g, (d) => ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][Number(d)]!)}`;
const seen = new Set<string>();
const macro = (name: string, value: string) => {
  const n = macroName(name);
  if (seen.has(n)) throw new Error(`duplicate macro ${n}`);
  seen.add(n);
  macros.push(`\\newcommand{${n}}{${value}}`);
};
macro("split", study.evalSplit === "test" ? "held-out" : "training");
for (const id of MAIN) {
  if (!metrics[id] || metrics[id].all.n === 0) continue;
  const m = metrics[id].all;
  macro(`${id} n`, num(m.n));
  macro(`${id} accuracy`, pct(m.accuracy.point));
  macro(`${id} recall`, pct(m.recall.point));
  macro(`${id} fa`, pct(m.falseAlarm.point));
  if (m.auroc) macro(`${id} auroc`, f3(m.auroc.point));
  for (const t of TYPES) {
    const mt = metrics[id].byType[t];
    if (mt && mt.n > 0) macro(`${id} recall ${t}`, pct(mt.recall.point));
  }
}
for (const [id, h] of Object.entries(study.h3 as Record<string, any>))
  if (h.drop !== null) macro(`${id} drop`, `${(100 * h.drop).toFixed(1)}`);
for (const c of corr) {
  macro(`phi ${c.a} ${c.b}`, f3(c.phi.point));
  macro(`phi ci ${c.a} ${c.b}`, `[${f3(c.phi.lo)}, ${f3(c.phi.hi)}]`);
  macro(`cond ${c.a} ${c.b}`, pct(c.bGivenA.point));
  macro(`base ${c.a} ${c.b}`, pct(c.baseB));
  macro(`lift ${c.a} ${c.b}`, f2(c.liftBGivenA));
}
macro("h2 mean ll", f3(study.h2.meanLL));
macro("h2 mean dl", f3(study.h2.meanDL));
macro("h2 mean dd", f3(study.h2.meanDD));
macro("h2 verdict", tex(study.h2.verdict));
for (const [name, v] of Object.entries(study.votes as Record<string, any>))
  macro(`votes ${name}`, f2(v.effective));
for (const [name, h] of Object.entries(study.h5 as Record<string, any>)) {
  macro(`h5 loose ${name}`, f3(h.loose?.point));
  macro(`h5 framed ${name}`, f3(h.framed?.point));
  macro(`h5 gain ${name}`, h.gain === null ? "--" : h.gain.toFixed(3));
}
for (const [id, r] of Object.entries(study.selective.single as Record<string, any>)) {
  macro(`sel coverage ${id}`, r ? pct(r.coverage) : "none");
  macro(`sel error ${id}`, r ? pct(r.error) : "--");
}
for (const [name, p] of Object.entries(panels)) {
  macro(`panel cells ${name}`, String(p.cells));
  for (const [id, m] of Object.entries(p.metrics as Record<string, any>)) {
    macro(`panel acc ${name} ${id}`, pct(m.accuracy.point));
    macro(`panel kappa ${name} ${id}`, f3(m.kappa.point));
  }
  for (const [key, c] of Object.entries(p.correlations as Record<string, any>))
    macro(`panel phi ${name} ${key}`, f3(c.phi.point));
  const h = study.h1[name];
  if (h) {
    macro(`h1 lower ${name}`, String(h.lower));
    macro(`h1 disjoint ${name}`, String(h.disjoint));
    macro(`h1 total ${name}`, String(h.total));
    macro(`h1 verdict ${name}`, tex(h.verdict));
  }
}
if (study.retrieval) {
  const r = study.retrieval as any;
  files["study-retrieval.tex"] = tabular(
    "lrrrr",
    "judge & recall, fact passage present & recall, absent & false alarm, present & false alarm, absent",
    Object.entries(r.judges as Record<string, any>).map(
      ([id, m]) =>
        `${label(id)} & ${ci(m.present.recall, pct)} & ${ci(m.absent.recall, pct)} & ${pct(m.present.falseAlarm.point)} & ${pct(m.absent.falseAlarm.point)}`,
    ),
  );
  files["study-retrieval-corr.tex"] = tabular(
    "lrr",
    "pair & $\\phi$, fact passage present & $\\phi$, absent",
    Object.entries(r.correlations as Record<string, any>).map(([key, c]) => {
      const [a, b] = key.split("|") as [string, string];
      return `${label(a)} $\\times$ ${label(b)} & ${ci(c.present.phi)} ($n$ ${num(c.present.n)}) & ${ci(c.absent.phi)} ($n$ ${num(c.absent.n)})`;
    }),
  );
  macro("retrieval share", pct(r.share));
  for (const [id, m] of Object.entries(r.judges as Record<string, any>)) {
    macro(`retr recall present ${id}`, pct(m.present.recall.point));
    macro(`retr recall absent ${id}`, pct(m.absent.recall.point));
  }
  for (const [key, c] of Object.entries(r.correlations as Record<string, any>)) {
    macro(`retr phi present ${key}`, f3(c.present.phi.point));
    macro(`retr phi absent ${key}`, f3(c.absent.phi.point));
  }
}
for (const [key, h] of Object.entries(study.h4 as Record<string, any>)) {
  if (h.right.n === 0 && h.wrong.n === 0) continue;
  macro(`h4 right ${key}`, f3(h.right.phi.point));
  macro(`h4 wrong ${key}`, f3(h.wrong.phi.point));
}
for (const [id, r] of Object.entries(study.selective.single as Record<string, any>))
  macro(`sel upper ${id}`, r ? pct(r.errorUpper) : "--");
// Leaderboard v2 (scripts/leaderboard-v2.ts): the arena's claims under the framed criterion.
if (existsSync("bench/leaderboard-v2.json")) {
  const lb = JSON.parse(await readFile("bench/leaderboard-v2.json", "utf8")) as any;
  const MODEL: Record<string, string> = {
    "claude-opus-5.5": "Claude Opus 5.5",
    "claude-sonnet-5.5": "Claude Sonnet 5.5",
    "gpt-6.1-sol": "GPT-6.1 Sol",
    "gpt-6-luna": "GPT-6 Luna",
    "deepseek-v4-pro": "DeepSeek V4 Pro",
    "deepseek-v4-flash": "DeepSeek V4 Flash",
  };
  const mname = (k: string) => MODEL[k] ?? tex(k);
  const wil = (lo: number, hi: number) => `[${pct(lo)}, ${pct(hi)}]`;
  files["leaderboard-v2.tex"] = tabular(
    "lrrrrrrrr",
    "model & claims & struck (pilot) & contradicted at 0.5 & rate & confident ($p \\geq " +
      Number(lb.thresholds.confident).toFixed(2) +
      "$) & rate & 95\\% interval & pilot win rate",
    (lb.models as any[]).map(
      (m) =>
        `${mname(m.key)} & ${num(m.claims)} & ${m.pilotContradicted} & ${m.contradicted} & ${pct(m.rate)} & ${m.contradictedConfident} & ${pct(m.rateConfident)} & ${wil(m.lowConfident, m.highConfident)} & ${pct(m.winRate)}`,
    ),
  );
  files["leaderboard-v2-packs.tex"] = tabular(
    "lrrrrr",
    "motion & claims & contradicted at 0.5 & rate & confident & rate",
    (lb.packs as any[]).map(
      (p) =>
        `${tex(p.pack)} & ${num(p.claims)} & ${p.contradicted} & ${pct(p.rate)} & ${p.contradictedConfident} & ${pct(p.rateConfident)}`,
    ),
  );
  macro("lb debates", String(lb.debates));
  macro("lb claims", num(lb.claims));
  macro("lb pilot struck", String(lb.pilotContradicted));
  macro("lb contradicted", num(lb.contradicted));
  macro("lb contradicted confident", String(lb.contradictedConfident));
  macro("lb threshold", Number(lb.thresholds.confident).toFixed(2));
  macro("lb cost", `\\$${((lb.jevTokens * 0.042) / 1e6).toFixed(2)}`);
  macro("lb rate all", pct(lb.contradicted / lb.claims));
  macro("lb rate all confident", pct(lb.contradictedConfident / lb.claims));
  for (const m of lb.models as any[]) {
    macro(`lb rate ${m.key}`, pct(m.rate));
    macro(`lb rate confident ${m.key}`, pct(m.rateConfident));
    macro(`lb count confident ${m.key}`, String(m.contradictedConfident));
    macro(`lb ci confident ${m.key}`, wil(m.lowConfident, m.highConfident));
    macro(`lb claims ${m.key}`, num(m.claims));
  }
  const first = (lb.models as any[])[0],
    last = (lb.models as any[])[(lb.models as any[]).length - 1];
  macro("lb best", mname(first.key));
  macro("lb worst", mname(last.key));
}
files["study-macros.tex"] = macros.join("\n") + "\n";
for (const [name, content] of Object.entries(files)) {
  if (/[^\x00-\x7f]/.test(content)) throw new Error(`non-ASCII in ${name}`);
  await writeFile(`${OUT}/${name}`, content);
}
console.log(`wrote ${Object.keys(files).length} files to ${OUT} (${macros.length} macros)`);

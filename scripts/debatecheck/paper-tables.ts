import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { type Pair, VARIANTS, type VariantName, type JevAnswer, readJsonl } from "./lib";

// Writes the LaTeX tables, pgfplots data files and number macros the paper includes, from the JSON the
// analysis scripts produced. Nothing in paper/tables or paper/data is written by hand.
const DIR = "bench/debatecheck";
const OUT = "paper";
await mkdir(`${OUT}/tables`, { recursive: true });
await mkdir(`${OUT}/data`, { recursive: true });

const summary = JSON.parse(await readFile(`${DIR}/summary.json`, "utf8")) as Record<string, any>;
const optimize = await readFile(`${DIR}/optimize/result.json`, "utf8")
  .then((t) => JSON.parse(t))
  .catch(() => null);
const autorubricFiles = (await readdir(DIR)).filter(
  (f) => f.startsWith("autorubric-results-") && f.endsWith(".json") && !f.includes("-10."),
);
const autorubric: Record<string, any> = {};
for (const f of autorubricFiles)
  autorubric[f.replace("autorubric-results-autorubric-", "").replace(".json", "")] = JSON.parse(
    await readFile(`${DIR}/${f}`, "utf8"),
  );

// Escapes LaTeX's special characters in one pass and maps the few non-ASCII characters the data may
// carry to their LaTeX forms; anything else outside ASCII fails the run below rather than failing Overleaf.
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
const UNICODE: Record<string, string> = {
  "\u2265": "$\\geq$",
  "\u2264": "$\\leq$",
  "\u2212": "$-$",
  "\u2192": "$\\rightarrow$",
  "\u00d7": "$\\times$",
  "\u2026": "\\ldots{}",
  "\u2013": "--",
  "\u2014": "---",
  "\u2018": "`",
  "\u2019": "'",
  "\u201c": "``",
  "\u201d": "''",
  "\u00a0": " ",
  "\u03ba": "$\\kappa$",
  "\u03c6": "$\\phi$",
  "\u03c4": "$\\tau$",
  "\u0394": "$\\Delta$",
  "\u00b1": "$\\pm$",
  "\u2248": "$\\approx$",
  "\u00b0": "$^\\circ$",
  "\u20ac": "\\texteuro{}",
  "\u00a3": "\\pounds{}",
};
const tex = (s: string) =>
  s
    .replace(/[\\{}$&#%_^~]/g, (c) => SPECIAL[c] as string)
    .replace(/[^\x00-\x7f]/g, (c) => UNICODE[c] ?? c)
    .replaceAll("`", "'");
const short: Record<string, string> = {
  loose20: "loose, 20",
  sharp20: "sharp, 20",
  sharp3: "sharp, top-3",
  direct3: "direct, top-3",
  twostep3: "two-step, top-3",
  framed20: "framed, 20",
  framed3: "framed, top-3",
  ensemble4: "mean of 4",
  ensemble5: "mean of 5",
};
/** Human labels for judge names such as `Jev sharp3 >=0.7` and `LLM gpt-6-luna`. */
const judgeLabel = (name: string) => {
  const m = /^Jev (\w+) \u2265([0-9.]+)$/.exec(name);
  if (m) return `Jev, ${short[m[1]!] ?? m[1]}, $p \\geq ${m[2]}$`;
  const l = /^LLM (.+)$/.exec(name);
  if (l) return `${tex(l[1]!)} (sharp, top-3)`;
  return tex(name);
};
const pct = (x: number | null | undefined, d = 1) =>
  x === null || x === undefined || Number.isNaN(x) ? "--" : `${(100 * x).toFixed(d)}\\%`;
const f3 = (x: number | null | undefined) =>
  x === null || x === undefined || Number.isNaN(x) ? "--" : x.toFixed(3);
const f2 = (x: number | null | undefined) =>
  x === null || x === undefined || Number.isNaN(x) ? "--" : x.toFixed(2);
const ci = (c: [number, number] | undefined, f: (x: number) => string) =>
  c && Number.isFinite(c[0]) ? `[${f(c[0])}, ${f(c[1])}]` : "";
const label: Record<string, string> = {
  loose20: "relation, loose, 20 passages (the debate's)",
  sharp20: "relation, sharp, 20 passages",
  sharp3: "relation, sharp, top-3",
  direct3: "direct yes/no, top-3",
  twostep3: "two-step yes/no, top-3",
  framed20: "framed criterion (Autorubric), 20 passages",
  framed3: "framed criterion (Autorubric), top-3",
  ensemble4: "mean of four relation/direct wordings",
  ensemble5: "mean of five wordings",
};
const macros: string[] = [];
const defined = new Set<string>();
const macro = (name: string, value: string) => {
  if (defined.has(name)) return;
  defined.add(name);
  macros.push(`\\newcommand{\\${name}}{${value}}`);
};

// ---- dataset ----
const ds = summary.dataset;
const count = (n: number) => n.toLocaleString("en-US");
macro("nPairs", count(ds.pairs));
macro("nTrain", count(ds.split.train));
macro("nTest", count(ds.split.test));
macro("nYear", count(ds.kind.year));
macro("nPercent", count(ds.kind.percent));
macro("nOther", count(ds.kind.other));

// ---- variants ----
{
  const rows = Object.entries(summary.variants as Record<string, any>);
  const lines = [
    "\\begin{tabular}{@{}lllllr@{}}",
    "\\toprule",
    "Criterion text & AUROC [95\\% CI] & Det.\\ $\\geq 0.7$ & FA $\\geq 0.7$ & Det.\\ / FA $\\geq 0.5$ & Tokens/pair \\\\",
    "\\midrule",
  ];
  for (const [v, m] of rows) {
    lines.push(
      `${label[v] ?? v} & ${f3(m.auroc)} ${ci(m.aurocCi, f3)} & ${pct(m.det70)} & ${pct(m.fa70)} & ${pct(m.det50)} / ${pct(m.fa50)} & ${Number.isFinite(m.tokens) ? Math.round(m.tokens).toLocaleString("en-US") : "--"} \\\\`,
    );
    macro(`auroc${cap(v)}`, f3(m.auroc));
    macro(`det${cap(v)}`, pct(m.det70));
    macro(`fa${cap(v)}`, pct(m.fa70));
    macro(`detFifty${cap(v)}`, pct(m.det50));
    macro(`faFifty${cap(v)}`, pct(m.fa50));
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/variants.tex`, lines.join("\n") + "\n");
}

// ---- subsets ----
{
  const cols: string[] = ["loose20", "sharp20", "sharp3", "direct3", "framed20", "framed3"];
  const lines = [
    `\\begin{tabular}{@{}lr${cols.map(() => "l").join("")}@{}}`,
    "\\toprule",
    `Subset & $n$ & ${cols.map((c) => short[c] ?? c).join(" & ")} \\\\`,
    "\\midrule",
  ];
  for (const [name, m] of Object.entries(summary.bySubset as Record<string, any>)) {
    const n = (Object.values(m)[0] as any)?.n ?? "";
    lines.push(
      `${name} & ${n} & ${cols.map((c) => `${pct(m[c]?.det70, 0)} / ${pct(m[c]?.fa70, 0)} / ${f2(m[c]?.auroc)}`).join(" & ")} \\\\`,
    );
    for (const [v, mm] of Object.entries(m as Record<string, any>)) {
      macro(`sub${cap(name)}${cap(v)}Det`, pct(mm.det70));
      macro(`sub${cap(name)}${cap(v)}Fa`, pct(mm.fa70));
      macro(`sub${cap(name)}${cap(v)}Auroc`, f3(mm.auroc));
      macro(`sub${cap(name)}${cap(v)}DetFifty`, pct(mm.det50));
      macro(`sub${cap(name)}${cap(v)}FaFifty`, pct(mm.fa50));
    }
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/subsets.tex`, lines.join("\n") + "\n");
}

// ---- offset ----
{
  const lines = [
    "\\begin{tabular}{@{}lrrrrrrrr@{}}",
    "\\toprule",
    "Criterion text & $\\bar p$ altered & $\\bar p$ unchanged & $\\tau^\\star$ & Det. & FA & $J$ & Det.\\ at 0.7 & FA at 0.7 \\\\",
    "\\midrule",
  ];
  for (const [v, m] of Object.entries(summary.offset as Record<string, any>)) {
    lines.push(
      `${label[v] ?? v} & ${f2(m.meanAltered)} & ${f2(m.meanUnchanged)} & ${f2(m.threshold)} & ${pct(m.testDet)} & ${pct(m.testFa)} & ${f2(m.testYouden)} & ${pct(m.testDet70)} & ${pct(m.testFa70)} \\\\`,
    );
    macro(`meanAlt${cap(v)}`, f2(m.meanAltered));
    macro(`meanUn${cap(v)}`, f2(m.meanUnchanged));
    macro(`tau${cap(v)}`, f2(m.threshold));
    macro(`offDet${cap(v)}`, pct(m.testDet));
    macro(`offFa${cap(v)}`, pct(m.testFa));
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/offset.tex`, lines.join("\n") + "\n");
}

// ---- by model ----
{
  const lines = [
    "\\begin{tabular}{@{}lrrrrr@{}}",
    "\\toprule",
    "Debater & Pairs & Loose det. & Sharp-3 det. & Sharp-3 FA & Sharp-3 AUROC \\\\",
    "\\midrule",
  ];
  for (const [model, m] of Object.entries(summary.byModel as Record<string, any>)) {
    lines.push(
      `${tex(model)} & ${m.n} & ${pct(m.loose20.det70)} & ${pct(m.sharp3.det70)} & ${pct(m.sharp3.fa70)} & ${f3(m.sharp3.auroc)} \\\\`,
    );
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/models.tex`, lines.join("\n") + "\n");
}

// ---- judges (agreement protocol) ----
{
  const lines = [
    "\\begin{tabular}{@{}lrrrrrrlrrl@{}}",
    "\\toprule",
    "Judge & Items & Cov. & $p_{\\text{judge}}$ & $p_{\\text{label}}$ & Acc. & $\\phi$ & $\\kappa$ [95\\% CI] & Prec. & Rec. & TP/FP/FN/TN \\\\",
    "\\midrule",
  ];
  for (const [name, m] of Object.entries(summary.judges as Record<string, any>)) {
    if (name.endsWith("distributions")) continue;
    lines.push(
      `${judgeLabel(name)} & ${m.n} & ${pct(m.coverage, 0)} & ${pct(m.judgePos)} & ${pct(m.labelPos, 0)} & ${pct(m.accuracy)} & ${f2(m.phi)} & ${f2(m.kappa)} ${ci(m.kappaCi, f2)} & ${pct(m.precision, 0)} & ${pct(m.recall, 0)} & ${m.tp}/${m.fp}/${m.fn}/${m.tn} \\\\`,
    );
    const key = cap(name);
    macro(`acc${key}`, pct(m.accuracy));
    macro(`kappa${key}`, f2(m.kappa));
    macro(`rec${key}`, pct(m.recall));
    macro(`prec${key}`, pct(m.precision));
    macro(`fa${key}`, pct(m.fp / Math.max(1, m.fp + m.tn)));
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/judges.tex`, lines.join("\n") + "\n");
}

// ---- correlated errors ----
{
  const lines = [
    "\\begin{tabular}{@{}llrrrrrrr@{}}",
    "\\toprule",
    "Jev wording & LLM judge & Items & LLM err. & Jev err. & $P(\\text{LLM wrong}\\mid\\text{Jev wrong})$ & $P(\\text{LLM wrong}\\mid\\text{Jev conf.\\ wrong})$ & $n$ conf. & $\\kappa_{\\text{err}}$ \\\\",
    "\\midrule",
  ];
  for (const [name, m] of Object.entries(summary.correlatedErrors as Record<string, any>)) {
    if (name.includes(" x ")) continue;
    lines.push(
      `${short[m.base] ?? m.base} & ${tex(m.judge)} & ${m.items} & ${pct(m.llmErrorRate)} & ${pct(m.jevErrorRate)} & ${pct(m.pWrongGivenJevWrong)} & ${pct(m.pWrongGivenJevConfWrong)} & ${m.nConfident} & ${f2(m.kappaErrors)} \\\\`,
    );
    const key = cap(m.base) + cap(m.judge);
    macro(`corrBase${key}`, pct(m.llmErrorRate));
    macro(`corrJev${key}`, pct(m.jevErrorRate));
    macro(`corrGiven${key}`, pct(m.pWrongGivenJevWrong));
    macro(`corrConf${key}`, pct(m.pWrongGivenJevConfWrong));
    macro(`corrN${key}`, String(m.nConfident));
    macro(`corrKappa${key}`, f2(m.kappaErrors));
    macro(`corrLift${key}`, f2(m.bothWrong / (m.llmErrorRate * m.jevErrorRate)));
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/correlated.tex`, lines.join("\n") + "\n");
  const pairsLines: string[] = [];
  for (const [name, m] of Object.entries(summary.correlatedErrors as Record<string, any>))
    if (name.includes(" x ")) {
      macro("corrLlmGiven", pct(m.pBgivenA));
      macro("corrLlmBase", pct(m.errorB));
      macro("corrLlmBoth", pct(m.bothWrong));
      macro("corrLlmKappa", f2(m.kappaErrors));
      macro("corrLlmLift", f2(m.lift));
      pairsLines.push(
        `${tex(name)}: both wrong on ${pct(m.bothWrong)} of ${m.items} items; $P(B\\mid A)$ = ${pct(m.pBgivenA)} against a base rate of ${pct(m.errorB)}.`,
      );
    }
  await writeFile(`${OUT}/tables/correlated-llm.tex`, pairsLines.join("\n\n") + "\n");
}

// ---- cascades ----
{
  const lines = [
    "\\begin{tabular}{@{}lllrrrr@{}}",
    "\\toprule",
    "Jev wording & Fallback & $\\tau$ & Escalated & Accuracy & Cost/item & Share of LLM cost \\\\",
    "\\midrule",
  ];
  for (const [base, c] of Object.entries(summary.cascade as Record<string, any>)) {
    macro(`confAuroc${cap(base)}`, f3(c.aurocConfidenceForCorrectness));
    macro(`jevAcc${cap(base)}`, pct(c.jevAccuracy));
    for (const [judge, m] of Object.entries(c as Record<string, any>)) {
      if (typeof m !== "object" || !m.curve) continue;
      macro(`llmAcc${cap(judge)}`, pct(m.llmAccuracy));
      macro(`llmCost${cap(judge)}`, `\\$${m.llmCostPerItem.toFixed(5)}`);
      macro(`jevCostItem${cap(base)}`, `\\$${m.jevCostPerItem.toFixed(6)}`);
      const data = m.curve
        .map(
          (p: any) =>
            `${p.escalated.toFixed(4)} ${p.accuracy.toFixed(4)} ${p.tau.toFixed(1)} ${(p.cost / m.llmCostPerItem).toFixed(4)}`,
        )
        .join("\n");
      await writeFile(
        `${OUT}/data/cascade-${base}-${judge}.dat`,
        "escalated accuracy tau costshare\n" + data + "\n",
      );
      const half = m.curve
        .filter((p: any) => p.accuracy >= m.llmAccuracy - 0.01)
        .sort((a: any, b: any) => a.escalated - b.escalated)[0];
      if (half) {
        macro(`casEsc${cap(base)}${cap(judge)}`, pct(half.escalated));
        macro(`casAcc${cap(base)}${cap(judge)}`, pct(half.accuracy));
        macro(`casShare${cap(base)}${cap(judge)}`, pct(half.cost / m.llmCostPerItem, 0));
        macro(`casTau${cap(base)}${cap(judge)}`, half.tau.toFixed(1));
      }
      for (const p of m.curve.filter((p: any) => [0, 0.4, 0.6, 0.8, 1].includes(p.tau)))
        lines.push(
          `${short[base] ?? base} & ${tex(judge)} & ${p.tau.toFixed(1)} & ${pct(p.escalated)} & ${pct(p.accuracy)} & \\$${p.cost.toFixed(5)} & ${pct(p.cost / m.llmCostPerItem, 0)} \\\\`,
        );
    }
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/cascade.tex`, lines.join("\n") + "\n");
}

// ---- ROC data from the raw judgments ----
{
  const pairs = await readJsonl<Pair>(`${DIR}/pairs.jsonl`);
  const rows = new Map(
    (
      await readJsonl<{
        id: string;
        answers: Partial<Record<VariantName, { original: JevAnswer; perturbed: JevAnswer }>>;
      }>(`${DIR}/jev-variants.jsonl`)
    ).map((r) => [r.id, r]),
  );
  for (const v of VARIANTS) {
    const pos: number[] = [],
      neg: number[] = [];
    for (const p of pairs) {
      const a = rows.get(p.id)?.answers[v.name];
      if (!a) continue;
      pos.push(a.perturbed.contradicts);
      neg.push(a.original.contradicts);
    }
    const pts: string[] = ["fpr tpr thr"];
    for (let t = 1.0; t >= -0.0001; t -= 0.02) {
      const tpr = pos.filter((x) => x >= t).length / Math.max(1, pos.length),
        fpr = neg.filter((x) => x >= t).length / Math.max(1, neg.length);
      pts.push(`${fpr.toFixed(4)} ${tpr.toFixed(4)} ${Math.max(0, t).toFixed(2)}`);
    }
    await writeFile(`${OUT}/data/roc-${v.name}.dat`, pts.join("\n") + "\n");
  }
}

// ---- optimisation ----
if (optimize) {
  const m = optimize;
  const lines = [
    "\\begin{tabular}{@{}lrrrrrr@{}}",
    "\\toprule",
    "Wording & Train AUROC & Train det. & Train FA & Held-out AUROC & Held-out det. & Held-out FA \\\\",
    "\\midrule",
    `Seed (sharp) & ${f3(m.seed.train.auroc)} & ${pct(m.seed.train.detection70)} & ${pct(m.seed.train.falseAlarm70)} & ${f3(m.seed.test.auroc)} & ${pct(m.seed.test.detection70)} & ${pct(m.seed.test.falseAlarm70)} \\\\`,
    `Optimised & ${f3(m.best.train.auroc)} & ${pct(m.best.train.detection70)} & ${pct(m.best.train.falseAlarm70)} & ${f3(m.best.test.auroc)} & ${pct(m.best.test.detection70)} & ${pct(m.best.test.falseAlarm70)} \\\\`,
    "\\bottomrule",
    "\\end{tabular}",
  ];
  await writeFile(`${OUT}/tables/optimize.tex`, lines.join("\n") + "\n");
  macro("optSeedTestAuroc", f3(m.seed.test.auroc));
  macro("optBestTestAuroc", f3(m.best.test.auroc));
  macro("optSeedTestDet", pct(m.seed.test.detection70));
  macro("optBestTestDet", pct(m.best.test.detection70));
  macro("optSeedTestFa", pct(m.seed.test.falseAlarm70));
  macro("optBestTestFa", pct(m.best.test.falseAlarm70));
  macro("optSeedTrainAuroc", f3(m.seed.train.auroc));
  macro("optBestTrainAuroc", f3(m.best.train.auroc));
  macro("optRounds", String(Math.max(...m.history.map((h: any) => h.round))));
  macro("optCandidates", String(m.history.length - 1));
  macro("optReviser", tex(m.reviser));
  macro("optJevCost", `\\$${((m.jevTokens * 0.042) / 1e6).toFixed(2)}`);
  const hist = [
    "\\begin{tabular}{@{}rrrrp{0.62\\linewidth}@{}}",
    "\\toprule",
    "Round & AUROC & Det. & FA & Wording of the \\texttt{contradicts} option \\\\",
    "\\midrule",
  ];
  for (const h of m.history)
    hist.push(
      `${h.round} & ${f3(h.metrics.auroc)} & ${pct(h.metrics.detection70)} & ${pct(h.metrics.falseAlarm70)} & ${tex(h.text)} \\\\`,
    );
  hist.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/optimize-history.tex`, hist.join("\n") + "\n");
  await writeFile(`${OUT}/tables/best-wording.tex`, tex(m.best.text) + "\n");
}

// ---- autorubric ----
{
  const lines = [
    "\\begin{tabular}{@{}llrrrrrrl@{}}",
    "\\toprule",
    "Evidence & Judge (Autorubric) & Items & Acc.\\ [95\\% CI] & $\\kappa$ [95\\% CI] & $\\phi$ & Prec. & Rec. & TP/FP/FN/TN \\\\",
    "\\midrule",
  ];
  const parseCi = (s: string | null, key: string) => {
    const m = s ? new RegExp(`${key}=\\(([0-9.]+), ([0-9.]+)\\)`).exec(s) : null;
    return m ? `[${(+m[1]!).toFixed(2)}, ${(+m[2]!).toFixed(2)}]` : "";
  };
  for (const [name, res] of Object.entries(autorubric)) {
    const evidence = name.includes("topall") ? "20 passages" : "top-3";
    for (const [judge, m] of Object.entries(res as Record<string, any>)) {
      if (judge === "cascade" || judge.includes("-exclude") || judge.includes("-as_unmet")) continue;
      const c = m.confusion ?? {};
      lines.push(
        `${evidence} & ${tex(judge)} & ${m.n_samples ?? m.n_items} & ${pct(m.accuracy)} ${parseCi(m.bootstrap, "accuracy_ci")} & ${f2(m.kappa_micro)} ${parseCi(m.bootstrap, "kappa_ci")} & ${f2(m.phi)} & ${pct(m.precision_met, 0)} & ${pct(m.recall_met, 0)} & ${c.tp ?? "--"}/${c.fp ?? "--"}/${c.fn ?? "--"}/${c.tn ?? "--"} \\\\`,
      );
      const key = (evidence.includes("20") ? "All" : "Top") + cap(judge);
      macro(`ar${key}Acc`, pct(m.accuracy));
      macro(`ar${key}Kappa`, f2(m.kappa_micro));
      macro(`ar${key}Rec`, pct(m.recall_met));
      macro(`ar${key}Prec`, pct(m.precision_met));
      if (c.fp !== undefined) macro(`ar${key}Fa`, pct(c.fp / Math.max(1, c.fp + c.tn)));
    }
    const cas = (res as any).cascade;
    if (cas) {
      macro("arCascadeEsc", pct(cas.best.escalation_rate));
      macro("arCascadeAcc", pct(cas.best.metric));
      macro("arCascadeThr", String(cas.best.threshold));
      macro("arLlmAcc", pct(cas.llm_alone_metric));
      macro("arJevAcc", pct(cas.jev_alone_metric));
      const pts = (cas.points as any[]).map(
        (p) =>
          `${(p.escalation_rate ?? 0).toFixed(4)} ${(p.metric ?? 0).toFixed(4)} ${typeof p.threshold === "number" ? p.threshold.toFixed(2) : "0"}`,
      );
      await writeFile(
        `${OUT}/data/autorubric-cascade.dat`,
        "escalated accuracy tau\n" + pts.join("\n") + "\n",
      );
    }
  }
  lines.push("\\bottomrule", "\\end{tabular}");
  await writeFile(`${OUT}/tables/autorubric.tex`, lines.join("\n") + "\n");
}

// ---- shared difficulty ----
if (summary.difficulty) {
  const d = summary.difficulty as any;
  macro("stratHardN", String(d.hard.n));
  macro("stratHardJev", pct(d.hard.jevErr));
  macro("stratHardLlm", pct(d.hard.llmErr));
  macro("stratHardGiven", pct(d.hard.pLlmGivenJev));
  macro("stratEasyN", String(d.easy.n));
  macro("stratEasyJev", pct(d.easy.jevErr));
  macro("stratEasyLlm", pct(d.easy.llmErr));
  macro("stratEasyGiven", pct(d.easy.pLlmGivenJev));
}

// ---- combinations ----
if (summary.combinations) {
  const c = summary.combinations as any;
  macro("combN", String(c.nTest));
  for (const [k, v] of Object.entries(c.single as Record<string, number>))
    macro(`combSingle${cap(k)}`, pct(v));
  for (const [k, v] of Object.entries(c.pairs as Record<string, any>)) {
    const key = k.split("+").map(cap).join("And");
    macro(`combOracle${key}`, pct(v.oracle));
    macro(`combFit${key}`, pct(v.fitted));
  }
  macro("combMajority", pct(c.majority));
}

// ---- retest ----
macro("retestDelta", f3(summary.retest.meanAbsDelta));
macro("retestFlips", String(summary.retest.flipsAt07));
macro("retestN", String(summary.retest.n));

await writeFile(`${OUT}/tables/macros.tex`, macros.join("\n") + "\n");
// Overleaf's pdfLaTeX stops on a character inputenc cannot map, so nothing generated may leave ASCII.
for (const dir of ["tables", "data"]) {
  for (const f of await readdir(`${OUT}/${dir}`)) {
    const text = await readFile(`${OUT}/${dir}/${f}`, "utf8");
    const bad = text.match(/[^\x00-\x7f]/g);
    if (bad) throw new Error(`${dir}/${f} contains non-ASCII characters: ${[...new Set(bad)].join(" ")}`);
  }
}
console.log(`wrote ${macros.length} macros and the tables in ${OUT}/tables, data in ${OUT}/data; all ASCII`);

function cap(s: string): string {
  return s
    .replace(/[^A-Za-z0-9]/g, "")
    .replace(
      /[0-9]/g,
      (d) => ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"][+d]!,
    )
    .replace(/^./, (c) => c.toUpperCase());
}

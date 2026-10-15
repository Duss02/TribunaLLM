"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { useEffect, useRef, useState } from "react";
import { Controls } from "@/components/arena/controls";
import { Sentence } from "@/components/arena/sentence";
import { type ArenaProps, useArena } from "@/components/arena/use-arena";
import { vendorName } from "@/components/leaderboard/vendor";
import type { FinalEvent } from "@/lib/debate/events";
import { percent, summaryText } from "@/lib/debate/summary";
import { medianLatencyMs, type TurnView } from "@/lib/debate/view";
import { isRetracted } from "@/lib/jev/verdict";
import { vendorOfModel } from "@/lib/models/vendor-of";
import type { Side } from "@/lib/side";

const Stage = dynamic(() => import("./scene/stage").then((m) => m.Stage), {
  ssr: false,
  loading: () => <div className="absolute inset-0 bg-[var(--court-ground)]" />,
});

const pill =
  "rounded-full px-4 py-1.5 text-sm font-bold outline-none transition-transform active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-[var(--court-blue)] focus-visible:ring-offset-2";
const pillQuiet = `${pill} bg-[var(--court-blue-soft)] text-[var(--court-blue-ink)] hover:bg-[var(--court-blue)] hover:text-white`;

function Transcript({
  side,
  turns,
  waiting,
  speaking,
  thinkingFor,
  retraction,
  className,
}: {
  side: Side;
  turns: TurnView[];
  waiting: boolean;
  speaking: boolean;
  /** Seconds this side's model has been thinking before its first word, or null when it is not. */
  thinkingFor: number | null;
  retraction: { id: string; reason: string } | null;
  className: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  });

  return (
    <section
      aria-label={`${side} transcript`}
      className={`court-card relative flex min-h-0 flex-col rounded-2xl transition-shadow ${retraction ? "ring-[3px] ring-[var(--court-signal)]" : speaking ? "ring-[3px] ring-[var(--court-blue)]" : ""} ${className}`}
    >
      <div
        ref={scroller}
        tabIndex={0}
        className="court-paper min-h-0 flex-1 overflow-y-auto rounded-2xl px-5 pb-5 text-[1.0625rem] leading-relaxed lg:text-[1.1875rem] lg:leading-snug"
      >
        <h2 className="font-display sticky top-0 z-10 mb-1 bg-[var(--court-card)] pt-4 pb-2 text-2xl leading-none font-semibold">
          {side}
          {speaking && !retraction && (
            <span className="ml-2 text-base font-medium text-[var(--court-blue-ink)]">speaking</span>
          )}
          {retraction && (
            <span
              key={retraction.id}
              role="status"
              className="court-flag ml-2 inline-block rounded-full bg-[var(--court-signal)] px-3 py-0.5 align-middle font-sans text-sm font-extrabold text-white"
            >
              Retracted · {retraction.reason}
            </span>
          )}
        </h2>
        {thinkingFor !== null && (
          <p className="mb-2 text-[var(--court-blue-ink)]" role="status">
            Thinking{thinkingFor >= 3 ? ` for ${thinkingFor} s` : ""}…
          </p>
        )}
        {turns.length === 0 ? (
          <p className="text-muted">
            {waiting ? "The transcript opens when the court is in session." : "Counsel is getting ready."}
          </p>
        ) : (
          <div className="space-y-4">
            {turns.map((turn) => (
              <article key={turn.id}>
                <h3 className="font-display mb-0.5 text-base font-semibold text-[var(--court-ink-soft)]">
                  Round {turn.round}
                </h3>
                <p className={`max-w-[68ch] ${turn.ended ? "" : "caret"}`}>
                  {turn.sentences.map((sentence) => (
                    <Sentence key={sentence.id} sentence={sentence} />
                  ))}
                  {turn.partial}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Ruling({
  final,
  motion,
  models,
  judgeLabel,
  rounds,
  strictMode,
  onClose,
}: {
  final: FinalEvent;
  motion: string;
  models: Record<Side, string>;
  judgeLabel: string;
  rounds: number;
  strictMode: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const { score, verdict } = final;

  async function copy() {
    await navigator.clipboard.writeText(
      summaryText({ motion, models, judgeLabel, rounds, strictMode, final }),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const votes = [
    { label: "PRO", value: verdict.pro, color: "var(--court-blue)" },
    { label: "Tie", value: verdict.tie, color: "var(--court-line-strong)" },
    { label: "CON", value: verdict.con, color: "var(--court-ink)" },
  ];

  return (
    <div>
      <p className="font-display text-5xl leading-none font-semibold">
        {score.winner === "draw" ? "A draw" : `${score.winner} wins`}
      </p>
      <p className="mt-2 text-lg">
        {score.winner !== "draw" && `By ${Math.abs(score.margin).toFixed(2)} points. `}PRO{" "}
        {score.PRO.T.toFixed(2)}, CON {score.CON.T.toFixed(2)}.
      </p>
      <ul className="mt-4 space-y-2" aria-label="Jev's votes">
        {votes.map((vote) => (
          <li
            key={vote.label}
            className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3 text-sm font-bold"
          >
            <span>{vote.label}</span>
            <span className="h-3 overflow-hidden rounded-full bg-[var(--court-ground)]">
              <span
                className="block h-full rounded-full"
                style={{ width: percent(vote.value), background: vote.color }}
              />
            </span>
            <span className="text-right tabular-nums">{percent(vote.value)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={pillQuiet}>
          {copied ? "Copied" : "Copy summary"}
        </button>
        <button type="button" onClick={onClose} className={`${pill} bg-[var(--court-blue)] text-white`}>
          Back to the court
        </button>
      </div>
    </div>
  );
}

export function Courtroom(props: ArenaProps) {
  const arena = useArena(props);
  const { state, values, models, pack, problems, checking, running, chosen, setup } = arena;
  const [dismissed, setDismissed] = useState<FinalEvent | null>(null);
  // On a phone the controls stay folded, so the court is in view; Start sits beside the toggle.
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [gavelPokes, setGavelPokes] = useState(0);

  const turnsOf = (side: Side) => state.turns.filter((turn) => turn.side === side);
  const last = state.turns.at(-1);
  const speaking = running && last && !last.ended ? last.side : null;
  const started = state.turns.length > 0;
  // A slow model can take a long while to say its first word; the wait is shown rather than left silent.
  const thinking = !!speaking && !!last && last.sentences.length === 0 && last.partial === "";
  const turnStart = useRef<{ id: string; at: number } | null>(null);
  if (last && turnStart.current?.id !== last.id) turnStart.current = { id: last.id, at: Date.now() };
  const [, tick] = useState(0);
  useEffect(() => {
    if (!thinking) return;
    const timer = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [thinking]);
  const waited = thinking && turnStart.current ? Math.floor((Date.now() - turnStart.current.at) / 1000) : 0;
  const blocked = problems.length > 0 || !pack || checking || !chosen;

  const keys: Record<Side, string> = { PRO: values.pro, CON: values.con };
  const vendors = { PRO: vendorOfModel(values.pro, setup), CON: vendorOfModel(values.con, setup) };
  const labels = { PRO: arena.label(keys.PRO), CON: arena.label(keys.CON) };
  const makers = {
    PRO: vendors.PRO === "unknown" ? labels.PRO : vendorName(vendors.PRO),
    CON: vendors.CON === "unknown" ? labels.CON : vendorName(vendors.CON),
  };

  // Only a retraction is stamped: it is the event, and a stamp on every verdict would bury it.
  const latest = state.recent[0];
  const retractionFor = (side: Side) =>
    latest && isRetracted(latest.verdict) && latest.id.startsWith(`${side}-`)
      ? { id: latest.id, reason: latest.verdict === "contradicted" ? "contradicted" : "unsupported" }
      : null;
  const hitsOf = (side: Side) =>
    turnsOf(side).reduce(
      (n, turn) => n + turn.sentences.filter((x) => x.status !== "pending" && isRetracted(x.status)).length,
      0,
    );

  const final = state.final;
  const zoomJudge = !!final && final !== dismissed;
  const margin = state.score ? state.score.PRO.T - state.score.CON.T : 0;
  const median = medianLatencyMs(state);

  return (
    <div data-demo={values.demoMode} className="court fixed inset-0 z-40">
      <div className="absolute inset-0 overflow-y-auto lg:overflow-hidden">
        <div className="relative flex min-h-full flex-col lg:h-full">
          <div className="court-bar relative z-20">
            <div className="mx-auto w-full max-w-[1680px] px-4 py-3 sm:px-8">
              <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 lg:flex-nowrap">
                <Link href="/" aria-label="TribunaLLM, back to the arena" className="shrink-0 text-base">
                  <Logo className="text-2xl lg:text-3xl" markClassName="size-10 lg:size-12" />
                </Link>
                <h1 className="font-display order-last w-full max-w-4xl text-center text-2xl leading-tight font-semibold text-balance lg:order-none lg:w-auto lg:text-3xl">
                  {pack?.motion ?? "No evidence packs found in packs/"}
                </h1>
                <Link href="/leaderboard" className="shrink-0 text-sm font-bold text-muted hover:text-fg">
                  Leaderboard
                </Link>
              </header>

              <div className="mt-3 flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={running ? arena.halt : () => void arena.start()}
                  disabled={!running && blocked}
                  className={`${pill} bg-[var(--court-blue)] text-white disabled:opacity-50`}
                >
                  {running ? "Stop" : "Start"}
                </button>
                <button
                  type="button"
                  aria-expanded={settingsOpen}
                  onClick={() => setSettingsOpen((open) => !open)}
                  className={pillQuiet}
                >
                  {settingsOpen ? "Hide settings" : "Settings"}
                </button>
              </div>
              <div className={`mt-3 lg:block ${settingsOpen ? "block" : "hidden"}`}>
                <Controls
                  packs={props.packs}
                  models={models}
                  values={values}
                  running={running}
                  blocked={blocked}
                  onChange={arena.changeValues}
                  onStart={() => void arena.start()}
                  onStop={arena.halt}
                />
              </div>

              {checking && (
                <p className="mt-2 text-sm text-muted">Checking the keys saved in this browser...</p>
              )}
              {problems.length > 0 && (
                <div role="alert" className="mt-2 text-sm">
                  {problems.join(" ")}{" "}
                  <Link href="/settings" className="font-bold underline underline-offset-2">
                    Open settings
                  </Link>
                </div>
              )}
              {state.error && (
                <p role="alert" className="mt-2 text-sm">
                  {state.error}
                </p>
              )}
            </div>
          </div>

          <main className="relative flex min-h-0 flex-1 flex-col lg:block">
            <div className="relative h-[60dvh] shrink-0 lg:absolute lg:inset-0 lg:h-auto">
              <Stage
                vendors={vendors}
                labels={labels}
                makers={makers}
                speaking={speaking}
                thinking={thinking}
                winner={final ? final.score.winner : null}
                hits={{ PRO: hitsOf("PRO"), CON: hitsOf("CON") }}
                retracted={state.retracted}
                margin={margin}
                totals={{
                  PRO: state.score ? state.score.PRO.T.toFixed(1) : "0.0",
                  CON: state.score ? state.score.CON.T.toFixed(1) : "0.0",
                }}
                zoomJudge={zoomJudge}
                judging={zoomJudge}
                gavelPokes={gavelPokes}
                onPokeJudge={() => setGavelPokes((n) => n + 1)}
              />

              {zoomJudge && final && (
                <div className="court-card court-paper absolute inset-x-4 bottom-4 rounded-3xl p-6 lg:inset-x-auto lg:top-1/2 lg:right-[7%] lg:bottom-auto lg:w-[26rem] lg:-translate-y-1/2">
                  <Ruling
                    final={final}
                    motion={pack?.motion ?? ""}
                    models={labels}
                    judgeLabel={arena.judgeLabel}
                    rounds={values.rounds}
                    strictMode={values.strictMode}
                    onClose={() => setDismissed(final)}
                  />
                </div>
              )}
            </div>

            {!zoomJudge && (
              <div className="pointer-events-none px-4 pt-3 lg:absolute lg:inset-x-0 lg:bottom-4 lg:flex lg:justify-center lg:pt-0">
                <div className="court-card pointer-events-auto flex w-full max-w-2xl flex-wrap items-center gap-x-4 gap-y-1 rounded-3xl px-5 py-2.5">
                  <p className="font-display text-xl leading-none font-semibold">Jev</p>
                  <p className={`font-bold ${values.demoMode ? "text-xl" : ""}`}>
                    {state.judged} judged · {state.retracted} retracted · {state.contradicted} contradicted
                  </p>
                  <p className="text-sm text-[var(--court-ink-soft)]">
                    {arena.judgeLabel}
                    {state.latencies.length > 0 &&
                      `, ${Math.round(median)} ms median, ${(state.costUsd * 100).toFixed(2)}¢`}
                  </p>
                  {state.rewind && (
                    <p key={state.rewind.count} className="basis-full truncate text-sm" role="status">
                      <span className="font-bold text-[var(--court-signal)]">Rewound after retracting:</span>{" "}
                      “{state.rewind.text}”
                    </p>
                  )}
                </div>
              </div>
            )}

            <div
              className={`relative grid gap-4 p-4 sm:px-8 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:grid-cols-[minmax(0,25rem)_minmax(0,1fr)_minmax(0,25rem)] lg:pt-6 lg:transition-opacity ${zoomJudge ? "lg:opacity-0" : ""}`}
              inert={zoomJudge}
            >
              <Transcript
                side="PRO"
                turns={turnsOf("PRO")}
                waiting={!started}
                speaking={speaking === "PRO"}
                thinkingFor={thinking && speaking === "PRO" ? waited : null}
                retraction={retractionFor("PRO")}
                className="max-lg:max-h-80 lg:pointer-events-auto lg:max-h-[34dvh]"
              />
              <div className="hidden lg:block" />
              <Transcript
                side="CON"
                turns={turnsOf("CON")}
                waiting={!started}
                speaking={speaking === "CON"}
                thinkingFor={thinking && speaking === "CON" ? waited : null}
                retraction={retractionFor("CON")}
                className="max-lg:max-h-80 lg:pointer-events-auto lg:max-h-[34dvh]"
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

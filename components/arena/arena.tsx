"use client";

import Link from "next/link";
import { Column } from "./column";
import { Controls } from "./controls";
import { FinalCard } from "./final-card";
import { JudgePanel } from "./judge-panel";
import { type ArenaProps, useArena } from "./use-arena";

export function Arena(props: ArenaProps) {
  const {
    state,
    values,
    changeValues,
    models,
    pack,
    problems,
    checking,
    running,
    chosen,
    label,
    judgeLabel,
    start,
    halt,
  } = useArena(props);
  const { packs } = props;

  const turnsOf = (side: "PRO" | "CON") => state.turns.filter((turn) => turn.side === side);

  return (
    <main data-demo={values.demoMode} className="mx-auto w-full max-w-[1400px] px-4 pb-12 sm:px-6">
      <h1 className="text-2xl font-semibold leading-snug sm:text-3xl">
        {pack?.motion ?? "No evidence packs found in packs/"}
      </h1>

      <div className="mt-5">
        <Controls
          packs={packs}
          models={models}
          values={values}
          running={running}
          blocked={problems.length > 0 || !pack || checking || !chosen}
          onChange={changeValues}
          onStart={() => void start()}
          onStop={halt}
        />
      </div>

      {checking && <p className="mt-5 text-sm text-muted">Checking the keys saved in this browser...</p>}
      {problems.length > 0 && (
        <div role="alert" className="mt-5 border-l-2 border-unsupported pl-3 text-sm">
          <ul className="space-y-1">
            {problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
          <p className="mt-2">
            <Link href="/settings" className="underline underline-offset-2">
              Open settings
            </Link>
          </p>
        </div>
      )}
      {state.error && (
        <p role="alert" className="mt-5 border-l-2 border-contradicted pl-3 text-sm">
          {state.error}
        </p>
      )}

      {state.final && (
        <div className="mt-6">
          <FinalCard
            final={state.final}
            motion={pack?.motion ?? ""}
            models={{ PRO: label(values.pro), CON: label(values.con) }}
            judgeLabel={judgeLabel}
            rounds={values.rounds}
            strictMode={values.strictMode}
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_20rem_minmax(0,1fr)]">
        <div className="order-2 lg:order-1">
          <Column side="PRO" model={state.turns.length ? label(values.pro) : null} turns={turnsOf("PRO")} />
        </div>
        <div className="order-1 lg:order-2">
          <JudgePanel state={state} judgeLabel={judgeLabel} demo={values.demoMode} />
        </div>
        <div className="order-3">
          <Column side="CON" model={state.turns.length ? label(values.con) : null} turns={turnsOf("CON")} />
        </div>
      </div>
    </main>
  );
}

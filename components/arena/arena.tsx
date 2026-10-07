"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { streamDebate } from "@/lib/debate/client";
import { initialState, reduceArena } from "@/lib/debate/view";
import { Column } from "./column";
import { type ControlValues, Controls, type ModelOption, type PackOption } from "./controls";
import { FinalCard } from "./final-card";
import { JudgePanel } from "./judge-panel";

interface Props {
  packs: PackOption[];
  models: ModelOption[];
  problems: string[];
  judge: { label: string; mock: boolean };
  initial: { auto: boolean; pack: string; pro: string; con: string };
}

const MAX_WORDS = 110;

export function Arena({ packs, models, problems, judge, initial }: Props) {
  const [values, setValues] = useState<ControlValues>({
    pack: initial.pack,
    pro: initial.pro,
    con: initial.con,
    rounds: 3,
    strictMode: true,
    demoMode: false,
  });
  const [state, dispatch] = useReducer(reduceArena, initialState);
  const stop = useRef<AbortController | null>(null);
  const autostarted = useRef(false);

  const running = state.status === "running";
  const pack = packs.find((candidate) => candidate.slug === values.pack);
  const label = (key: string) => models.find((model) => model.key === key)?.label ?? key;
  const judgeLabel = judge.mock ? "Jev (mock)" : judge.label;

  const start = useCallback(async () => {
    stop.current?.abort();
    const controller = new AbortController();
    stop.current = controller;
    dispatch({ type: "reset" });
    try {
      const request = {
        pack: values.pack,
        pro: values.pro,
        con: values.con,
        rounds: values.rounds,
        maxWords: MAX_WORDS,
        strictMode: values.strictMode,
      };
      for await (const event of streamDebate(request, controller.signal)) dispatch(event);
    } catch (error) {
      if (!controller.signal.aborted) {
        dispatch({
          type: "error",
          message: error instanceof Error ? error.message : "The debate could not start.",
        });
      }
    }
  }, [values]);

  const halt = useCallback(() => {
    stop.current?.abort();
    dispatch({ type: "error", message: "Stopped." });
  }, []);

  useEffect(() => {
    if (initial.auto && problems.length === 0 && !autostarted.current) {
      autostarted.current = true;
      void start();
    }
  }, [initial.auto, problems.length, start]);

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
          blocked={problems.length > 0 || !pack}
          onChange={setValues}
          onStart={() => void start()}
          onStop={halt}
        />
      </div>

      {problems.length > 0 && (
        <ul role="alert" className="mt-5 space-y-1 border-l-2 border-unsupported pl-3 text-sm">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
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

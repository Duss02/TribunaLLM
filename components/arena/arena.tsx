"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { fetchSetup, streamDebate } from "@/lib/debate/client";
import { initialState, reduceArena } from "@/lib/debate/view";
import { readKeys } from "@/lib/keys-store";
import type { SetupStatus } from "@/lib/setup-status";
import { Column } from "./column";
import { pickerOptions } from "@/lib/model-search";
import { type ControlValues, Controls, type PackOption } from "./controls";
import { FinalCard } from "./final-card";
import { JudgePanel } from "./judge-panel";

interface Props {
  packs: PackOption[];
  /** What the server's own environment makes possible. Saved keys are added on top after load. */
  setup: SetupStatus;
  judge: { label: string; mock: boolean };
  initial: {
    auto: boolean;
    pack: string;
    pro: string;
    con: string;
    /** The models the address asked for, which only the saved keys may make available. */
    wanted: { pro?: string; con?: string };
  };
}

const MAX_WORDS = 110;

export function Arena({ packs, setup: serverSetup, judge, initial }: Props) {
  const [values, setValues] = useState<ControlValues>({
    pack: initial.pack,
    pro: initial.pro,
    con: initial.con,
    rounds: 3,
    strictMode: true,
    demoMode: false,
  });
  const [state, dispatch] = useReducer(reduceArena, initialState);
  const [setup, setSetup] = useState(serverSetup);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const stop = useRef<AbortController | null>(null);
  const autostarted = useRef(false);
  const wanted = useRef(initial.wanted);

  const running = state.status === "running";
  const pack = packs.find((candidate) => candidate.slug === values.pack);
  const models = useMemo(() => pickerOptions(setup), [setup]);
  const problems = checkError ? [...setup.problems, checkError] : setup.problems;
  const label = (key: string) => models.find((model) => model.key === key)?.label ?? key;
  const judgeLabel = judge.mock ? "Jev (mock)" : judge.label;
  const chosen = models.some((m) => m.key === values.pro) && models.some((m) => m.key === values.con);

  useEffect(() => {
    const keys = readKeys();
    if (Object.keys(keys).length === 0) return;
    const controller = new AbortController();
    setChecking(true);
    fetchSetup(keys, controller.signal)
      .then(setSetup)
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCheckError(error instanceof Error ? error.message : "The saved keys could not be checked.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const available = pickerOptions(setup);
    const choose = (current: string, asked: string | undefined, fallback: number) =>
      [asked, current].find((key) => available.some((model) => model.key === key)) ??
      available[fallback]?.key ??
      "";
    setValues((v) => {
      const pro = choose(v.pro, wanted.current.pro, 0);
      const con = choose(v.con, wanted.current.con, 1);
      return pro === v.pro && con === v.con ? v : { ...v, pro, con };
    });
  }, [setup]);

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
        keys: readKeys(),
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

  const ready = !checking && problems.length === 0 && chosen;
  useEffect(() => {
    if (initial.auto && ready && !autostarted.current) {
      autostarted.current = true;
      void start();
    }
  }, [initial.auto, ready, start]);

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
          onChange={(next) => {
            wanted.current = {};
            setValues(next);
          }}
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

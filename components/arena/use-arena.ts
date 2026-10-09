"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { fetchSetup, streamDebate } from "@/lib/debate/client";
import { initialState, reduceArena } from "@/lib/debate/view";
import { readKeys } from "@/lib/keys-store";
import { pickerOptions } from "@/lib/model-search";
import { DEFAULT_MODE } from "@/lib/debate/mode";
import type { SetupStatus } from "@/lib/setup-status";
import type { ControlValues, PackOption } from "./controls";

export interface ArenaProps {
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

/** Everything a debate screen needs: the controls, the stream, the setup check and the derived labels. */
export function useArena({ packs, setup: serverSetup, judge, initial }: ArenaProps) {
  const [values, setValues] = useState<ControlValues>({
    pack: initial.pack,
    pro: initial.pro,
    con: initial.con,
    rounds: 3,
    strictMode: true,
    mode: DEFAULT_MODE,
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
        mode: values.mode,
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

  const changeValues = useCallback((next: ControlValues) => {
    wanted.current = {};
    setValues(next);
  }, []);

  return {
    state,
    values,
    changeValues,
    setup,
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
  };
}

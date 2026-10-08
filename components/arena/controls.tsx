"use client";

import type { PickerOption } from "@/lib/model-search";
import { ModelPicker } from "./model-picker";

export interface PackOption {
  slug: string;
  title: string;
  motion: string;
}

export interface ControlValues {
  pack: string;
  pro: string;
  con: string;
  rounds: number;
  strictMode: boolean;
  demoMode: boolean;
}

interface Props {
  packs: PackOption[];
  models: PickerOption[];
  values: ControlValues;
  running: boolean;
  blocked: boolean;
  onChange: (values: ControlValues) => void;
  onStart: () => void;
  onStop: () => void;
}

const field = "flex flex-col gap-1 text-xs text-muted";
const input =
  "rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function Controls({ packs, models, values, running, blocked, onChange, onStart, onStop }: Props) {
  const set = <K extends keyof ControlValues>(key: K, value: ControlValues[K]) =>
    onChange({ ...values, [key]: value });

  return (
    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
      <label className={`${field} min-w-44 flex-1`}>
        Evidence pack
        <select
          className={input}
          value={values.pack}
          disabled={running}
          onChange={(e) => set("pack", e.target.value)}
        >
          {packs.map((pack) => (
            <option key={pack.slug} value={pack.slug}>
              {pack.title}
            </option>
          ))}
        </select>
      </label>
      <ModelPicker
        label="PRO"
        options={models}
        value={values.pro}
        disabled={running}
        onChange={(key) => set("pro", key)}
      />
      <ModelPicker
        label="CON"
        options={models}
        value={values.con}
        disabled={running}
        onChange={(key) => set("con", key)}
      />
      <label className={field}>
        Rounds
        <select
          className={input}
          value={values.rounds}
          disabled={running}
          onChange={(e) => set("rounds", Number(e.target.value))}
        >
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label
        className="flex items-center gap-2 pb-2 text-sm"
        title="When Jev retracts a sentence while a turn is still being written, the turn is cut there and restarted, at most twice. Off, the turn runs to its end."
      >
        <input
          type="checkbox"
          checked={values.strictMode}
          disabled={running}
          onChange={(e) => set("strictMode", e.target.checked)}
        />
        Strict mode
      </label>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={values.demoMode}
          onChange={(e) => set("demoMode", e.target.checked)}
        />
        Demo mode
      </label>
      <button
        type="button"
        onClick={running ? onStop : onStart}
        disabled={blocked && !running}
        className="rounded bg-accent px-5 py-1.5 text-sm font-medium text-bg outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:opacity-40"
      >
        {running ? "Stop" : "Start"}
      </button>
    </div>
  );
}

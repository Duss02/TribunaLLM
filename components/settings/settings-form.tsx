"use client";

import { useEffect, useState } from "react";
import { fetchSetup } from "@/lib/debate/client";
import { KEY_FIELDS, type KeyField, type SavedKeys, keysSchema, maskKey } from "@/lib/keys";
import { clearKeys, readKeys, removeKey, saveKeys } from "@/lib/keys-store";
import type { SetupStatus } from "@/lib/setup-status";

type Check =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "error"; message: string }
  | { state: "done"; status: SetupStatus };

const GROUPS: { group: KeyField["group"]; title: string; note: string }[] = [
  { group: "judge", title: "Judge", note: "Needed for every debate." },
  { group: "route", title: "Debater route", note: "One of these is enough for the whole roster." },
  { group: "direct", title: "Direct provider keys", note: "Only for the vendor's own models." },
];

const button =
  "rounded border border-line px-3 py-1.5 text-sm outline-none hover:bg-line focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-40";

export function SettingsForm({ onServer, mock }: { onServer: Record<string, boolean>; mock: boolean }) {
  const [saved, setSaved] = useState<SavedKeys>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [check, setCheck] = useState<Check>({ state: "idle" });

  useEffect(() => setSaved(readKeys()), []);

  const entered = Object.entries(drafts).filter(([, value]) => value.trim() !== "");
  const savedCount = Object.keys(saved).length;

  function save() {
    const parsed = keysSchema.safeParse(Object.fromEntries(entered));
    if (!parsed.success) {
      setNotice("A key is longer than 512 characters, so it was not saved.");
      return;
    }
    if (!saveKeys(parsed.data)) {
      setNotice(
        "This browser would not store the keys. Allow site data for this page, or put them in .env.local.",
      );
      return;
    }
    setSaved(readKeys());
    setDrafts({});
    setCheck({ state: "idle" });
    setNotice(`Saved ${entered.length === 1 ? "1 key" : `${entered.length} keys`} in this browser.`);
  }

  function remove(variable: string) {
    removeKey(variable);
    setSaved(readKeys());
    setCheck({ state: "idle" });
    setNotice(`Removed ${variable} from this browser.`);
  }

  function removeAll() {
    clearKeys();
    setSaved(readKeys());
    setCheck({ state: "idle" });
    setNotice("Removed every saved key from this browser.");
  }

  async function verify() {
    setCheck({ state: "checking" });
    try {
      setCheck({ state: "done", status: await fetchSetup(saved, new AbortController().signal) });
    } catch (error) {
      setCheck({ state: "error", message: error instanceof Error ? error.message : "The check failed." });
    }
  }

  return (
    <div className="space-y-10">
      {mock && (
        <p role="status" className="max-w-2xl border-l-2 border-unsupported pl-3 text-sm">
          The server runs with JEV_MOCK=1: the judge and the debaters are fake, so no keys are needed.
        </p>
      )}

      {GROUPS.map(({ group, title, note }) => (
        <section key={group} aria-labelledby={`group-${group}`}>
          <h2 id={`group-${group}`} className="text-lg font-semibold">
            {title}
          </h2>
          <p className="mb-2 text-sm text-muted">{note}</p>
          <ul>
            {KEY_FIELDS.filter((field) => field.group === group).map((field) => {
              const value = saved[field.variable];
              return (
                <li
                  key={field.variable}
                  className="grid gap-x-6 gap-y-2 border-t border-line py-4 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]"
                >
                  <div>
                    <label htmlFor={field.variable} className="font-medium">
                      {field.label}
                    </label>
                    <p className="text-xs text-muted">{field.variable}</p>
                    <p className="mt-1 text-sm text-muted">
                      {field.help}{" "}
                      <a
                        href={field.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2 hover:text-fg"
                      >
                        Get a key
                      </a>
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="mb-2 flex flex-wrap gap-x-4 text-sm">
                      <span className={value ? "text-supported" : "text-muted"}>
                        {value ? `Saved in this browser (${maskKey(value)})` : "Not saved in this browser"}
                      </span>
                      <span className="text-muted">
                        {onServer[field.variable] ? "Set on the server" : "Not set on the server"}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <input
                        id={field.variable}
                        name={field.variable}
                        type="password"
                        autoComplete="new-password"
                        autoCapitalize="off"
                        spellCheck={false}
                        placeholder={value ? "Paste a new key to replace it" : "Paste a key"}
                        value={drafts[field.variable] ?? ""}
                        onChange={(event) => setDrafts({ ...drafts, [field.variable]: event.target.value })}
                        className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-accent"
                      />
                      {value && (
                        <button type="button" onClick={() => remove(field.variable)} className={button}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <section aria-label="Actions" className="border-t border-line pt-5">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={entered.length === 0}
            className="rounded bg-accent px-5 py-1.5 text-sm font-medium text-bg outline-none focus-visible:ring-2 focus-visible:ring-fg disabled:opacity-40"
          >
            Save in this browser
          </button>
          <button type="button" onClick={verify} disabled={check.state === "checking"} className={button}>
            Check what the keys unlock
          </button>
          <button type="button" onClick={removeAll} disabled={savedCount === 0} className={button}>
            Remove all saved keys
          </button>
        </div>
        {notice && (
          <p role="status" className="mt-3 text-sm">
            {notice}
          </p>
        )}
        <CheckResult check={check} />
      </section>
    </div>
  );
}

function CheckResult({ check }: { check: Check }) {
  if (check.state === "idle") return null;
  if (check.state === "checking") return <p className="mt-3 text-sm text-muted">Checking...</p>;
  if (check.state === "error") {
    return (
      <p role="alert" className="mt-3 border-l-2 border-contradicted pl-3 text-sm">
        {check.message}
      </p>
    );
  }

  const { problems, models, catalogue, notes } = check.status;
  const available = models.filter((model) => model.status === "available");
  const unavailable = models.filter((model) => model.status !== "available");
  return (
    <div className="mt-3 space-y-2 text-sm" role="status">
      {problems.length === 0 ? (
        <p className="text-supported">
          Ready: the judge and {available.length + catalogue.length} models are available.
        </p>
      ) : (
        <ul className="space-y-1 border-l-2 border-unsupported pl-3">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      <p className="text-muted">
        {available.length} of {models.length} roster models available with the saved keys and the server's
        environment.
        {catalogue.length > 0 &&
          ` ${catalogue.length} more models from your keys can be found by searching the PRO and CON menus.`}
      </p>
      {notes.length > 0 && (
        <ul className="space-y-1 border-l-2 border-unsupported pl-3">
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
      {unavailable.length > 0 && (
        <details>
          <summary className="cursor-pointer text-muted">Why {unavailable.length} are not available</summary>
          <ul className="mt-2 space-y-1">
            {unavailable.map((model) => (
              <li key={model.key}>
                <span className="font-medium">{model.label}</span>{" "}
                <span className="text-muted">{model.detail}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

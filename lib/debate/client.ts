import type { SavedKeys } from "@/lib/keys";
import { type SetupStatus, setupStatus } from "@/lib/setup-status";
import type { DebateEvent } from "./events";
import { createEventParser } from "./sse";

export interface DebateRequest {
  pack: string;
  pro: string;
  con: string;
  rounds: number;
  maxWords: number;
  strictMode: boolean;
  /** Keys saved in this browser. The server uses them for this debate only. */
  keys?: SavedKeys;
}

/** Posts the request and yields events as the server sends them. Throws the server's message on a refusal. */
export async function* streamDebate(
  request: DebateRequest,
  signal: AbortSignal,
): AsyncGenerator<DebateEvent> {
  const response = await fetch("/api/debate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });
  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `The server answered HTTP ${response.status}.`);
  }

  const parse = createEventParser();
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return;
    yield* parse(value);
  }
}

/** Asks the server what the given keys, on top of its own environment, make possible. */
export async function fetchSetup(keys: SavedKeys, signal: AbortSignal): Promise<SetupStatus> {
  const response = await fetch("/api/setup", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ keys }),
    signal,
  });
  if (!response.ok) throw new Error(`The server could not check the saved keys (HTTP ${response.status}).`);
  return setupStatus.parse(await response.json());
}

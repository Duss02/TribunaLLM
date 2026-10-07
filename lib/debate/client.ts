import type { DebateEvent } from "./events";
import { createEventParser } from "./sse";

export interface DebateRequest {
  pack: string;
  pro: string;
  con: string;
  rounds: number;
  maxWords: number;
  strictMode: boolean;
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

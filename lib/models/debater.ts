import { type LanguageModel, streamText } from "ai";
import { type ModelStatus, keyFor, modelStatus } from "./availability";
import { resolveEntry } from "./dynamic";
import type { RegistryEntry } from "./registry";
import { scriptedModel } from "./scripted";
import { targetsFor } from "./routes";

const DEBATER_TEMPERATURE = 0.7;
// Room for a low reasoning budget plus a turn of about 110 words.
const MAX_OUTPUT_TOKENS = 2000;

export interface Debater {
  entry: RegistryEntry;
  route: NonNullable<ModelStatus["route"]>;
  model: LanguageModel;
}

export interface TurnUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
}

export interface TurnStream {
  text: AsyncIterable<string>;
  /** Call after the text has been fully read. Do not call it after aborting. */
  usage(): Promise<TurnUsage>;
}

export async function resolveDebater(key: string, { paced }: { paced: boolean }): Promise<Debater> {
  const entry = await resolveEntry(key);
  if (!entry) {
    throw new Error(
      `Unknown model "${key}". Use a registry key from pnpm models, or gateway:<id>, openrouter:<id> or <provider>:<id>.`,
    );
  }

  const status = await modelStatus(entry);
  if (status.route === "scripted")
    return { entry, route: "scripted", model: scriptedModel({ paced, name: key }) };

  const target = targetsFor(entry).find((candidate) => candidate.route === status.route);
  const apiKey = target && keyFor(target);
  if (status.status !== "available" || !target || !apiKey) {
    throw new Error(
      `${entry.label} is ${status.status}: ${status.detail}. Run pnpm models for the full table.`,
    );
  }
  return { entry, route: target.route, model: target.create(apiKey) };
}

export function streamDebaterTurn(
  debater: Debater,
  request: { system: string; user: string; signal?: AbortSignal },
): TurnStream {
  let failure: unknown;
  const result = streamText({
    model: debater.model,
    system: request.system,
    messages: [{ role: "user", content: request.user }],
    temperature: debater.entry.fixedTemperature ? undefined : DEBATER_TEMPERATURE,
    maxOutputTokens: MAX_OUTPUT_TOKENS,
    reasoning: "low",
    abortSignal: request.signal,
    timeout: { firstChunkMs: 90_000, chunkMs: 45_000 },
    // textStream drops error parts, so they are kept here and thrown after the read.
    onError: ({ error }) => {
      failure = error;
    },
  });

  async function* text() {
    for await (const chunk of result.textStream) yield chunk;
    if (failure !== undefined) throw failure;
  }

  return {
    text: text(),
    usage: async () => {
      const usage = await result.usage;
      return {
        inputTokens: usage.inputTokens ?? 0,
        outputTokens: usage.outputTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails?.reasoningTokens ?? 0,
      };
    },
  };
}

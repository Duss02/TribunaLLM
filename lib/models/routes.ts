import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway, type LanguageModel } from "ai";
import { z } from "zod";
import type { DirectProvider, RegistryEntry } from "./registry";

export type RouteName = "gateway" | "openrouter" | "direct";

export interface Target {
  route: RouteName;
  id: string;
  keyVariable: string;
  /** Where the id is checked: targets sharing a list name share one fetch. */
  listName: string;
  listIds(apiKey: string): Promise<Set<string>>;
  create(apiKey: string): LanguageModel;
}

/** A model list that could not be read; `status` is set when the server answered. */
export class ListError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ListError";
  }
}

const openAiStyleList = z.object({ data: z.array(z.object({ id: z.string() })) });
const googleList = z.object({ models: z.array(z.object({ name: z.string() })) });

async function fetchList(url: string, headers: Record<string, string>): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
  } catch (cause) {
    throw new ListError(`could not reach the model list (${(cause as Error).name})`);
  }
  if (!response.ok) throw new ListError(`model list returned HTTP ${response.status}`, response.status);
  return response.json();
}

function idsFromOpenAiStyle(json: unknown): Set<string> {
  const parsed = openAiStyleList.safeParse(json);
  if (!parsed.success) throw new ListError("model list had an unexpected shape");
  return new Set(parsed.data.data.map((model) => model.id));
}

const bearer = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

const COMPATIBLE = {
  deepseek: { keyVariable: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com/v1" },
  moonshot: { keyVariable: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.ai/v1" },
  mistral: { keyVariable: "MISTRAL_API_KEY", baseURL: "https://api.mistral.ai/v1" },
  xai: { keyVariable: "XAI_API_KEY", baseURL: "https://api.x.ai/v1" },
} as const;

function directTarget(provider: DirectProvider, id: string): Target {
  const base = { route: "direct", id, listName: `direct:${provider}` } as const;

  switch (provider) {
    case "anthropic":
      return {
        ...base,
        keyVariable: "ANTHROPIC_API_KEY",
        listIds: async (apiKey) =>
          idsFromOpenAiStyle(
            await fetchList("https://api.anthropic.com/v1/models?limit=1000", {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            }),
          ),
        create: (apiKey) => createAnthropic({ apiKey })(id),
      };
    case "openai":
      return {
        ...base,
        keyVariable: "OPENAI_API_KEY",
        listIds: async (apiKey) =>
          idsFromOpenAiStyle(await fetchList("https://api.openai.com/v1/models", bearer(apiKey))),
        create: (apiKey) => createOpenAI({ apiKey })(id),
      };
    case "google":
      return {
        ...base,
        keyVariable: "GOOGLE_GENERATIVE_AI_API_KEY",
        listIds: async (apiKey) => {
          const json = await fetchList(
            "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
            { "x-goog-api-key": apiKey },
          );
          const parsed = googleList.safeParse(json);
          if (!parsed.success) throw new ListError("model list had an unexpected shape");
          return new Set(parsed.data.models.map((model) => model.name.replace(/^models\//, "")));
        },
        create: (apiKey) => createGoogleGenerativeAI({ apiKey })(id),
      };
    default: {
      const { keyVariable, baseURL } = COMPATIBLE[provider];
      return {
        ...base,
        keyVariable,
        listIds: async (apiKey) => idsFromOpenAiStyle(await fetchList(`${baseURL}/models`, bearer(apiKey))),
        create: (apiKey) =>
          createOpenAICompatible({ name: provider, baseURL, apiKey, includeUsage: true }).chatModel(id),
      };
    }
  }
}

/** Routes an entry can be reached on, best first: gateway, OpenRouter, direct. */
export function targetsFor(entry: RegistryEntry): Target[] {
  const { gateway, openrouter, direct } = entry.routes;
  const targets: Target[] = [];

  if (gateway) {
    targets.push({
      route: "gateway",
      id: gateway,
      keyVariable: "AI_GATEWAY_API_KEY",
      listName: "gateway",
      listIds: async () => idsFromOpenAiStyle(await fetchList("https://ai-gateway.vercel.sh/v1/models", {})),
      create: (apiKey) => createGateway({ apiKey })(gateway),
    });
  }
  if (openrouter) {
    targets.push({
      route: "openrouter",
      id: openrouter,
      keyVariable: "OPENROUTER_API_KEY",
      listName: "openrouter",
      listIds: async () => idsFromOpenAiStyle(await fetchList("https://openrouter.ai/api/v1/models", {})),
      create: (apiKey) =>
        createOpenAICompatible({
          name: "openrouter",
          baseURL: "https://openrouter.ai/api/v1",
          apiKey,
          includeUsage: true,
        }).chatModel(openrouter),
    });
  }
  if (direct) targets.push(directTarget(direct.provider, direct.id));
  return targets;
}

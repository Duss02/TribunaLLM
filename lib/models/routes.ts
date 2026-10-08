import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createGateway, type LanguageModel } from "ai";
import { z } from "zod";
import type { DirectProvider, RegistryEntry } from "./registry";

export type RouteName = "gateway" | "openrouter" | "direct";

/** One model as a route's own list describes it. Fields a list does not give are left out. */
export interface ListedModel {
  id: string;
  name: string;
  /** Who makes it, for grouping. */
  vendor: string;
  /** False for embedding, image and speech models. */
  chat: boolean;
  acceptsTemperature?: boolean;
  contextWindow?: number;
  /** US dollars per million tokens. */
  inputPrice?: number;
  outputPrice?: number;
}

/** A place that lists models: reachable with one key, whatever model is asked for. */
export interface ListSource {
  route: RouteName;
  /** The prefix of a model key from this source: `gateway`, `openrouter` or the provider's name. */
  channel: string;
  /** What this source is called on screen. */
  label: string;
  keyVariable: string;
  /** Where the list is cached: sources sharing a list name share one fetch. */
  listName: string;
  list(apiKey: string): Promise<ListedModel[]>;
}

export interface Target extends ListSource {
  id: string;
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

// A field that is missing or the wrong type is dropped, not an error: only `id` matters for availability.
const loose = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const perMillion = (perToken: string | undefined): number | undefined => {
  const value = Number(perToken);
  return perToken !== undefined && perToken !== "" && Number.isFinite(value) ? value * 1_000_000 : undefined;
};

function shape<T extends z.ZodType>(schema: T, json: unknown): z.infer<T> {
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ListError("model list had an unexpected shape");
  return parsed.data;
}

const gatewayList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: loose(z.string()),
      owned_by: loose(z.string()),
      type: loose(z.string()),
      context_window: loose(z.number()),
      temperature: loose(z.boolean()),
      pricing: loose(z.object({ input: loose(z.string()), output: loose(z.string()) })),
    }),
  ),
});

function gatewayModels(json: unknown): ListedModel[] {
  return shape(gatewayList, json).data.map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    vendor: m.owned_by ?? m.id.split("/")[0] ?? "",
    chat: m.type === undefined || m.type === "language",
    acceptsTemperature: m.temperature,
    contextWindow: m.context_window,
    inputPrice: perMillion(m.pricing?.input),
    outputPrice: perMillion(m.pricing?.output),
  }));
}

const openRouterList = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: loose(z.string()),
      context_length: loose(z.number()),
      architecture: loose(z.object({ output_modalities: loose(z.array(z.string())) })),
      pricing: loose(z.object({ prompt: loose(z.string()), completion: loose(z.string()) })),
      supported_parameters: loose(z.array(z.string())),
    }),
  ),
});

function openRouterModels(json: unknown): ListedModel[] {
  return shape(openRouterList, json).data.map((m) => ({
    id: m.id,
    name: m.name ?? m.id,
    vendor: m.id.split("/")[0] ?? "",
    // `:batch` ids are asynchronous batch endpoints and cannot stream.
    chat: !m.id.includes(":batch") && (m.architecture?.output_modalities?.includes("text") ?? true),
    acceptsTemperature: m.supported_parameters?.includes("temperature"),
    contextWindow: m.context_length,
    inputPrice: perMillion(m.pricing?.prompt),
    outputPrice: perMillion(m.pricing?.completion),
  }));
}

// Lists that do not say what a model is for: keep out the ones whose id names another job.
const NOT_CHAT = /embed|whisper|tts|dall-e|image|moderation|transcri|realtime|audio|rerank|ocr|sora|guard/i;

const openAiStyleList = z.object({ data: z.array(z.object({ id: z.string() })) });

function openAiStyleModels(json: unknown, vendor: string): ListedModel[] {
  return shape(openAiStyleList, json).data.map((m) => ({
    id: m.id,
    name: m.id,
    vendor,
    chat: !NOT_CHAT.test(m.id),
  }));
}

const anthropicList = z.object({
  data: z.array(z.object({ id: z.string(), display_name: loose(z.string()) })),
});

function anthropicModels(json: unknown): ListedModel[] {
  return shape(anthropicList, json).data.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.id,
    vendor: "Anthropic",
    chat: true,
  }));
}

const googleList = z.object({
  models: z.array(
    z.object({
      name: z.string(),
      displayName: loose(z.string()),
      supportedGenerationMethods: loose(z.array(z.string())),
      inputTokenLimit: loose(z.number()),
    }),
  ),
});

function googleModels(json: unknown): ListedModel[] {
  return shape(googleList, json).models.map((m) => {
    const id = m.name.replace(/^models\//, "");
    return {
      id,
      name: m.displayName ?? id,
      vendor: "Google",
      chat: m.supportedGenerationMethods?.includes("generateContent") ?? !NOT_CHAT.test(id),
      contextWindow: m.inputTokenLimit,
    };
  });
}

const bearer = (apiKey: string) => ({ Authorization: `Bearer ${apiKey}` });

const COMPATIBLE = {
  deepseek: { keyVariable: "DEEPSEEK_API_KEY", baseURL: "https://api.deepseek.com/v1", label: "DeepSeek" },
  moonshot: { keyVariable: "MOONSHOT_API_KEY", baseURL: "https://api.moonshot.ai/v1", label: "Moonshot AI" },
  mistral: { keyVariable: "MISTRAL_API_KEY", baseURL: "https://api.mistral.ai/v1", label: "Mistral" },
  xai: { keyVariable: "XAI_API_KEY", baseURL: "https://api.x.ai/v1", label: "xAI" },
} as const;

export const DIRECT_PROVIDERS = [
  "anthropic",
  "openai",
  "google",
  ...(Object.keys(COMPATIBLE) as (keyof typeof COMPATIBLE)[]),
] as const satisfies readonly DirectProvider[];

export const gatewaySource: ListSource = {
  route: "gateway",
  channel: "gateway",
  label: "AI Gateway",
  keyVariable: "AI_GATEWAY_API_KEY",
  listName: "gateway",
  list: async () => gatewayModels(await fetchList("https://ai-gateway.vercel.sh/v1/models", {})),
};

export const openRouterSource: ListSource = {
  route: "openrouter",
  channel: "openrouter",
  label: "OpenRouter",
  keyVariable: "OPENROUTER_API_KEY",
  listName: "openrouter",
  list: async () => openRouterModels(await fetchList("https://openrouter.ai/api/v1/models", {})),
};

export function directSource(provider: DirectProvider): ListSource {
  const base = { route: "direct", channel: provider, listName: `direct:${provider}` } as const;

  switch (provider) {
    case "anthropic":
      return {
        ...base,
        label: "Anthropic",
        keyVariable: "ANTHROPIC_API_KEY",
        list: async (apiKey) =>
          anthropicModels(
            await fetchList("https://api.anthropic.com/v1/models?limit=1000", {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            }),
          ),
      };
    case "openai":
      return {
        ...base,
        label: "OpenAI",
        keyVariable: "OPENAI_API_KEY",
        list: async (apiKey) =>
          openAiStyleModels(await fetchList("https://api.openai.com/v1/models", bearer(apiKey)), "OpenAI"),
      };
    case "google":
      return {
        ...base,
        label: "Google",
        keyVariable: "GOOGLE_GENERATIVE_AI_API_KEY",
        list: async (apiKey) =>
          googleModels(
            await fetchList("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
              "x-goog-api-key": apiKey,
            }),
          ),
      };
    default: {
      const { keyVariable, baseURL, label } = COMPATIBLE[provider];
      return {
        ...base,
        label,
        keyVariable,
        list: async (apiKey) =>
          openAiStyleModels(await fetchList(`${baseURL}/models`, bearer(apiKey)), label),
      };
    }
  }
}

/** Every source that lists models, best route first. */
export const allSources = (): ListSource[] => [
  gatewaySource,
  openRouterSource,
  ...DIRECT_PROVIDERS.map(directSource),
];

function directTarget(provider: DirectProvider, id: string): Target {
  const source = directSource(provider);
  switch (provider) {
    case "anthropic":
      return { ...source, id, create: (apiKey) => createAnthropic({ apiKey })(id) };
    case "openai":
      return { ...source, id, create: (apiKey) => createOpenAI({ apiKey })(id) };
    case "google":
      return { ...source, id, create: (apiKey) => createGoogleGenerativeAI({ apiKey })(id) };
    default: {
      const { baseURL } = COMPATIBLE[provider];
      return {
        ...source,
        id,
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
    targets.push({ ...gatewaySource, id: gateway, create: (apiKey) => createGateway({ apiKey })(gateway) });
  }
  if (openrouter) {
    targets.push({
      ...openRouterSource,
      id: openrouter,
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GATEWAY, OPENROUTER, blankEnvironment, gatewayList, openRouterList, serve } from "./fakes";

// Lists are cached per module, so each test loads a fresh copy.
async function catalogue() {
  vi.resetModules();
  const [{ buildCatalogue }, { withKeys }] = await Promise.all([
    import("@/lib/models/catalogue"),
    import("@/lib/credentials"),
  ]);
  return { buildCatalogue, withKeys };
}

const gatewayModels = [
  // In the roster, so it is not offered a second time.
  { id: "anthropic/claude-opus-5.5", name: "Claude Opus 5.5", owned_by: "anthropic", type: "language" },
  {
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    owned_by: "anthropic",
    type: "language",
    context_window: 200_000,
    temperature: true,
    pricing: { input: "0.00000025", output: "0.00000125" },
  },
  { id: "openai/text-embedding-3-small", name: "Embedding", owned_by: "openai", type: "embedding" },
  { id: "google/imagen-4", name: "Imagen 4", owned_by: "google", type: "image" },
];

const openRouterModels = [
  {
    id: "anthropic/claude-opus-5.5",
    name: "Anthropic: Claude Opus 5.5",
    architecture: { output_modalities: ["text"] },
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Meta: Llama 3.1 8B Instruct",
    context_length: 131_072,
    architecture: { output_modalities: ["text"] },
    pricing: { prompt: "0.00000002", completion: "0.00000003" },
    supported_parameters: ["temperature", "max_tokens"],
  },
  { id: "anthropic/claude-sonnet-4.5:batch", name: "Batch", architecture: { output_modalities: ["text"] } },
  { id: "google/gemini-image", name: "Image only", architecture: { output_modalities: ["image"] } },
];

beforeEach(blankEnvironment);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("buildCatalogue", () => {
  it("offers nothing, and asks nobody, when no key is set", async () => {
    const requested = serve({});
    const { buildCatalogue } = await catalogue();
    expect(await buildCatalogue()).toEqual({ models: [], notes: [] });
    expect(requested).toEqual([]);
  });

  it("lists every chat model a gateway key unlocks beyond the roster, with what the list says about it", async () => {
    serve({ [GATEWAY]: gatewayList(...gatewayModels) });
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    const { models } = await (await catalogue()).buildCatalogue();
    expect(models).toEqual([
      {
        key: "gateway:anthropic/claude-3-haiku",
        label: "Claude 3 Haiku",
        vendor: "anthropic",
        via: "AI Gateway",
        detail: "200k context · $0.25 / $1.25 per 1M tokens",
      },
    ]);
  });

  it("leaves out embedding, image and batch models and anything the roster already covers", async () => {
    serve({ [OPENROUTER]: openRouterList(...openRouterModels) });
    vi.stubEnv("OPENROUTER_API_KEY", "or");
    const { models } = await (await catalogue()).buildCatalogue();
    expect(models.map((m) => m.key)).toEqual(["openrouter:meta-llama/llama-3.1-8b-instruct"]);
    expect(models[0]).toMatchObject({
      via: "OpenRouter",
      vendor: "meta-llama",
      detail: "131k context · $0.02 / $0.03 per 1M tokens",
    });
  });

  it("gathers the models of every route whose key is set", async () => {
    serve({ [GATEWAY]: gatewayList(...gatewayModels), [OPENROUTER]: openRouterList(...openRouterModels) });
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    vi.stubEnv("OPENROUTER_API_KEY", "or");
    const { models } = await (await catalogue()).buildCatalogue();
    expect(models.map((m) => m.key).sort()).toEqual([
      "gateway:anthropic/claude-3-haiku",
      "openrouter:meta-llama/llama-3.1-8b-instruct",
    ]);
  });

  it("filters a provider's own list: no embeddings, speech or image models", async () => {
    serve({
      "https://api.openai.com/v1/models": () =>
        Response.json({
          data: ["gpt-5", "text-embedding-3-large", "whisper-1", "dall-e-3", "gpt-image-1", "o3"].map(
            (id) => ({ id }),
          ),
        }),
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000": () =>
        Response.json({
          models: [
            {
              name: "models/gemini-2.0-flash",
              displayName: "Gemini 2.0 Flash",
              supportedGenerationMethods: ["generateContent"],
              inputTokenLimit: 1_048_576,
            },
            {
              name: "models/text-embedding-004",
              displayName: "Embedding",
              supportedGenerationMethods: ["embedContent"],
            },
          ],
        }),
      "https://api.anthropic.com/v1/models?limit=1000": () =>
        Response.json({ data: [{ id: "claude-3-haiku-20240307", display_name: "Claude Haiku 3" }] }),
    });
    vi.stubEnv("OPENAI_API_KEY", "k");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "k");
    vi.stubEnv("ANTHROPIC_API_KEY", "k");
    const { models } = await (await catalogue()).buildCatalogue();
    expect(models.map((m) => `${m.key} | ${m.label} | ${m.via}`).sort()).toEqual([
      "anthropic:claude-3-haiku-20240307 | Claude Haiku 3 | Anthropic",
      "google:gemini-2.0-flash | Gemini 2.0 Flash | Google",
      "openai:gpt-5 | gpt-5 | OpenAI",
      "openai:o3 | o3 | OpenAI",
    ]);
  });

  it("reports a rejected key and still lists the other sources", async () => {
    serve({
      "https://api.openai.com/v1/models": () => new Response("no", { status: 401 }),
      [GATEWAY]: gatewayList(...gatewayModels),
    });
    vi.stubEnv("OPENAI_API_KEY", "bad");
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    const { models, notes } = await (await catalogue()).buildCatalogue();
    expect(notes).toEqual(["OPENAI_API_KEY was rejected (HTTP 401)."]);
    expect(models.map((m) => m.key)).toEqual(["gateway:anthropic/claude-3-haiku"]);
  });

  it("reports a list it could not reach", async () => {
    serve({});
    vi.stubEnv("OPENROUTER_API_KEY", "or");
    const { models, notes } = await (await catalogue()).buildCatalogue();
    expect(models).toEqual([]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("Could not read the OpenRouter model list");
  });

  it("uses the keys of the request in scope, not only the environment", async () => {
    serve({ [GATEWAY]: gatewayList(...gatewayModels) });
    const { buildCatalogue, withKeys } = await catalogue();
    const { models } = await withKeys({ AI_GATEWAY_API_KEY: "from-browser" }, buildCatalogue);
    expect(models).toHaveLength(1);
  });
});

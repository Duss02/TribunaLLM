import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const KEY_VARIABLES = [
  "AI_GATEWAY_API_KEY",
  "OPENROUTER_API_KEY",
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "DEEPSEEK_API_KEY",
  "MOONSHOT_API_KEY",
  "MISTRAL_API_KEY",
  "XAI_API_KEY",
  "JEV_MOCK",
];

interface Completion {
  authorization: string | null;
  body: Record<string, unknown>;
}

const chunk = (delta: object, extra: object = {}) =>
  `data: ${JSON.stringify({ id: "c1", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta, finish_reason: null }], ...extra })}\n\n`;

function serveOpenRouter(options: { ids: string[]; completion: () => Response }): Completion[] {
  const completions: Completion[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    if (url === "https://openrouter.ai/api/v1/models") {
      return Response.json({ data: options.ids.map((id) => ({ id })) });
    }
    if (url === "https://openrouter.ai/api/v1/chat/completions") {
      completions.push({
        authorization: new Headers(init?.headers).get("authorization"),
        body: JSON.parse(String(init?.body)),
      });
      return options.completion();
    }
    throw new TypeError(`unexpected request to ${url}`);
  });
  return completions;
}

const stream = (...parts: string[]) =>
  new Response(parts.join(""), { status: 200, headers: { "content-type": "text/event-stream" } });

const goodStream = () =>
  stream(
    chunk({ role: "assistant", content: "Fares rose " }),
    chunk({ content: "8 percent." }),
    chunk(
      {},
      {
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
        usage: {
          prompt_tokens: 120,
          completion_tokens: 30,
          completion_tokens_details: { reasoning_tokens: 12 },
        },
      },
    ),
    "data: [DONE]\n\n",
  );

// The module caches model lists, so each test loads a fresh copy.
async function load() {
  vi.resetModules();
  return import("@/lib/models/debater");
}

async function read(turn: { text: AsyncIterable<string> }) {
  let text = "";
  for await (const piece of turn.text) text += piece;
  return text;
}

beforeEach(() => {
  for (const variable of KEY_VARIABLES) vi.stubEnv(variable, "");
  vi.stubEnv("OPENROUTER_API_KEY", "or-secret");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("a debater on the OpenRouter route", () => {
  it("streams the text and reports input, output and reasoning tokens", async () => {
    serveOpenRouter({ ids: ["openai/gpt-6.1-sol"], completion: goodStream });
    const { resolveDebater, streamDebaterTurn } = await load();
    const debater = await resolveDebater("gpt-6.1-sol", { paced: false });
    expect(debater.route).toBe("openrouter");

    const turn = streamDebaterTurn(debater, { system: "Argue PRO.", user: "Round 1." });
    expect(await read(turn)).toBe("Fares rose 8 percent.");
    expect(await turn.usage()).toEqual({ inputTokens: 120, outputTokens: 30, reasoningTokens: 12 });
  });

  it("sends the same settings to every model: key, temperature 0.7, low reasoning, a token cap", async () => {
    const completions = serveOpenRouter({ ids: ["openai/gpt-6.1-sol"], completion: goodStream });
    const { resolveDebater, streamDebaterTurn } = await load();
    const debater = await resolveDebater("gpt-6.1-sol", { paced: false });
    await read(streamDebaterTurn(debater, { system: "Argue PRO.", user: "Round 1." }));

    const [call] = completions;
    expect(call?.authorization).toBe("Bearer or-secret");
    expect(call?.body).toMatchObject({
      model: "openai/gpt-6.1-sol",
      temperature: 0.7,
      max_tokens: 4000,
      stream: true,
    });
    expect(JSON.stringify(call?.body)).toMatch(/"low"/);
    expect(JSON.stringify(call?.body)).toContain("Argue PRO.");
  });

  it("leaves temperature out for a model that rejects it", async () => {
    const completions = serveOpenRouter({ ids: ["anthropic/claude-opus-5.5"], completion: goodStream });
    const { resolveDebater, streamDebaterTurn } = await load();
    const debater = await resolveDebater("claude-opus-5.5", { paced: false });
    await read(streamDebaterTurn(debater, { system: "s", user: "u" }));
    expect(completions[0]?.body).not.toHaveProperty("temperature");
  });

  it("throws the provider's error instead of returning an empty turn", async () => {
    serveOpenRouter({
      ids: ["openai/gpt-6.1-sol"],
      completion: () => Response.json({ error: { message: "model overloaded" } }, { status: 400 }),
    });
    const { resolveDebater, streamDebaterTurn } = await load();
    const debater = await resolveDebater("gpt-6.1-sol", { paced: false });
    await expect(read(streamDebaterTurn(debater, { system: "s", user: "u" }))).rejects.toThrow(/overloaded/);
  });

  it("refuses an unavailable model and names the variable to set", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "");
    serveOpenRouter({ ids: [], completion: goodStream });
    const { resolveDebater } = await load();
    await expect(resolveDebater("gpt-6.1-sol", { paced: false })).rejects.toThrow(
      /AI_GATEWAY_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY/,
    );
  });
});

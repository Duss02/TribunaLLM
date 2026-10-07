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

const listOf = (...ids: string[]) =>
  new Response(JSON.stringify({ data: ids.map((id) => ({ id })) }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

function serve(routes: Record<string, () => Response>) {
  const requested: string[] = [];
  vi.stubGlobal("fetch", async (url: string) => {
    requested.push(url);
    const handler = Object.entries(routes).find(([prefix]) => url.startsWith(prefix))?.[1];
    if (!handler) throw new TypeError("unexpected request");
    return handler();
  });
  return requested;
}

// The module caches model lists, so each test loads a fresh copy.
async function statusOf(key: string) {
  const { modelStatus } = await import("@/lib/models/availability");
  const { findEntry } = await import("@/lib/models/registry");
  return modelStatus(findEntry(key)!);
}

beforeEach(() => {
  vi.resetModules();
  for (const variable of KEY_VARIABLES) vi.stubEnv(variable, "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("modelStatus", () => {
  it("names every variable that would unlock a model when no key is set", async () => {
    const requested = serve({});
    const status = await statusOf("claude-opus-5.5");
    expect(status.status).toBe("missing-key");
    expect(status.detail).toBe("set AI_GATEWAY_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY");
    expect(requested).toEqual([]);
  });

  it("is available on the gateway when the id is in its list", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    serve({ "https://ai-gateway.vercel.sh/v1/models": () => listOf("anthropic/claude-opus-5.5") });
    const status = await statusOf("claude-opus-5.5");
    expect(status).toMatchObject({ status: "available", route: "gateway" });
  });

  it("is unknown-id when a configured route does not list the id", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    serve({ "https://ai-gateway.vercel.sh/v1/models": () => listOf("anthropic/something-else") });
    const status = await statusOf("claude-opus-5.5");
    expect(status.status).toBe("unknown-id");
    expect(status.detail).toContain("anthropic/claude-opus-5.5");
  });

  it("falls through to OpenRouter when the gateway lacks the id", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    vi.stubEnv("OPENROUTER_API_KEY", "or");
    serve({
      "https://ai-gateway.vercel.sh/v1/models": () => listOf("other/model"),
      "https://openrouter.ai/api/v1/models": () => listOf("anthropic/claude-opus-5.5"),
    });
    const status = await statusOf("claude-opus-5.5");
    expect(status).toMatchObject({ status: "available", route: "openrouter" });
  });

  it("checks a direct provider against its own list", async () => {
    vi.stubEnv("ANTHROPIC_API_KEY", "sk");
    const requested = serve({ "https://api.anthropic.com/v1/models": () => listOf("claude-opus-5-5") });
    const status = await statusOf("claude-opus-5.5");
    expect(status).toMatchObject({ status: "available", route: "direct" });
    expect(requested[0]).toContain("limit=1000");
  });

  it("treats a rejected key as a missing key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "bad");
    serve({ "https://api.openai.com/v1/models": () => new Response("no", { status: 401 }) });
    const status = await statusOf("gpt-6.1-sol");
    expect(status.status).toBe("missing-key");
    expect(status.detail).toContain("OPENAI_API_KEY was rejected (HTTP 401)");
  });

  it("stays available, and says so, when the list cannot be reached", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    serve({});
    const status = await statusOf("claude-opus-5.5");
    expect(status.status).toBe("available");
    expect(status.detail).toContain("not verified");
  });

  it("falls back to a scripted debater only under JEV_MOCK=1", async () => {
    serve({});
    expect((await statusOf("kimi-k3")).status).toBe("missing-key");
    vi.stubEnv("JEV_MOCK", "1");
    vi.resetModules();
    expect(await statusOf("kimi-k3")).toMatchObject({ status: "available", route: "scripted" });
  });

  it("does not let one visitor's accepted key vouch for another's rejected one", async () => {
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) =>
      new Headers(init.headers).get("x-api-key") === "good"
        ? listOf("claude-opus-5-5")
        : new Response("no", { status: 401 }),
    );
    const { modelStatus } = await import("@/lib/models/availability");
    const { findEntry } = await import("@/lib/models/registry");
    const { withKeys } = await import("@/lib/credentials");
    const entry = findEntry("claude-opus-5.5")!;

    const accepted = await withKeys({ ANTHROPIC_API_KEY: "good" }, () => modelStatus(entry));
    const rejected = await withKeys({ ANTHROPIC_API_KEY: "bad" }, () => modelStatus(entry));
    expect(accepted.status).toBe("available");
    expect(rejected.status).toBe("missing-key");
    expect(rejected.detail).toContain("ANTHROPIC_API_KEY was rejected");
  });
});

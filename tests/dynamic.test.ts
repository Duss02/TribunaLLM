import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEventParser } from "@/lib/debate/sse";
import {
  GATEWAY,
  OPENROUTER,
  OPENROUTER_COMPLETIONS,
  blankEnvironment,
  gatewayList,
  openRouterList,
  serve,
} from "./fakes";

async function models() {
  vi.resetModules();
  return import("@/lib/models/dynamic");
}

beforeEach(blankEnvironment);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("parseModelKey", () => {
  it("splits at the first colon, so ids with their own colon survive", async () => {
    const { parseModelKey } = await models();
    expect(parseModelKey("gateway:anthropic/claude-3-haiku")).toEqual({
      channel: "gateway",
      id: "anthropic/claude-3-haiku",
    });
    expect(parseModelKey("openrouter:meta-llama/llama-3.3-70b-instruct:free")).toEqual({
      channel: "openrouter",
      id: "meta-llama/llama-3.3-70b-instruct:free",
    });
    expect(parseModelKey("openai:gpt-5")).toEqual({ channel: "openai", id: "gpt-5" });
  });

  it("refuses a registry key, an unknown channel and an empty id", async () => {
    const { parseModelKey } = await models();
    expect(parseModelKey("claude-opus-5.5")).toBeNull();
    expect(parseModelKey("nonsense:thing")).toBeNull();
    expect(parseModelKey("gateway:")).toBeNull();
    expect(parseModelKey(":x")).toBeNull();
  });
});

describe("resolveEntry", () => {
  const haiku = (temperature?: boolean) => ({
    id: "anthropic/claude-3-haiku",
    name: "Claude 3 Haiku",
    type: "language",
    ...(temperature === undefined ? {} : { temperature }),
  });

  it("returns the roster's own entry for a roster key", async () => {
    const { resolveEntry } = await models();
    const { findEntry } = await import("@/lib/models/registry");
    expect(await resolveEntry("kimi-k3")).toBe(findEntry("kimi-k3"));
  });

  it("knows nothing of a key that is neither", async () => {
    const { resolveEntry } = await models();
    expect(await resolveEntry("no-such-model")).toBeUndefined();
  });

  it("takes the name from the list, and the temperature only when the list says the model accepts it", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    serve({ [GATEWAY]: gatewayList(haiku(true)) });
    const { resolveEntry } = await models();
    const entry = await resolveEntry("gateway:anthropic/claude-3-haiku");
    expect(entry).toMatchObject({
      key: "gateway:anthropic/claude-3-haiku",
      label: "Claude 3 Haiku",
      routes: { gateway: "anthropic/claude-3-haiku" },
    });
    expect(entry?.fixedTemperature).toBeUndefined();
  });

  it("leaves the temperature out when the list says the model rejects it, or says nothing", async () => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    for (const temperature of [false, undefined]) {
      serve({ [GATEWAY]: gatewayList(haiku(temperature)) });
      const { resolveEntry } = await models();
      expect((await resolveEntry("gateway:anthropic/claude-3-haiku"))?.fixedTemperature).toBe(true);
    }
  });

  it("falls back to the id as the name when there is no key, or the list lacks the model", async () => {
    serve({ [GATEWAY]: gatewayList(haiku(true)) });
    const { resolveEntry } = await models();
    expect(await resolveEntry("gateway:anthropic/claude-3-haiku")).toMatchObject({
      label: "anthropic/claude-3-haiku",
      fixedTemperature: true,
    });

    vi.stubEnv("AI_GATEWAY_API_KEY", "gw");
    expect(await resolveEntry("gateway:vendor/not-listed")).toMatchObject({ label: "vendor/not-listed" });
  });
});

describe("a model picked from the catalogue", () => {
  const llama = (parameters: string[]) => ({
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Meta: Llama 3.1 8B Instruct",
    architecture: { output_modalities: ["text"] },
    supported_parameters: parameters,
  });

  async function bodyFor(parameters: string[]) {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    let body: Record<string, unknown> = {};
    serve({
      [OPENROUTER]: openRouterList(llama(parameters)),
      [OPENROUTER_COMPLETIONS]: (_url, init) => {
        body = JSON.parse(String(init?.body));
        const chunk = `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: { content: "Hello." }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1 } })}\n\ndata: [DONE]\n\n`;
        return new Response(chunk, { status: 200, headers: { "content-type": "text/event-stream" } });
      },
    });
    vi.resetModules();
    const { resolveDebater, streamDebaterTurn } = await import("@/lib/models/debater");
    const debater = await resolveDebater("openrouter:meta-llama/llama-3.1-8b-instruct", { paced: false });
    for await (const _ of streamDebaterTurn(debater, { system: "s", user: "u" }).text) void _;
    return { body, debater };
  }

  it("is called by its own id on its own route, with the temperature when it accepts one", async () => {
    const { body, debater } = await bodyFor(["temperature", "max_tokens"]);
    expect(debater.route).toBe("openrouter");
    expect(debater.entry.label).toBe("Meta: Llama 3.1 8B Instruct");
    expect(body).toMatchObject({ model: "meta-llama/llama-3.1-8b-instruct", temperature: 0.7 });
  });

  it("is called without a temperature when the list does not offer one", async () => {
    const { body } = await bodyFor(["max_tokens"]);
    expect(body.model).toBe("meta-llama/llama-3.1-8b-instruct");
    expect(body).not.toHaveProperty("temperature");
  });

  it("is refused, by name, when it is not in the list", async () => {
    vi.stubEnv("OPENROUTER_API_KEY", "or-key");
    serve({ [OPENROUTER]: openRouterList(llama(["temperature"])) });
    vi.resetModules();
    const { resolveDebater } = await import("@/lib/models/debater");
    await expect(resolveDebater("openrouter:vendor/missing", { paced: false })).rejects.toThrow(
      /vendor\/missing is not in the openrouter model list/,
    );
  });

  it("runs a whole debate through the route, with keys that exist only in the request", async () => {
    const seenJev: (string | null)[] = [];
    const delta = (content: string) =>
      `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: { content }, finish_reason: null }] })}\n\n`;
    const finish = `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 50, completion_tokens: 20 } })}\n\n`;
    serve({
      [OPENROUTER]: openRouterList(llama(["temperature"])),
      [OPENROUTER_COMPLETIONS]: () =>
        new Response(
          `${delta("Fares rose 8 percent in 2024 [P01]. ")}${delta("That matters.")}${finish}data: [DONE]\n\n`,
          {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          },
        ),
      "https://api.typesafe.ai/v1/systemone": async (_url, init) => {
        seenJev.push(new Headers(init?.headers).get("authorization"));
        const { questions } = JSON.parse(String(init?.body)) as { questions: Record<string, unknown> };
        const noul = { type: "noul", noul: 0.9 };
        const answers: Record<string, unknown> = {};
        if ("is_claim" in questions) {
          Object.assign(answers, {
            is_claim: noul,
            supported: noul,
            on_motion: noul,
            relation: {
              type: "choice",
              choice: "supports",
              confidence: 1,
              probabilities: { supports: 0.9, contradicts: 0.05, says_nothing: 0.05 },
            },
            which: { type: "choice", choice: "none", confidence: 1, probabilities: { none: 1 } },
          });
        }
        if ("met" in questions) answers.met = { type: "noul", noul: 0.05 };
        if ("evidence_use" in questions) {
          Object.assign(answers, {
            on_motion: noul,
            evidence_use: { type: "score", score: 1.8, confidence: 1, legend: {}, probabilities: {} },
          });
          if ("rebuts" in questions) answers.rebuts = noul;
        }
        if ("verdict" in questions) {
          answers.verdict = {
            type: "choice",
            choice: "PRO",
            confidence: 1,
            probabilities: { PRO: 0.6, CON: 0.3, tie: 0.1 },
          };
        }
        return Response.json({
          model: "jev-1.13.0",
          answers,
          usage: { input_tokens: 400, output_tokens: 0 },
        });
      },
    });
    vi.resetModules();
    const { POST } = await import("@/app/api/debate/route");
    const response = await POST(
      new Request("http://localhost/api/debate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pack: "four-day-week",
          pro: "openrouter:meta-llama/llama-3.1-8b-instruct",
          con: "openrouter:meta-llama/llama-3.1-8b-instruct",
          rounds: 1,
          maxWords: 60,
          strictMode: false,
          keys: { TYPESAFE_API_KEY: "jev-body", OPENROUTER_API_KEY: "or-body" },
        }),
      }),
    );
    const events = createEventParser()(await response.text());
    expect(events.at(-1), JSON.stringify(events.at(-1))).toMatchObject({ type: "final" });
    expect(events.find((e) => e.type === "turn_start")).toMatchObject({
      model: "Meta: Llama 3.1 8B Instruct",
    });
    expect(new Set(seenJev)).toEqual(new Set(["Bearer jev-body"]));
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createEventParser } from "@/lib/debate/sse";
import type { DebateEvent } from "@/lib/debate/events";
import { KEY_FIELDS } from "@/lib/keys";

const post = (body: unknown) =>
  new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

// The model lists are cached per module, so each test loads fresh routes.
async function routes() {
  vi.resetModules();
  const [setup, debate] = await Promise.all([
    import("@/app/api/setup/route"),
    import("@/app/api/debate/route"),
  ]);
  return { setup: setup.POST, debate: debate.POST };
}

const noul = (value: number) => ({ type: "noul", noul: value });
const choice = (label: string, probabilities: Record<string, number>) => ({
  type: "choice",
  choice: label,
  confidence: 1,
  probabilities,
});

function jevAnswer(questions: Record<string, unknown>) {
  const answers: Record<string, unknown> = {};
  if ("is_claim" in questions) {
    Object.assign(answers, {
      is_claim: noul(0.9),
      supported: noul(0.9),
      relation: choice("supports", { supports: 0.9, contradicts: 0.05, says_nothing: 0.05 }),
      which: choice("none", { none: 1 }),
      on_motion: noul(0.9),
    });
  }
  if ("evidence_use" in questions) {
    Object.assign(answers, {
      on_motion: noul(0.9),
      evidence_use: { type: "score", score: 1.8, confidence: 1, legend: {}, probabilities: {} },
    });
    if ("rebuts" in questions) answers.rebuts = noul(0.8);
  }
  if ("verdict" in questions) answers.verdict = choice("PRO", { PRO: 0.6, CON: 0.3, tie: 0.1 });
  return { model: "jev-1.13.0", answers, usage: { input_tokens: 500, output_tokens: 0 } };
}

const delta = (content: string) =>
  `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: { content }, finish_reason: null }] })}\n\n`;

const completion = () =>
  new Response(
    [
      delta("Fares rose 8 percent in 2024 [P01]. "),
      delta("That is why the ferry matters."),
      `data: ${JSON.stringify({ id: "c", object: "chat.completion.chunk", created: 1, model: "m", choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 50, completion_tokens: 20 } })}\n\n`,
      "data: [DONE]\n\n",
    ].join(""),
    { status: 200, headers: { "content-type": "text/event-stream" } },
  );

interface Seen {
  jev: { authorization: string | null; motion: string }[];
  openrouter: (string | null)[];
}

function serveEverything(): Seen {
  const seen: Seen = { jev: [], openrouter: [] };
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    const authorization = new Headers(init?.headers).get("authorization");
    if (url === "https://openrouter.ai/api/v1/models") {
      return Response.json({ data: [{ id: "anthropic/claude-opus-5.5" }, { id: "openai/gpt-6.1-sol" }] });
    }
    if (url === "https://openrouter.ai/api/v1/chat/completions") {
      seen.openrouter.push(authorization);
      return completion();
    }
    if (url === "https://api.typesafe.ai/v1/systemone") {
      const body = JSON.parse(String(init?.body)) as {
        state: { motion: string };
        questions: Record<string, unknown>;
      };
      seen.jev.push({ authorization, motion: body.state.motion });
      await new Promise((resolve) => setTimeout(resolve, 2));
      return Response.json(jevAnswer(body.questions));
    }
    throw new TypeError(`unexpected request to ${url}`);
  });
  return seen;
}

async function events(response: Response): Promise<DebateEvent[]> {
  const parse = createEventParser();
  return parse(await response.text());
}

beforeEach(() => {
  for (const field of KEY_FIELDS) vi.stubEnv(field.variable, "");
  vi.stubEnv("JEV_MOCK", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("POST /api/setup", () => {
  it("tells what the keys in the body make possible, without echoing them", async () => {
    serveEverything();
    const { setup } = await routes();
    const response = await setup(post({ keys: { OPENROUTER_API_KEY: "or-secret-4242" } }));
    const text = await response.text();
    const status = JSON.parse(text) as {
      problems: string[];
      models: { key: string; status: string; route: string | null }[];
    };

    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(text).not.toContain("or-secret-4242");
    expect(status.models.find((m) => m.key === "claude-opus-5.5")).toMatchObject({
      status: "available",
      route: "openrouter",
    });
    expect(status.problems.join(" ")).toContain("TYPESAFE_API_KEY");
  });

  it("reports no problems once the judge and two models are covered", async () => {
    serveEverything();
    const { setup } = await routes();
    const response = await setup(post({ keys: { OPENROUTER_API_KEY: "or", TYPESAFE_API_KEY: "jev" } }));
    expect(((await response.json()) as { problems: string[] }).problems).toEqual([]);
  });

  it("refuses a variable that is not a key and an empty body", async () => {
    const { setup } = await routes();
    expect((await setup(post({ keys: { PATH: "/usr/bin" } }))).status).toBe(400);
    expect((await setup(new Request("http://localhost/api", { method: "POST", body: "nope" }))).status).toBe(
      400,
    );
  });
});

describe("POST /api/debate with keys from the browser", () => {
  const config = {
    pack: "four-day-week",
    pro: "claude-opus-5.5",
    con: "gpt-6.1-sol",
    rounds: 1,
    maxWords: 60,
    strictMode: false,
  };

  it("asks for the judge key by name when neither the body nor the server has it", async () => {
    const { debate } = await routes();
    const response = await debate(post(config));
    expect(response.status).toBe(412);
    expect(((await response.json()) as { error: string }).error).toContain("TYPESAFE_API_KEY");
  });

  it("gets past the judge check with the key in the body, and then names the debater keys it lacks", async () => {
    serveEverything();
    const { debate } = await routes();
    const response = await debate(post({ ...config, keys: { TYPESAFE_API_KEY: "jev-body-key" } }));
    expect(response.status).toBe(400);
    const { error } = (await response.json()) as { error: string };
    expect(error).toContain("OPENROUTER_API_KEY");
    expect(error).not.toContain("jev-body-key");
  });

  it("runs a whole debate on keys that exist only in the request", async () => {
    const seen = serveEverything();
    const { debate } = await routes();
    const response = await debate(
      post({ ...config, keys: { TYPESAFE_API_KEY: "jev-body-key", OPENROUTER_API_KEY: "or-body-key" } }),
    );
    const all = await events(response);

    expect(all.at(-1)?.type).toBe("final");
    expect(seen.jev.length).toBeGreaterThan(3);
    expect(new Set(seen.jev.map((call) => call.authorization))).toEqual(new Set(["Bearer jev-body-key"]));
    expect(new Set(seen.openrouter)).toEqual(new Set(["Bearer or-body-key"]));
    expect(JSON.stringify(all)).not.toMatch(/jev-body-key|or-body-key/);
  });

  it("keeps two debates with different keys apart while they run at the same time", async () => {
    const seen = serveEverything();
    const { debate } = await routes();
    const one = debate(
      post({
        ...config,
        pack: "four-day-week",
        keys: { TYPESAFE_API_KEY: "jev-ONE", OPENROUTER_API_KEY: "or-ONE" },
      }),
    );
    const two = debate(
      post({
        ...config,
        pack: "remote-work",
        keys: { TYPESAFE_API_KEY: "jev-TWO", OPENROUTER_API_KEY: "or-TWO" },
      }),
    );
    const [first, second] = await Promise.all([one.then(events), two.then(events)]);

    expect(first.at(-1)?.type).toBe("final");
    expect(second.at(-1)?.type).toBe("final");
    const four = seen.jev.filter((call) => call.motion.includes("four-day"));
    const remote = seen.jev.filter((call) => call.motion.includes("office full time"));
    expect(four.length).toBeGreaterThan(0);
    expect(remote.length).toBeGreaterThan(0);
    expect(new Set(four.map((call) => call.authorization))).toEqual(new Set(["Bearer jev-ONE"]));
    expect(new Set(remote.map((call) => call.authorization))).toEqual(new Set(["Bearer jev-TWO"]));
    expect(new Set(seen.openrouter)).toEqual(new Set(["Bearer or-ONE", "Bearer or-TWO"]));
  });

  it("falls back to the server's environment for a key the browser did not send", async () => {
    const seen = serveEverything();
    vi.stubEnv("TYPESAFE_API_KEY", "jev-env-key");
    const { debate } = await routes();
    const all = await events(await debate(post({ ...config, keys: { OPENROUTER_API_KEY: "or-body-key" } })));
    expect(all.at(-1)?.type).toBe("final");
    expect(new Set(seen.jev.map((call) => call.authorization))).toEqual(new Set(["Bearer jev-env-key"]));
  });
});

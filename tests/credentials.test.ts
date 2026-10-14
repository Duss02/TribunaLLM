import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getKey, withKeys } from "@/lib/credentials";
import { judgeSentence } from "@/lib/jev/judge";
import type { Evidence } from "@/lib/jev/types";
import { KEY_FIELDS, maskKey } from "@/lib/keys";

const evidence: Evidence = { text: "P01| Fares rose 8 percent in 2024.", ids: ["P01"] };

const noul = (value: number) => ({ type: "noul", noul: value });
const choice = (label: string, probabilities: Record<string, number>) => ({
  type: "choice",
  choice: label,
  confidence: 1,
  probabilities,
});

beforeEach(() => {
  for (const field of KEY_FIELDS) vi.stubEnv(field.variable, "");
  vi.stubEnv("JEV_MOCK", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("getKey", () => {
  it("reads the environment when no keys were sent", () => {
    vi.stubEnv("OPENAI_API_KEY", "  from-env  ");
    expect(getKey("OPENAI_API_KEY")).toBe("from-env");
    expect(getKey("XAI_API_KEY")).toBeUndefined();
  });

  it("prefers a key sent with the request, per variable", () => {
    vi.stubEnv("OPENAI_API_KEY", "from-env");
    vi.stubEnv("XAI_API_KEY", "xai-from-env");
    withKeys({ OPENAI_API_KEY: "from-browser" }, () => {
      expect(getKey("OPENAI_API_KEY")).toBe("from-browser");
      expect(getKey("XAI_API_KEY")).toBe("xai-from-env");
    });
  });

  it("forgets the keys when the work is done", async () => {
    await withKeys({ OPENAI_API_KEY: "from-browser" }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      expect(getKey("OPENAI_API_KEY")).toBe("from-browser");
    });
    expect(getKey("OPENAI_API_KEY")).toBeUndefined();
  });
});

describe("keys across concurrent requests", () => {
  it("never lends one request's key to another, even when calls queue behind the limiter", async () => {
    const seen: { sentence: string; authorization: string | null }[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const { state } = JSON.parse(String(init.body)) as {
        state: { sentence?: string; submission?: string };
      };
      // the framed request (rules v2) carries the sentence as `submission`
      seen.push({
        sentence: state.sentence ?? state.submission ?? "",
        authorization: new Headers(init.headers).get("authorization"),
      });
      await new Promise((resolve) => setTimeout(resolve, 3));
      return Response.json({
        model: "jev-1.13.0",
        answers: {
          is_claim: noul(0.9),
          supported: noul(0.9),
          relation: choice("supports", { supports: 0.9, contradicts: 0.05, says_nothing: 0.05 }),
          met: noul(0.05),
          which: choice("P01", { P01: 0.9, none: 0.1 }),
          on_motion: noul(0.9),
        },
        usage: { input_tokens: 100, output_tokens: 0 },
      });
    });

    const callsFor = (who: "alice" | "bob") =>
      withKeys({ TYPESAFE_API_KEY: `key-${who}` }, () =>
        Promise.all(
          Array.from({ length: 20 }, (_, i) =>
            judgeSentence({ motion: "m", side: "PRO", sentence: `${who}-${i}`, evidence }),
          ),
        ),
      );
    await Promise.all([callsFor("alice"), callsFor("bob")]);

    // two Jev requests per sentence since rules v2 (relation set + framed criterion)
    expect(seen).toHaveLength(80);
    for (const call of seen) expect(call.authorization).toBe(`Bearer key-${call.sentence.split("-")[0]}`);
  });
});

describe("KEY_FIELDS", () => {
  it("lists the judge and every variable a registry route can read", async () => {
    const { JUDGE_KEY_VARIABLE, debaterKeyVariables } = await import("@/lib/models/key-variables");
    expect(new Set(KEY_FIELDS.map((field) => field.variable))).toEqual(
      new Set([JUDGE_KEY_VARIABLE, ...debaterKeyVariables()]),
    );
  });
});

describe("maskKey", () => {
  it("shows only the last four characters of a long key, and nothing of a short one", () => {
    expect(maskKey("sk-live-abcdef123456")).toBe("••••3456");
    expect(maskKey("short")).toBe("••••");
  });
});

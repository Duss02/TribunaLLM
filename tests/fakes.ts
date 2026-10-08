import { vi } from "vitest";
import { KEY_FIELDS } from "@/lib/keys";

/** Leaves no key and no mock mode in the environment, so a test sets only what it means to. */
export function blankEnvironment() {
  for (const field of KEY_FIELDS) vi.stubEnv(field.variable, "");
  vi.stubEnv("JEV_MOCK", "");
}

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

/**
 * Stands in for the network. A handler is found by exact URL; a request nobody
 * handles throws, so a test cannot reach a real service by accident.
 */
export function serve(handlers: Record<string, Handler>): { url: string; init?: RequestInit }[] {
  const requested: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
    requested.push({ url, init });
    const handler = handlers[url];
    if (!handler) throw new TypeError(`unexpected request to ${url}`);
    return handler(url, init);
  });
  return requested;
}

export const GATEWAY = "https://ai-gateway.vercel.sh/v1/models";
export const OPENROUTER = "https://openrouter.ai/api/v1/models";
export const OPENROUTER_COMPLETIONS = "https://openrouter.ai/api/v1/chat/completions";

export const gatewayList =
  (...data: object[]) =>
  () =>
    Response.json({ data });
export const openRouterList = gatewayList;

import type { SetupStatus } from "@/lib/setup-status";
import { REGISTRY, type Vendor } from "./registry";

// First match wins, so a name that contains another's ("spacexai") is tested before it.
const HINTS: [Vendor, RegExp][] = [
  ["xai", /x-?ai|grok/],
  ["anthropic", /anthropic|claude/],
  ["openai", /openai|gpt|\bo[1-9]\b/],
  ["google", /google|gemini|gemma/],
  ["deepseek", /deepseek/],
  ["moonshot", /moonshot|kimi/],
  ["alibaba", /alibaba|qwen/],
  ["mistral", /mistral|ministral|codestral/],
  ["meta", /meta|llama/],
];

/**
 * The maker behind a model key. Roster models carry it; a model found by search is
 * recognised from its listed vendor and its id, and anything else is `unknown`.
 */
export function vendorOfModel(key: string, setup: Pick<SetupStatus, "catalogue">): Vendor | "unknown" {
  const rostered = REGISTRY.find((entry) => entry.key === key);
  if (rostered) return rostered.vendor;
  const listed = setup.catalogue.find((model) => model.key === key);
  const text = `${listed?.vendor ?? ""} ${key}`.toLowerCase();
  return HINTS.find(([, pattern]) => pattern.test(text))?.[0] ?? "unknown";
}

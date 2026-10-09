import type { TurnUsage } from "@/lib/models/debater";

/**
 * List prices in US dollars per million tokens, read from OpenRouter's public model list on the date
 * below. The direct providers and the AI Gateway charge the same list price for these models;
 * OpenRouter adds its fee when credits are bought, not per token. Reasoning tokens are billed as output.
 */
export const PRICES_AS_OF = "2026-10-09";

export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5.5": { input: 4, output: 20 },
  "claude-sonnet-5.5": { input: 2, output: 10 },
  "gpt-6.1-sol": { input: 2, output: 10 },
  "gpt-6-luna": { input: 0.1, output: 0.5 },
  "gemini-3.8-flash": { input: 0.75, output: 3.75 },
  "gemini-3.5-flash-lite": { input: 0.3, output: 2.5 },
  "deepseek-v4-pro": { input: 0.211, output: 0.422 },
  "deepseek-v4-flash": { input: 0.03, output: 1.28 },
  "kimi-k3": { input: 0.9, output: 14 },
  "qwen3.8-max": { input: 2, output: 6 },
  "qwen3.8-27b": { input: 0.425, output: 2.55 },
  "mistral-large-4": { input: 0.68, output: 2.09 },
  "ministral-14b": { input: 0.2, output: 0.2 },
  "grok-4.7": { input: 2, output: 6 },
  "muse-spark-1.3": { input: 1.25, output: 4.25 },
  "llama-4-maverick": { input: 0.188, output: 0.652 },
};

/** What the tokens of one model cost at list price, or null for a model the table does not know. */
export function debaterCostUsd(key: string, tokens: Pick<TurnUsage, "inputTokens" | "outputTokens">): number | null {
  const price = PRICES[key];
  if (!price) return null;
  return (tokens.inputTokens * price.input + tokens.outputTokens * price.output) / 1_000_000;
}

export const VENDORS = [
  "anthropic",
  "openai",
  "google",
  "deepseek",
  "moonshot",
  "alibaba",
  "mistral",
  "xai",
  "meta",
] as const;

export type Vendor = (typeof VENDORS)[number];

export type DirectProvider = "anthropic" | "openai" | "google" | "deepseek" | "moonshot" | "mistral" | "xai";

export interface RegistryEntry {
  key: string;
  label: string;
  vendor: Vendor;
  family: string;
  openWeights: boolean;
  /** The model rejects a temperature parameter, so it samples at its own default. */
  fixedTemperature?: true;
  routes: {
    gateway?: string;
    openrouter?: string;
    direct?: { provider: DirectProvider; id: string };
  };
}

// Ids were checked against the gateway and OpenRouter model lists on 2026-10-07.
// openWeights is true where OpenRouter lists a Hugging Face repository for the model.
export const REGISTRY: readonly RegistryEntry[] = [
  {
    key: "claude-opus-5.5",
    label: "Claude Opus 5.5",
    vendor: "anthropic",
    family: "claude",
    openWeights: false,
    fixedTemperature: true,
    routes: {
      gateway: "anthropic/claude-opus-5.5",
      openrouter: "anthropic/claude-opus-5.5",
      direct: { provider: "anthropic", id: "claude-opus-5-5" },
    },
  },
  {
    key: "claude-sonnet-5.5",
    label: "Claude Sonnet 5.5",
    vendor: "anthropic",
    family: "claude",
    openWeights: false,
    fixedTemperature: true,
    routes: {
      gateway: "anthropic/claude-sonnet-5.5",
      openrouter: "anthropic/claude-sonnet-5.5",
      direct: { provider: "anthropic", id: "claude-sonnet-5-5" },
    },
  },
  {
    key: "gpt-6.1-sol",
    label: "GPT-6.1 Sol",
    vendor: "openai",
    family: "gpt",
    openWeights: false,
    routes: {
      gateway: "openai/gpt-6.1-sol",
      openrouter: "openai/gpt-6.1-sol",
      direct: { provider: "openai", id: "gpt-6.1-sol" },
    },
  },
  {
    key: "gpt-6-luna",
    label: "GPT-6 Luna",
    vendor: "openai",
    family: "gpt",
    openWeights: false,
    routes: {
      gateway: "openai/gpt-6-luna",
      openrouter: "openai/gpt-6-luna",
      direct: { provider: "openai", id: "gpt-6-luna" },
    },
  },
  {
    key: "gemini-3.8-flash",
    label: "Gemini 3.8 Flash",
    vendor: "google",
    family: "gemini",
    openWeights: false,
    routes: {
      gateway: "google/gemini-3.8-flash",
      openrouter: "google/gemini-3.8-flash",
      direct: { provider: "google", id: "gemini-3.8-flash" },
    },
  },
  {
    key: "gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    vendor: "google",
    family: "gemini",
    openWeights: false,
    routes: {
      gateway: "google/gemini-3.5-flash-lite",
      openrouter: "google/gemini-3.5-flash-lite",
      direct: { provider: "google", id: "gemini-3.5-flash-lite" },
    },
  },
  {
    key: "deepseek-v4-pro",
    label: "DeepSeek V4 Pro",
    vendor: "deepseek",
    family: "deepseek",
    openWeights: true,
    routes: {
      gateway: "deepseek/deepseek-v4-pro",
      openrouter: "deepseek/deepseek-v4-pro",
      direct: { provider: "deepseek", id: "deepseek-v4-pro" },
    },
  },
  {
    key: "deepseek-v4-flash",
    label: "DeepSeek V4 Flash",
    vendor: "deepseek",
    family: "deepseek",
    openWeights: true,
    routes: {
      gateway: "deepseek/deepseek-v4-flash",
      openrouter: "deepseek/deepseek-v4-flash",
      direct: { provider: "deepseek", id: "deepseek-v4-flash" },
    },
  },
  {
    key: "kimi-k3",
    label: "Kimi K3",
    vendor: "moonshot",
    family: "kimi",
    openWeights: true,
    fixedTemperature: true,
    routes: {
      gateway: "moonshotai/kimi-k3",
      openrouter: "moonshotai/kimi-k3",
      direct: { provider: "moonshot", id: "kimi-k3" },
    },
  },
  {
    key: "qwen3.8-max",
    label: "Qwen 3.8 Max",
    vendor: "alibaba",
    family: "qwen",
    openWeights: false,
    routes: { gateway: "alibaba/qwen3.8-max", openrouter: "qwen/qwen3.8-max-0902" },
  },
  {
    key: "qwen3.8-27b",
    label: "Qwen 3.8 27B",
    vendor: "alibaba",
    family: "qwen",
    openWeights: true,
    routes: { gateway: "alibaba/qwen3.8-27b", openrouter: "qwen/qwen3.8-27b" },
  },
  {
    key: "mistral-large-4",
    label: "Mistral Large 4",
    vendor: "mistral",
    family: "mistral",
    openWeights: false,
    routes: { gateway: "mistral/mistral-large-4", openrouter: "mistralai/mistral-large-4-0" },
  },
  {
    key: "ministral-14b",
    label: "Ministral 14B",
    vendor: "mistral",
    family: "mistral",
    openWeights: true,
    routes: {
      gateway: "mistral/ministral-14b",
      openrouter: "mistralai/ministral-14b-2512",
      direct: { provider: "mistral", id: "ministral-14b-2512" },
    },
  },
  {
    key: "grok-4.7",
    label: "Grok 4.7",
    vendor: "xai",
    family: "grok",
    openWeights: false,
    routes: {
      gateway: "spacexai/grok-4.7",
      openrouter: "x-ai/grok-4.7",
      direct: { provider: "xai", id: "grok-4.7" },
    },
  },
  {
    key: "muse-spark-1.3",
    label: "Muse Spark 1.3",
    vendor: "meta",
    family: "muse",
    openWeights: false,
    routes: { gateway: "meta/muse-spark-1.3", openrouter: "meta/muse-spark-1.3" },
  },
  {
    key: "llama-4-maverick",
    label: "Llama 4 Maverick",
    vendor: "meta",
    family: "llama",
    openWeights: true,
    routes: { gateway: "meta/llama-4-maverick", openrouter: "meta-llama/llama-4-maverick" },
  },
];

export function findEntry(key: string): RegistryEntry | undefined {
  return REGISTRY.find((entry) => entry.key === key);
}

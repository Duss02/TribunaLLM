import { z } from "zod";

export interface KeyField {
  variable: string;
  label: string;
  group: "judge" | "route" | "direct";
  help: string;
  url: string;
}

export const KEY_FIELDS: readonly KeyField[] = [
  {
    variable: "TYPESAFE_API_KEY",
    label: "Jev",
    group: "judge",
    help: "The judge. Needed for every debate unless JEV_MOCK=1.",
    url: "https://api.typesafe.ai",
  },
  {
    variable: "AI_GATEWAY_API_KEY",
    label: "Vercel AI Gateway",
    group: "route",
    help: "One key for the whole roster.",
    url: "https://vercel.com/ai-gateway",
  },
  {
    variable: "OPENROUTER_API_KEY",
    label: "OpenRouter",
    group: "route",
    help: "The widest catalogue.",
    url: "https://openrouter.ai/keys",
  },
  {
    variable: "ANTHROPIC_API_KEY",
    label: "Anthropic",
    group: "direct",
    help: "Claude models.",
    url: "https://console.anthropic.com/settings/keys",
  },
  {
    variable: "OPENAI_API_KEY",
    label: "OpenAI",
    group: "direct",
    help: "GPT models.",
    url: "https://platform.openai.com/api-keys",
  },
  {
    variable: "GOOGLE_GENERATIVE_AI_API_KEY",
    label: "Google",
    group: "direct",
    help: "Gemini models.",
    url: "https://aistudio.google.com/apikey",
  },
  {
    variable: "DEEPSEEK_API_KEY",
    label: "DeepSeek",
    group: "direct",
    help: "DeepSeek models.",
    url: "https://platform.deepseek.com/api_keys",
  },
  {
    variable: "MOONSHOT_API_KEY",
    label: "Moonshot AI",
    group: "direct",
    help: "Kimi models.",
    url: "https://platform.moonshot.ai/console/api-keys",
  },
  {
    variable: "MISTRAL_API_KEY",
    label: "Mistral",
    group: "direct",
    help: "Ministral models.",
    url: "https://console.mistral.ai/api-keys",
  },
  {
    variable: "XAI_API_KEY",
    label: "xAI",
    group: "direct",
    help: "Grok models.",
    url: "https://console.x.ai",
  },
];

const variables = KEY_FIELDS.map((field) => field.variable) as [string, ...string[]];

/** Keys by environment variable name. Anything else, or an empty or oversized value, is refused. */
export const keysSchema = z.partialRecord(z.enum(variables), z.string().trim().min(1).max(512));

export type SavedKeys = z.infer<typeof keysSchema>;

/** What the page may show of a saved key: never the whole thing. */
export function maskKey(value: string): string {
  return value.length > 12 ? `••••${value.slice(-4)}` : "••••";
}

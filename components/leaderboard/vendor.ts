import type { ModelRow } from "@/lib/bench/leaderboard";

// Eight validated categorical slots. A ninth vendor, and any unknown one, shares a neutral grey.
const SLOTS = [
  "anthropic",
  "openai",
  "google",
  "deepseek",
  "moonshot",
  "alibaba",
  "mistral",
  "meta",
] as const;

const NAMES: Record<ModelRow["vendor"], string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  deepseek: "DeepSeek",
  moonshot: "Moonshot AI",
  alibaba: "Alibaba",
  mistral: "Mistral",
  meta: "Meta",
  xai: "xAI",
  unknown: "Other",
};

export function vendorColor(vendor: ModelRow["vendor"]): string {
  return (SLOTS as readonly string[]).includes(vendor) ? `var(--v-${vendor})` : "var(--v-other)";
}

export const vendorName = (vendor: ModelRow["vendor"]) => NAMES[vendor];

/** Legend entries for the vendors present, in slot order, with the greys folded into one. */
export function legendFor(models: readonly ModelRow[]): { name: string; color: string }[] {
  const present = new Set(models.map((m) => m.vendor));
  const entries = SLOTS.filter((vendor) => present.has(vendor)).map((vendor) => ({
    name: NAMES[vendor],
    color: vendorColor(vendor),
  }));
  const others = [...present].filter((vendor) => !(SLOTS as readonly string[]).includes(vendor));
  if (others.length > 0) entries.push({ name: others.map(vendorName).join(", "), color: "var(--v-other)" });
  return entries;
}

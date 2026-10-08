import { keyFor, modelList } from "./availability";
import { modelKey } from "./catalogue";
import { DIRECT_PROVIDERS, ListError, targetsFor } from "./routes";
import { type DirectProvider, type RegistryEntry, findEntry } from "./registry";

const isDirect = (channel: string): channel is DirectProvider =>
  (DIRECT_PROVIDERS as readonly string[]).includes(channel);

/** Splits `gateway:anthropic/claude-3-haiku`, `openrouter:x/y:free` or `openai:gpt-x` at the first colon. */
export function parseModelKey(key: string): { channel: string; id: string } | null {
  const colon = key.indexOf(":");
  if (colon < 1 || colon === key.length - 1) return null;
  const channel = key.slice(0, colon);
  return channel === "gateway" || channel === "openrouter" || isDirect(channel)
    ? { channel, id: key.slice(colon + 1) }
    : null;
}

function routesOf(channel: string, id: string): RegistryEntry["routes"] {
  if (channel === "gateway") return { gateway: id };
  if (channel === "openrouter") return { openrouter: id };
  return isDirect(channel) ? { direct: { provider: channel, id } } : {};
}

/**
 * The roster entry for a key, or one made on the spot for a `channel:id` key.
 * A made-up entry takes its name from the provider's list, and gets the
 * temperature only when that list says the model accepts one: otherwise the
 * provider's own default is used rather than risk a rejected request.
 */
export async function resolveEntry(key: string): Promise<RegistryEntry | undefined> {
  const registered = findEntry(key);
  if (registered) return registered;

  const parsed = parseModelKey(key);
  if (!parsed) return undefined;
  const entry: RegistryEntry = {
    key: modelKey(parsed.channel, parsed.id),
    label: parsed.id,
    vendor: "unknown",
    family: "custom",
    openWeights: false,
    routes: routesOf(parsed.channel, parsed.id),
  };

  const [target] = targetsFor(entry);
  const apiKey = target && keyFor(target);
  if (!target || !apiKey) return { ...entry, fixedTemperature: true };

  const listed = await modelList(target, apiKey).then(
    ({ models }) => models.find((model) => model.id === parsed.id),
    (error: unknown) => {
      if (error instanceof ListError) return undefined;
      throw error;
    },
  );
  if (!listed) return { ...entry, fixedTemperature: true };
  return listed.acceptsTemperature
    ? { ...entry, label: listed.name }
    : { ...entry, label: listed.name, fixedTemperature: true };
}

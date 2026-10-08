import { getKey } from "@/lib/credentials";
import { isMockMode } from "@/lib/mock-mode";
import { hashString } from "@/lib/random";
import { REGISTRY, type RegistryEntry } from "./registry";
import { type ListSource, type ListedModel, ListError, type RouteName, targetsFor } from "./routes";

export type Status = "available" | "missing-key" | "unknown-id";

export interface ModelStatus {
  entry: RegistryEntry;
  status: Status;
  /** The route a debate will use; `scripted` only under JEV_MOCK=1. */
  route: RouteName | "scripted" | null;
  detail: string;
}

const LIST_TTL_MS = 10 * 60 * 1000;

export interface ModelList {
  models: ListedModel[];
  ids: Set<string>;
}

const lists = new Map<string, { at: number; list: Promise<ModelList> }>();

/** What a source lists, cached for ten minutes. Lists behind a key are cached per key. */
export function modelList(source: ListSource, apiKey: string): Promise<ModelList> {
  // One visitor's accepted key must never vouch for another's.
  const cacheKey = source.route === "direct" ? `${source.listName}:${hashString(apiKey)}` : source.listName;
  const cached = lists.get(cacheKey);
  if (cached && Date.now() - cached.at < LIST_TTL_MS) return cached.list;
  const list = source.list(apiKey).then((models) => ({ models, ids: new Set(models.map((m) => m.id)) }));
  lists.set(cacheKey, { at: Date.now(), list });
  // A failed fetch must not be served from the cache.
  list.catch(() => lists.delete(cacheKey));
  return list;
}

export function keyFor(source: ListSource): string | undefined {
  return getKey(source.keyVariable);
}

export async function modelStatus(entry: RegistryEntry): Promise<ModelStatus> {
  const targets = targetsFor(entry);
  const missing: string[] = [];
  const rejected: string[] = [];
  const unknown: string[] = [];

  for (const target of targets) {
    const apiKey = keyFor(target);
    if (!apiKey) {
      missing.push(target.keyVariable);
      continue;
    }
    try {
      const { ids } = await modelList(target, apiKey);
      if (ids.has(target.id)) return { entry, status: "available", route: target.route, detail: target.id };
      unknown.push(`${target.id} is not in the ${target.route} model list`);
    } catch (error) {
      if (!(error instanceof ListError)) throw error;
      if (error.status === 401 || error.status === 403) {
        rejected.push(`${target.keyVariable} was rejected (HTTP ${error.status})`);
        continue;
      }
      // The list is unreachable, not the key: let the first real call fail loudly if the id is wrong.
      return {
        entry,
        status: "available",
        route: target.route,
        detail: `${target.id} (not verified: ${error.message})`,
      };
    }
  }

  if (isMockMode()) {
    return { entry, status: "available", route: "scripted", detail: "scripted debater" };
  }
  if (unknown.length > 0) return { entry, status: "unknown-id", route: null, detail: unknown.join("; ") };
  if (rejected.length > 0) return { entry, status: "missing-key", route: null, detail: rejected.join("; ") };
  return { entry, status: "missing-key", route: null, detail: `set ${missing.join(", ")}` };
}

export function listAvailability(): Promise<ModelStatus[]> {
  return Promise.all(REGISTRY.map(modelStatus));
}

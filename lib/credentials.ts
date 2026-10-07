import { AsyncLocalStorage } from "node:async_hooks";
import type { SavedKeys } from "./keys";

const scope = new AsyncLocalStorage<SavedKeys>();

/** The key for a variable: the one sent with this request if there is one, else the server's environment. */
export function getKey(variable: string): string | undefined {
  return scope.getStore()?.[variable] || process.env[variable]?.trim() || undefined;
}

/**
 * Runs `work` with keys that belong to one request. They live only in the async
 * context of that work: nothing is stored, logged or shared with another request.
 */
export function withKeys<T>(keys: SavedKeys, work: () => T): T {
  return scope.run(keys, work);
}

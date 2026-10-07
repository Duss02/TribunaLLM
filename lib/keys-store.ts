import { type SavedKeys, keysSchema } from "./keys";

const STORAGE_KEY = "retracted.keys";

/** The keys saved in this browser. Empty when none are saved or when storage is unavailable. */
export function readKeys(): SavedKeys {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = keysSchema.safeParse(raw ? JSON.parse(raw) : {});
    return parsed.success ? parsed.data : {};
  } catch {
    // Storage throws in some private windows and when site data is blocked. The app works without it.
    return {};
  }
}

function writeKeys(keys: SavedKeys): boolean {
  try {
    if (Object.keys(keys).length === 0) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    return true;
  } catch {
    return false;
  }
}

/** Adds or replaces the given keys and leaves the others alone. False when the browser refused to store them. */
export function saveKeys(update: SavedKeys): boolean {
  return writeKeys({ ...readKeys(), ...update });
}

export function removeKey(variable: string): boolean {
  const keys = { ...readKeys() };
  delete keys[variable];
  return writeKeys(keys);
}

export function clearKeys(): boolean {
  return writeKeys({});
}

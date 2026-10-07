import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearKeys, readKeys, removeKey, saveKeys } from "@/lib/keys-store";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

let storage: ReturnType<typeof fakeStorage>;

beforeEach(() => {
  storage = fakeStorage();
  vi.stubGlobal("localStorage", storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("saved keys", () => {
  it("round-trips what was saved", () => {
    expect(saveKeys({ TYPESAFE_API_KEY: "jev-1", OPENROUTER_API_KEY: "or-1" })).toBe(true);
    expect(readKeys()).toEqual({ TYPESAFE_API_KEY: "jev-1", OPENROUTER_API_KEY: "or-1" });
  });

  it("adds and replaces keys without touching the others", () => {
    saveKeys({ TYPESAFE_API_KEY: "jev-1", OPENROUTER_API_KEY: "or-1" });
    saveKeys({ OPENROUTER_API_KEY: "or-2", XAI_API_KEY: "xai-1" });
    expect(readKeys()).toEqual({
      TYPESAFE_API_KEY: "jev-1",
      OPENROUTER_API_KEY: "or-2",
      XAI_API_KEY: "xai-1",
    });
  });

  it("removes one key, and clears the entry when the last goes", () => {
    saveKeys({ TYPESAFE_API_KEY: "jev-1", XAI_API_KEY: "xai-1" });
    removeKey("XAI_API_KEY");
    expect(readKeys()).toEqual({ TYPESAFE_API_KEY: "jev-1" });
    removeKey("TYPESAFE_API_KEY");
    expect(storage.data.size).toBe(0);
  });

  it("clears everything", () => {
    saveKeys({ TYPESAFE_API_KEY: "jev-1", XAI_API_KEY: "xai-1" });
    expect(clearKeys()).toBe(true);
    expect(readKeys()).toEqual({});
  });

  it("starts empty when nothing is stored", () => {
    expect(readKeys()).toEqual({});
  });

  it("treats corrupted or foreign contents as empty instead of failing", () => {
    for (const bad of [
      "not json",
      '{"PATH":"/usr/bin"}',
      '{"XAI_API_KEY":""}',
      "[1,2]",
      '{"XAI_API_KEY":7}',
    ]) {
      storage.data.set("retracted.keys", bad);
      expect(readKeys()).toEqual({});
    }
  });

  it("copes with a browser that blocks storage: reads are empty, writes report failure", () => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: blocked, setItem: blocked, removeItem: blocked });
    expect(readKeys()).toEqual({});
    expect(saveKeys({ XAI_API_KEY: "xai-1" })).toBe(false);
    expect(clearKeys()).toBe(false);
  });
});

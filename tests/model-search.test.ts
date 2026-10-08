import { describe, expect, it } from "vitest";
import { type PickerOption, searchOptions } from "@/lib/model-search";

const option = (key: string, label: string, group: string, curated = false, detail = ""): PickerOption => ({
  key,
  label,
  group,
  detail,
  curated,
});

const options = [
  option("claude-opus-5.5", "Claude Opus 5.5", "Roster", true),
  option("gpt-6-luna", "GPT-6 Luna", "Roster", true),
  option("gateway:anthropic/claude-3-haiku", "Claude 3 Haiku", "anthropic", false, "200k context"),
  option("gateway:anthropic/claude-opus-4.1", "Claude Opus 4.1", "anthropic"),
  option("gateway:openai/gpt-5", "GPT-5", "openai"),
  option("openrouter:meta-llama/llama-3.1-8b-instruct", "Meta: Llama 3.1 8B Instruct", "meta-llama"),
];

const keys = (query: string, limit = 50) => searchOptions(options, query, limit).shown.map((o) => o.key);

describe("searchOptions", () => {
  it("shows only the roster until something is typed", () => {
    expect(keys("")).toEqual(["claude-opus-5.5", "gpt-6-luna"]);
    expect(keys("   ")).toEqual(["claude-opus-5.5", "gpt-6-luna"]);
  });

  it("finds a model outside the roster by part of its name", () => {
    expect(keys("haiku")).toEqual(["gateway:anthropic/claude-3-haiku"]);
  });

  it("needs every word, in any order", () => {
    expect(keys("opus claude")).toEqual(["claude-opus-5.5", "gateway:anthropic/claude-opus-4.1"]);
    expect(keys("opus haiku")).toEqual([]);
  });

  it("ignores punctuation, so gpt5 finds GPT-5", () => {
    expect(keys("gpt5")).toEqual(["gateway:openai/gpt-5"]);
    expect(keys("llama 3.1")).toEqual(["openrouter:meta-llama/llama-3.1-8b-instruct"]);
  });

  it("matches the maker, the key and the detail as well as the name", () => {
    expect(keys("meta-llama")).toEqual(["openrouter:meta-llama/llama-3.1-8b-instruct"]);
    expect(keys("200k")).toEqual(["gateway:anthropic/claude-3-haiku"]);
    expect(keys("openrouter")).toEqual(["openrouter:meta-llama/llama-3.1-8b-instruct"]);
  });

  it("ranks the roster first, then names that start with the query, then the rest", () => {
    expect(keys("claude")).toEqual([
      "claude-opus-5.5",
      "gateway:anthropic/claude-3-haiku",
      "gateway:anthropic/claude-opus-4.1",
    ]);
  });

  it("is not case sensitive", () => {
    expect(keys("HAIKU")).toEqual(["gateway:anthropic/claude-3-haiku"]);
  });

  it("does not match everything on a punctuation-only word", () => {
    expect(keys("--")).toEqual([]);
  });

  it("cuts the list at the limit but still says how many matched", () => {
    const result = searchOptions(options, "claude", 2);
    expect(result.shown).toHaveLength(2);
    expect(result.matched).toBe(3);
  });

  it("returns nothing for a query that matches nothing", () => {
    expect(searchOptions(options, "zzz", 50)).toEqual({ shown: [], matched: 0 });
  });
});

import { describe, expect, it } from "vitest";
import { vendorOfModel } from "@/lib/models/vendor-of";

const catalogue = [
  { key: "gateway:xai/grok-5", label: "Grok 5", vendor: "xai", via: "AI Gateway", detail: "" },
  { key: "openrouter:acme/thing-1", label: "Thing", vendor: "acme", via: "OpenRouter", detail: "" },
  { key: "direct:qwen3-max", label: "Qwen", vendor: "", via: "Alibaba", detail: "" },
];

describe("vendorOfModel", () => {
  it("reads the vendor of a roster model from the registry", () => {
    expect(vendorOfModel("claude-opus-5.5", { catalogue: [] })).toBe("anthropic");
  });

  it("recognises a searched model from its listed vendor or its id", () => {
    expect(vendorOfModel("gateway:xai/grok-5", { catalogue })).toBe("xai");
    expect(vendorOfModel("direct:qwen3-max", { catalogue })).toBe("alibaba");
    expect(vendorOfModel("gateway:openai/gpt-6", { catalogue })).toBe("openai");
  });

  it("falls back to unknown for a maker it has not heard of", () => {
    expect(vendorOfModel("openrouter:acme/thing-1", { catalogue })).toBe("unknown");
  });
});

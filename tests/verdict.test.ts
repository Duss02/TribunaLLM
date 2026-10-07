import { describe, expect, it } from "vitest";
import { isRetracted, verdictFor } from "@/lib/jev/verdict";

const sentence = (isClaim: number, supported: number, contradicts: number) =>
  verdictFor({ isClaim, supported, contradicts });

describe("verdictFor", () => {
  it("never strikes an opinion, even when the evidence contradicts its wording", () => {
    expect(sentence(0.49, 0.1, 0.95)).toBe("opinion");
  });

  it("treats exactly 0.5 as a claim", () => {
    expect(sentence(0.5, 0.9, 0)).toBe("supported");
  });

  it("calls a claim contradicted from 0.7, and 0.69 is not enough", () => {
    expect(sentence(0.9, 0.1, 0.7)).toBe("contradicted");
    expect(sentence(0.9, 0.1, 0.69)).toBe("unsupported");
  });

  it("checks contradiction before support", () => {
    expect(sentence(0.9, 0.9, 0.8)).toBe("contradicted");
  });

  it("calls a claim supported from 0.7 and leaves 0.69 uncertain", () => {
    expect(sentence(0.9, 0.7, 0)).toBe("supported");
    expect(sentence(0.9, 0.69, 0)).toBe("uncertain");
  });

  it("calls a claim unsupported up to 0.35 and leaves 0.36 uncertain", () => {
    expect(sentence(0.9, 0.35, 0.1)).toBe("unsupported");
    expect(sentence(0.9, 0.36, 0.1)).toBe("uncertain");
  });
});

describe("isRetracted", () => {
  it("strikes only contradicted and unsupported sentences", () => {
    expect(isRetracted("contradicted")).toBe(true);
    expect(isRetracted("unsupported")).toBe(true);
    expect(isRetracted("uncertain")).toBe(false);
    expect(isRetracted("opinion")).toBe(false);
    expect(isRetracted("supported")).toBe(false);
  });
});

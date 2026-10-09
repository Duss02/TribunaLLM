import { describe, expect, it } from "vitest";
import { indexPassages, tokenize } from "@/lib/debate/retrieve";

const passages = [
  { id: "W1", text: "Stockholm introduced a congestion tax in 2006 after a seven-month trial." },
  { id: "W2", text: "London's congestion charge began in February 2003 at 5 pounds a day." },
  { id: "W3", text: "Singapore's Electronic Road Pricing replaced a paper licence scheme in 1998." },
  { id: "W4", text: "Traffic entering the London zone fell by 1,200 vehicles an hour." },
];

describe("tokenize", () => {
  it("drops function words, keeps numbers and folds a thousands separator", () => {
    expect(tokenize("The charge was 1,200 pounds in 2003")).toEqual(["charge", "1200", "pound", "2003"]);
  });
});

describe("indexPassages", () => {
  const index = indexPassages(passages);

  it("ranks the passage that shares the rare terms first", () => {
    expect(index.search("When did London start its congestion charge?", 2)[0]?.id).toBe("W2");
    expect(index.search("Stockholm trial 2006", 1)[0]?.id).toBe("W1");
  });

  it("matches numbers written with or without a separator", () => {
    expect(index.search("1200 vehicles an hour", 1)[0]?.id).toBe("W4");
  });

  it("returns nothing when no term matches and never more than the limit", () => {
    expect(index.search("photosynthesis in algae", 3)).toEqual([]);
    expect(index.search("congestion London Stockholm Singapore", 2)).toHaveLength(2);
  });
});

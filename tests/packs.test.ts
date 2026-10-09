import { describe, expect, it } from "vitest";
import {
  PACK_LIMITS,
  PackError,
  evidenceForDebaters,
  evidenceForJudge,
  listPacks,
  loadPack,
  parsePack,
} from "@/lib/debate/packs";

const valid = `---
title: Ferries
motion: The city should buy a second ferry.
source: City report
license: CC0-1.0
---

The ferry carried 4,200 passengers in 2023.

Fares rose
8 percent in 2024.
`;

describe("parsePack", () => {
  it("reads frontmatter and numbers the passages from P01", () => {
    const pack = parsePack("ferries", valid);
    expect(pack).toMatchObject({ slug: "ferries", title: "Ferries", license: "CC0-1.0" });
    expect(pack.passages).toEqual([
      { id: "P01", text: "The ferry carried 4,200 passengers in 2023." },
      { id: "P02", text: "Fares rose 8 percent in 2024." },
    ]);
  });

  it("strips quotes around frontmatter values", () => {
    const pack = parsePack("q", valid.replace("title: Ferries", 'title: "Ferries: a study"'));
    expect(pack.title).toBe("Ferries: a study");
  });

  it("rejects a missing field and says which", () => {
    expect(() => parsePack("p", valid.replace("license: CC0-1.0\n", ""))).toThrow(/missing "license"/);
  });

  it("rejects a passage over the word limit and names it", () => {
    const long = Array(PACK_LIMITS.maxPassageWords + 1)
      .fill("word")
      .join(" ");
    expect(() => parsePack("p", valid.replace("Fares rose\n8 percent in 2024.", long))).toThrow(
      /P02 has 121 words/,
    );
  });

  it("rejects headings and empty packs", () => {
    expect(() => parsePack("p", valid.replace("Fares rose", "# Fares rose"))).toThrow(/heading/);
    expect(() => parsePack("p", "---\ntitle: a\nmotion: b\nsource: c\nlicense: d\n---\n\n")).toThrow(
      /no passages/,
    );
  });

  it("rejects a pack over the token budget", () => {
    const paragraph = Array(110).fill("wordy").join(" ");
    const body = Array(200).fill(paragraph).join("\n\n");
    expect(() => parsePack("p", valid.split("---\n\n")[0] + "---\n\n" + body)).toThrow(/tokens/);
  });
});

describe("loadPack", () => {
  it("refuses a slug that could leave the packs folder", async () => {
    await expect(loadPack("../package")).rejects.toThrow(PackError);
  });

  it("says where to look when the pack does not exist", async () => {
    await expect(loadPack("no-such-pack")).rejects.toThrow(/not found in packs/);
  });
});

describe("evidence ordering", () => {
  const pack = parsePack("ferries", valid);

  it("keeps the written order for debaters", () => {
    expect(evidenceForDebaters(pack)).toBe(
      "P01| The ferry carried 4,200 passengers in 2023.\nP02| Fares rose 8 percent in 2024.",
    );
  });

  it("shuffles the judge's order from the seed and keeps ids matched to text", () => {
    const orders = new Set(Array.from({ length: 12 }, (_, seed) => evidenceForJudge(pack, seed).ids.join()));
    expect(orders).toEqual(new Set(["P01,P02", "P02,P01"]));
    expect(evidenceForJudge(pack, 5)).toEqual(evidenceForJudge(pack, 5));
    const judged = evidenceForJudge(pack, 3);
    expect(judged.text.split("\n").map((l) => l.split("| ")[0])).toEqual([...judged.ids]);
  });
});

describe("shipped packs", () => {
  it("are valid, self-contained and balanced enough to argue both sides", async () => {
    const packs = await listPacks();
    expect(packs.length).toBeGreaterThanOrEqual(10);
    for (const pack of packs) {
      expect(pack.passages.length, pack.slug).toBeGreaterThanOrEqual(14);
      expect(pack.passages.length, pack.slug).toBeLessThanOrEqual(26);
      expect(pack.motion.length, pack.slug).toBeGreaterThan(15);
      const digits = pack.passages.filter((p) => /\d/.test(p.text)).length;
      expect(digits / pack.passages.length, `${pack.slug} should carry checkable numbers`).toBeGreaterThan(
        0.7,
      );
      for (const passage of pack.passages) {
        expect(passage.text, `${pack.slug} ${passage.id}`).not.toMatch(/\bP\d{2,3}\b/);
      }
    }
  });
});

describe("reference libraries", () => {
  it("exist for every pack, are large, and number their passages uniquely", async () => {
    const { loadLibrary } = await import("@/lib/debate/library");
    for (const pack of await listPacks()) {
      const library = await loadLibrary(pack.slug);
      expect(library, pack.slug).not.toBeNull();
      if (!library) continue;
      expect(library.passages.length, pack.slug).toBeGreaterThanOrEqual(500);
      expect(new Set(library.passages.map((p) => p.id)).size).toBe(library.passages.length);
      expect(library.passages.every((p) => /^W\d{4}$/.test(p.id))).toBe(true);
    }
  });
});

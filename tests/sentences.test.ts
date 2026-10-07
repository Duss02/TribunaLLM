import { describe, expect, it } from "vitest";
import { splitSentences } from "@/lib/debate/sentences";

const all = (text: string) => splitSentences(text, { final: true }).sentences;

describe("splitSentences", () => {
  it("splits on . ! and ?", () => {
    expect(all("Is it true? Yes! It is.")).toEqual(["Is it true?", "Yes!", "It is."]);
  });

  it("does not split inside a decimal", () => {
    expect(all("The rate was 4.2 percent. It fell.")).toEqual(["The rate was 4.2 percent.", "It fell."]);
  });

  it("does not split after a title", () => {
    expect(all("Dr. Smith said so. Others agreed.")).toEqual(["Dr. Smith said so.", "Others agreed."]);
  });

  it("does not split after an acronym or e.g.", () => {
    expect(all("The U.S. economy grew 3 percent. Jobs followed.")).toEqual([
      "The U.S. economy grew 3 percent.",
      "Jobs followed.",
    ]);
    expect(all("Sales rose, e.g. in Milan. Then they fell.")).toEqual([
      "Sales rose, e.g. in Milan.",
      "Then they fell.",
    ]);
  });

  it("does not split after an initial", () => {
    expect(all("J. R. Smith led it. Fine.")).toEqual(["J. R. Smith led it.", "Fine."]);
  });

  it("treats No. as an abbreviation only before a digit", () => {
    expect(all("No. 5 was first. Then it ended.")).toEqual(["No. 5 was first.", "Then it ended."]);
    expect(all("I said no. Then I left.")).toEqual(["I said no.", "Then I left."]);
  });

  it("does not split before a lowercase word", () => {
    expect(all("It cost approx. five dollars. Cheap.")).toEqual(["It cost approx. five dollars.", "Cheap."]);
    expect(all("Well... maybe. Then no.")).toEqual(["Well... maybe.", "Then no."]);
  });

  it("keeps a closing quote with its sentence", () => {
    expect(all('He said "stop." Then he left.')).toEqual(['He said "stop."', "Then he left."]);
  });

  it("keeps a citation that follows the period with its sentence", () => {
    expect(all("Fares rose 8 percent. [P01] They fell later.")).toEqual([
      "Fares rose 8 percent. [P01]",
      "They fell later.",
    ]);
  });

  it("folds punctuation that trails a citation back into the sentence", () => {
    expect(all("Fares rose. [P01]. Then they fell.")).toEqual(["Fares rose. [P01].", "Then they fell."]);
  });

  it("collapses internal whitespace", () => {
    expect(all("One   two\nthree. Four.")).toEqual(["One two three.", "Four."]);
  });
});

describe("splitSentences while streaming", () => {
  it("confirms a sentence only once text follows its boundary", () => {
    expect(splitSentences("First one. ", { final: false })).toEqual({ sentences: [], rest: "First one. " });
    expect(splitSentences("First one. Second sec", { final: false })).toEqual({
      sentences: ["First one."],
      rest: "Second sec",
    });
  });

  it("waits while a citation might still be arriving", () => {
    expect(splitSentences("Fares rose. [P0", { final: false }).sentences).toEqual([]);
    expect(splitSentences("Fares rose. [P01] Next", { final: false })).toEqual({
      sentences: ["Fares rose. [P01]"],
      rest: "Next",
    });
  });

  it("flushes the remainder as the last sentence when final", () => {
    expect(splitSentences("One. Two without a period", { final: true })).toEqual({
      sentences: ["One.", "Two without a period"],
      rest: "",
    });
  });

  it("gives the same sentences however the text is chunked", () => {
    const text = "Dr. Lee found 4.2 percent. It fell. Was it real? Yes! [P02] Done.";
    const whole = all(text);
    for (const size of [1, 2, 5, 11]) {
      const found: string[] = [];
      let buffer = "";
      for (let i = 0; i < text.length; i += size) {
        buffer += text.slice(i, i + size);
        const { sentences, rest } = splitSentences(buffer, { final: false });
        found.push(...sentences);
        buffer = rest;
      }
      found.push(...splitSentences(buffer, { final: true }).sentences);
      expect(found).toEqual(whole);
    }
  });
});

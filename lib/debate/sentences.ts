export interface SplitResult {
  sentences: string[];
  /** Text after the last confirmed boundary; the sentence still being written. */
  rest: string;
}

const ABBREVIATIONS = new Set([
  "mr",
  "mrs",
  "ms",
  "dr",
  "prof",
  "sr",
  "jr",
  "st",
  "mt",
  "vs",
  "fig",
  "figs",
  "eq",
  "inc",
  "ltd",
  "co",
  "corp",
  "approx",
  "est",
  "dept",
  "gen",
  "gov",
  "sen",
  "rep",
  "col",
  "lt",
  "capt",
  "sgt",
  "cf",
  "al",
  "vol",
  "ed",
  "ca",
  "jan",
  "feb",
  "mar",
  "apr",
  "jun",
  "jul",
  "aug",
  "sep",
  "sept",
  "oct",
  "nov",
  "dec",
]);

const BOUNDARY = /([.!?]+["')\]”’]*)(\s+)/g;
const CITATION = /^\[P\d+\]/;
const PARTIAL_CITATION = /^\[(?:P\d*)?$/;

function endsInAbbreviation(before: string, after: string): boolean {
  const token = /(\S+)$/.exec(before)?.[1]?.replace(/^["'([“‘]+/, "");
  if (!token) return false;
  if (/^(?:[A-Za-z]\.)*[A-Za-z]$/.test(token) && (token.length === 1 || token.includes("."))) return true;
  const word = token.toLowerCase();
  if (word === "no" || word === "nos") return /^\d/.test(after);
  return ABBREVIATIONS.has(word);
}

/**
 * Splits streamed prose into sentences. A boundary is confirmed only when text
 * follows it, so `rest` holds whatever might still grow. Pass `final` once the
 * stream has ended to flush the remainder as the last sentence.
 */
export function splitSentences(text: string, { final }: { final: boolean }): SplitResult {
  const sentences: string[] = [];
  const tidy = (raw: string) => raw.replace(/\s+/g, " ").trim();
  let start = 0;

  for (const match of text.matchAll(BOUNDARY)) {
    const [whole, terminator = ""] = match;
    const termEnd = match.index + terminator.length;
    const afterStart = match.index + whole.length;
    const after = text.slice(afterStart);
    if (after === "") break;
    if (!final && PARTIAL_CITATION.test(after)) break;

    const before = text.slice(start, match.index);
    const onlyDots = /^\.+$/.test(terminator);
    if (onlyDots && /^[a-z]/.test(after)) continue;
    if (terminator === "." && endsInAbbreviation(before, after)) continue;

    const citation = CITATION.exec(after)?.[0];
    const end = citation ? afterStart + citation.length : termEnd;
    const sentence = tidy(text.slice(start, end));
    if (/^[.!?]+["')\]\u201d\u2019]*$/.test(sentence) && sentences.length > 0) {
      sentences[sentences.length - 1] += sentence;
    } else if (sentence) {
      sentences.push(sentence);
    }
    start = citation ? end + (/^\s+/.exec(text.slice(end))?.[0].length ?? 0) : afterStart;
  }

  const rest = text.slice(start);
  if (final && tidy(rest)) {
    sentences.push(tidy(rest));
    return { sentences, rest: "" };
  }
  return { sentences, rest };
}

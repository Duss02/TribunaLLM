export const percent = (value: number | null, digits = 1) =>
  value === null ? "-" : `${(value * 100).toFixed(digits)}%`;

export const day = (iso: string) => iso.slice(0, 10);

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

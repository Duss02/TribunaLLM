export class MissingKeyError extends Error {
  constructor(
    readonly variable: string,
    hint: string,
  ) {
    super(`${variable} is not set. ${hint}`);
    this.name = "MissingKeyError";
  }
}

import { type DebateEvent, debateEvent } from "./events";

export function encodeEvent(event: DebateEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/** Returns a function that takes stream chunks and gives back the events they complete. */
export function createEventParser(): (chunk: string) => DebateEvent[] {
  let buffer = "";
  return (chunk) => {
    buffer += chunk;
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";
    return frames.flatMap((frame) => {
      const data = frame
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .map((line) => line.slice(6))
        .join("\n");
      return data ? [debateEvent.parse(JSON.parse(data))] : [];
    });
  };
}

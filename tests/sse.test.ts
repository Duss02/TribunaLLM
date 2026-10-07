import { describe, expect, it } from "vitest";
import type { DebateEvent } from "@/lib/debate/events";
import { createEventParser, encodeEvent } from "@/lib/debate/sse";

const events: DebateEvent[] = [
  { type: "turn_start", turn: "PRO-1", side: "PRO", round: 1, model: "A" },
  { type: "token", turn: "PRO-1", text: 'He said "stop."\nThen left.' },
  { type: "error", message: "boom" },
];

describe("event stream", () => {
  it("round-trips events, however the bytes are cut", () => {
    const wire = events.map(encodeEvent).join("");
    for (const size of [1, 7, 50, wire.length]) {
      const parse = createEventParser();
      const received: DebateEvent[] = [];
      for (let i = 0; i < wire.length; i += size) received.push(...parse(wire.slice(i, i + size)));
      expect(received).toEqual(events);
    }
  });

  it("rejects an event that does not match the protocol", () => {
    const parse = createEventParser();
    expect(() => parse('data: {"type":"verdict","id":"x"}\n\n')).toThrow();
    expect(() => parse('data: {"type":"nonsense"}\n\n')).toThrow();
  });
});

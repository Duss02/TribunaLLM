import { describe, expect, it } from "vitest";
import { buildSchedule } from "@/lib/bench/schedule";

describe("buildSchedule", () => {
  const options = { models: ["c", "a", "b", "d"], packs: ["x", "y"], repeats: 1, runId: "run-1" };

  it("plays every pair on every pack, twice, once with each model on PRO", () => {
    const schedule = buildSchedule(options);
    expect(schedule).toHaveLength(6 * 2 * 2);
    for (const pack of options.packs) {
      for (const [a, b] of [
        ["a", "b"],
        ["a", "c"],
        ["a", "d"],
        ["b", "c"],
        ["b", "d"],
        ["c", "d"],
      ]) {
        const meetings = schedule.filter(
          (p) => p.pack === pack && [p.pro, p.con].sort().join() === `${a},${b}`,
        );
        expect(meetings.map((p) => p.pro).sort()).toEqual([a, b]);
      }
    }
  });

  it("never pits a model against itself", () => {
    expect(buildSchedule(options).every((p) => p.pro !== p.con)).toBe(true);
  });

  it("multiplies by the number of repeats", () => {
    expect(buildSchedule({ ...options, repeats: 3 })).toHaveLength(6 * 2 * 2 * 3);
  });

  it("reproduces the same order for the same run id and a different one for another", () => {
    expect(buildSchedule(options)).toEqual(buildSchedule({ ...options, models: ["a", "b", "c", "d"] }));
    expect(buildSchedule(options)).not.toEqual(buildSchedule({ ...options, runId: "run-2" }));
  });
});

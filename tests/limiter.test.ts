import { describe, expect, it } from "vitest";
import { createLimiter } from "@/lib/jev/limiter";

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 1));

describe("createLimiter", () => {
  it("never runs more than the maximum at once and runs everything", async () => {
    const limit = createLimiter(3);
    let running = 0;
    let peak = 0;
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        limit(async () => {
          running++;
          peak = Math.max(peak, running);
          await tick();
          running--;
          return i;
        }),
      ),
    );
    expect(peak).toBe(3);
    expect(results).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it("starts queued tasks in the order they arrived", async () => {
    const limit = createLimiter(1);
    const started: number[] = [];
    await Promise.all(
      [0, 1, 2, 3].map((i) =>
        limit(async () => {
          started.push(i);
          await tick();
        }),
      ),
    );
    expect(started).toEqual([0, 1, 2, 3]);
  });

  it("frees the slot when a task fails", async () => {
    const limit = createLimiter(1);
    await expect(limit(() => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(limit(async () => "next")).resolves.toBe("next");
  });
});

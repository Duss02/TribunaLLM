export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

export function createLimiter(maxInFlight: number): Limiter {
  let inFlight = 0;
  const waiting: Array<() => void> = [];

  return async (task) => {
    if (inFlight < maxInFlight) {
      inFlight++;
    } else {
      // The slot is handed over by whoever finishes, so it is never free in between.
      await new Promise<void>((resolve) => waiting.push(resolve));
    }
    try {
      return await task();
    } finally {
      const next = waiting.shift();
      if (next) next();
      else inFlight--;
    }
  };
}

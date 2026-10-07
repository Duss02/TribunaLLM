export interface Queue<T> extends AsyncIterable<T> {
  push(item: T): void;
  close(): void;
  fail(error: unknown): void;
}

/** An unbounded queue read as an async iterable: the way verdicts that finish out of band join the token stream. */
export function createQueue<T>(): Queue<T> {
  const buffer: T[] = [];
  let ended = false;
  let failure: { error: unknown } | null = null;
  let wake: (() => void) | null = null;

  const notify = () => {
    wake?.();
    wake = null;
  };

  return {
    push(item) {
      if (ended) return;
      buffer.push(item);
      notify();
    },
    close() {
      ended = true;
      notify();
    },
    fail(error) {
      failure = { error };
      ended = true;
      notify();
    },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        if (buffer.length > 0) {
          yield buffer.shift() as T;
        } else if (failure) {
          throw failure.error;
        } else if (ended) {
          return;
        } else {
          await new Promise<void>((resolve) => {
            wake = resolve;
          });
        }
      }
    },
  };
}

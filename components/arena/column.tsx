"use client";

import { useEffect, useRef } from "react";
import type { TurnView } from "@/lib/debate/view";
import type { Side } from "@/lib/side";
import { Sentence } from "./sentence";

export function Column({ side, model, turns }: { side: Side; model: string | null; turns: TurnView[] }) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = scroller.current;
    if (!element) return;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 120;
    if (nearBottom) element.scrollTop = element.scrollHeight;
  });

  return (
    <section aria-label={`${side} debater`} className="flex min-h-0 flex-col">
      <header className="mb-3 flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <h2 className="text-sm font-semibold tracking-wide">{side}</h2>
        <p className="truncate text-sm text-muted">{model ?? "waiting"}</p>
      </header>
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1 text-[1.0625rem] leading-relaxed lg:max-h-[calc(100vh-17rem)]"
      >
        {turns.map((turn) => (
          <article key={turn.id}>
            <h3 className="mb-1 text-xs uppercase tracking-wider text-muted">Round {turn.round}</h3>
            <p className={turn.ended ? "" : "caret"}>
              {turn.sentences.map((sentence) => (
                <Sentence key={sentence.id} sentence={sentence} />
              ))}
              {turn.partial}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

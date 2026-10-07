"use client";

import { useRef } from "react";
import type { SentenceView } from "@/lib/debate/view";

const RETRACTED = new Set(["contradicted", "unsupported"]);
const TIP_WIDTH = 352;
const TIP_HEIGHT = 190;
const EDGE = 8;

export function Sentence({ sentence }: { sentence: SentenceView }) {
  const { status, passage } = sentence;
  const tip = useRef<HTMLSpanElement>(null);

  // The tooltip is fixed so the column's scroll area cannot clip it; where it goes is set here.
  function place(anchor: DOMRect, pointer?: { x: number; y: number }) {
    const tooltip = tip.current;
    if (!tooltip) return;
    const x = pointer?.x ?? anchor.left;
    const below = (pointer?.y ?? anchor.bottom) + 18;
    const flip = below + TIP_HEIGHT > window.innerHeight;
    const y = flip ? Math.max(EDGE, (pointer?.y ?? anchor.top) - TIP_HEIGHT - 12) : below;
    tooltip.style.left = `${Math.max(EDGE, Math.min(x - 24, window.innerWidth - TIP_WIDTH - EDGE))}px`;
    tooltip.style.top = `${y}px`;
  }

  return (
    <>
      <span
        className="sentence"
        data-status={status}
        tabIndex={passage ? 0 : undefined}
        onPointerEnter={
          passage
            ? (e) => place(e.currentTarget.getBoundingClientRect(), { x: e.clientX, y: e.clientY })
            : undefined
        }
        onFocus={passage ? (e) => place(e.currentTarget.getBoundingClientRect()) : undefined}
      >
        {RETRACTED.has(status) && <span className="sr-only">Retracted: </span>}
        {sentence.text}
        {passage && (
          <span ref={tip} role="tooltip" className="passage">
            <b>{passage.id}</b> {passage.text}
          </span>
        )}
      </span>{" "}
    </>
  );
}

"use client";

import { useState } from "react";
import type { FinalEvent } from "@/lib/debate/events";
import { percent, retractionRate, summaryText } from "@/lib/debate/summary";
import type { Side } from "@/lib/side";
import { signed } from "./judge-panel";

interface Props {
  final: FinalEvent;
  motion: string;
  models: Record<Side, string>;
  judgeLabel: string;
  rounds: number;
  strictMode: boolean;
}

export function FinalCard({ final, motion, models, judgeLabel, rounds, strictMode }: Props) {
  const [copied, setCopied] = useState(false);
  const { score, verdict, stats } = final;
  const headline = score.winner === "draw" ? "Draw" : `${score.winner} wins`;

  async function copy() {
    await navigator.clipboard.writeText(
      summaryText({ motion, models, judgeLabel, rounds, strictMode, final }),
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section aria-label="Result" className="border-y border-line py-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-3xl font-semibold">
          {headline}
          {score.winner !== "draw" && (
            <span className="ml-3 text-base font-normal text-muted">
              by {Math.abs(score.margin).toFixed(2)} points
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-line px-3 py-1.5 text-sm outline-none hover:bg-line focus-visible:ring-2 focus-visible:ring-accent"
        >
          {copied ? "Copied" : "Copy summary"}
        </button>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        {(["PRO", "CON"] as const).map((side) => {
          const { counts } = stats[side];
          const rate = retractionRate(counts);
          return (
            <div key={side}>
              <p className="text-sm text-muted">
                {side} · {models[side]}
              </p>
              <p className="text-4xl font-semibold">T {score[side].T.toFixed(2)}</p>
              <p className="text-sm text-muted">
                E {signed(score[side].E, 0)} · A {signed(score[side].A, 0)} · J {signed(score[side].J, 2)}
              </p>
              <p className="mt-2 text-sm">
                {counts.sentences} sentences, {counts.claims} claims, {counts.supported} supported,{" "}
                {counts.unsupported + counts.contradicted} retracted
                {rate === null ? "" : ` (${percent(rate)} of claims)`}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-5">
        <p className="mb-1 text-xs uppercase tracking-wider text-muted">Jev final verdict</p>
        <div
          className="flex h-3 overflow-hidden rounded-full bg-line"
          role="img"
          aria-label={`PRO ${percent(verdict.pro)}, tie ${percent(verdict.tie)}, CON ${percent(verdict.con)}`}
        >
          <div className="bg-accent" style={{ width: percent(verdict.pro) }} />
          <div className="bg-muted/50" style={{ width: percent(verdict.tie) }} />
          <div className="bg-fg" style={{ width: percent(verdict.con) }} />
        </div>
        <p className="mt-1 flex justify-between text-sm text-muted">
          <span>PRO {percent(verdict.pro)}</span>
          <span>tie {percent(verdict.tie)}</span>
          <span>CON {percent(verdict.con)}</span>
        </p>
      </div>
    </section>
  );
}

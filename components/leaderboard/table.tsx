"use client";

import { useState } from "react";
import type { ModelRow } from "@/lib/bench/leaderboard";
import { percent } from "./format";
import { vendorColor, vendorName } from "./vendor";

type Key = "rating" | "retractionRate" | "contradictionRate" | "winRate" | "debates";

const COLUMNS: { key: Key; label: string; lowerIsBetter: boolean }[] = [
  { key: "rating", label: "Rating", lowerIsBetter: false },
  { key: "retractionRate", label: "Retraction rate", lowerIsBetter: true },
  { key: "contradictionRate", label: "Contradiction rate", lowerIsBetter: true },
  { key: "winRate", label: "Win rate", lowerIsBetter: false },
  { key: "debates", label: "Debates", lowerIsBetter: false },
];

function ModelName({ model }: { model: ModelRow }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden
        className="inline-block size-2.5 shrink-0 rounded-sm"
        style={{ background: vendorColor(model.vendor) }}
      />
      <span className="font-medium">{model.label}</span>
      <span className="text-muted">{vendorName(model.vendor)}</span>
      {model.openWeights && (
        <span className="inline-flex items-center gap-1 text-xs text-muted">
          <span aria-hidden className="inline-block size-2 rounded-full border border-muted" />
          open weights
        </span>
      )}
    </span>
  );
}

export function LeaderboardTable({ models }: { models: ModelRow[] }) {
  const [sort, setSort] = useState<{ key: Key; descending: boolean }>({ key: "rating", descending: true });

  const rows = [...models].sort((a, b) => {
    const left = a[sort.key] ?? -1;
    const right = b[sort.key] ?? -1;
    return sort.descending ? right - left : left - right;
  });

  const choose = (column: (typeof COLUMNS)[number]) =>
    setSort((current) =>
      current.key === column.key
        ? { key: column.key, descending: !current.descending }
        : { key: column.key, descending: !column.lowerIsBetter },
    );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pr-4 font-normal">Model</th>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={sort.key === column.key ? (sort.descending ? "descending" : "ascending") : "none"}
                className="py-2 pl-4 text-right font-normal"
              >
                <button
                  type="button"
                  onClick={() => choose(column)}
                  className="uppercase tracking-wider outline-none hover:text-fg focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {column.label}
                  {sort.key === column.key && <span aria-hidden>{sort.descending ? " ↓" : " ↑"}</span>}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((model) => (
            <tr key={model.key} className="border-b border-line">
              <td className="py-2.5 pr-4">
                <ModelName model={model} />
              </td>
              <td className="py-2.5 pl-4 text-right">
                {model.rating.toFixed(0)}
                <span className="ml-1 text-muted">
                  ±{((model.ratingHigh - model.ratingLow) / 2).toFixed(0)}
                </span>
              </td>
              <td className="py-2.5 pl-4 text-right">
                {percent(model.retractionRate)}
                {model.retractionLow !== null && model.retractionHigh !== null && (
                  <span className="ml-1 text-muted">
                    ({percent(model.retractionLow, 0)} to {percent(model.retractionHigh, 0)})
                  </span>
                )}
              </td>
              <td className="py-2.5 pl-4 text-right">{percent(model.contradictionRate)}</td>
              <td className="py-2.5 pl-4 text-right">{percent(model.winRate, 0)}</td>
              <td className="py-2.5 pl-4 text-right">{model.debates}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import type { ModelRow } from "@/lib/bench/leaderboard";
import { percent } from "./format";
import { legendFor, vendorColor, vendorName } from "./vendor";

const STEPS = [0.05, 0.1, 0.2, 0.25, 0.5, 1];

function axisFor(models: readonly ModelRow[]) {
  const top = Math.max(0.05, ...models.map((m) => m.retractionHigh ?? m.retractionRate ?? 0));
  const step = STEPS.find((s) => top / s <= 6) ?? 1;
  const max = Math.ceil(top / step) * step;
  return { max, ticks: Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step) };
}

export function RetractionChart({ models }: { models: ModelRow[] }) {
  const rows = models
    .filter((m) => m.retractionRate !== null)
    .sort((a, b) => (a.retractionRate as number) - (b.retractionRate as number));
  const { max, ticks } = axisFor(rows);
  const at = (value: number) => `${(value / max) * 100}%`;
  const legend = legendFor(rows);

  return (
    <figure>
      <figcaption className="mb-3 text-sm text-muted">
        Share of factual claims that Jev retracted (unsupported or contradicted). Lower is better. Whiskers
        are 95 percent Wilson intervals.
      </figcaption>

      <ul className="mb-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted" aria-label="Legend">
        {legend.map((entry) => (
          <li key={entry.name} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4 rounded-sm"
              style={{ background: entry.color }}
            />
            {entry.name}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="inline-block size-2 rounded-full border border-muted" />
          open weights
        </li>
      </ul>

      <div className="grid grid-cols-[minmax(7rem,13rem)_minmax(0,1fr)_3.5rem] items-center gap-x-3">
        {rows.map((model) => (
          <div
            key={model.key}
            tabIndex={0}
            className="group relative col-span-3 grid grid-cols-subgrid items-center py-1 outline-none focus-visible:bg-line/40 hover:bg-line/40"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate">{model.label}</span>
              {model.openWeights && (
                <span
                  aria-label="open weights"
                  className="inline-block size-2 shrink-0 rounded-full border border-muted"
                />
              )}
            </span>
            <span className="relative block h-5">
              {ticks.map((tick) => (
                <span
                  key={tick}
                  aria-hidden
                  className="absolute inset-y-0 border-l border-line"
                  style={{ left: at(tick) }}
                />
              ))}
              <span
                className="absolute left-0 top-0.5 h-4 rounded-r-[4px] transition-[width] duration-300"
                style={{
                  width: at(model.retractionRate as number),
                  background: vendorColor(model.vendor),
                  minWidth: "2px",
                }}
              />
              {model.retractionLow !== null && model.retractionHigh !== null && (
                <span
                  aria-hidden
                  className="absolute top-1/2 h-px bg-fg/60"
                  style={{
                    left: at(model.retractionLow),
                    width: at(model.retractionHigh - model.retractionLow),
                  }}
                >
                  <span className="absolute -left-px top-[-3px] h-[7px] w-px bg-fg/60" />
                  <span className="absolute -right-px top-[-3px] h-[7px] w-px bg-fg/60" />
                </span>
              )}
            </span>
            <span className="text-right text-sm font-medium">{percent(model.retractionRate)}</span>
            <span
              role="tooltip"
              className="tip absolute bottom-full left-0 z-10 mb-1 w-max max-w-xs rounded border border-line bg-bg px-3 py-2 text-xs leading-snug shadow-md"
            >
              <b className="block text-sm">{percent(model.retractionRate)} retracted</b>
              {model.label} · {vendorName(model.vendor)}
              <br />
              {model.retracted} of {model.claims} claims ({percent(model.retractionLow, 0)} to{" "}
              {percent(model.retractionHigh, 0)}), {percent(model.contradictionRate)} contradicted
            </span>
          </div>
        ))}
        <span />
        <span className="relative mt-1 block h-4 text-xs text-muted">
          {ticks.map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2" style={{ left: at(tick) }}>
              {Math.round(tick * 100)}%
            </span>
          ))}
        </span>
        <span />
      </div>
    </figure>
  );
}

import { type ArenaState, medianLatencyMs } from "@/lib/debate/view";
import type { JudgedVerdict } from "@/lib/jev/verdict";
import type { Side } from "@/lib/side";

const VERDICT_COLOR: Record<JudgedVerdict, string> = {
  supported: "text-supported",
  contradicted: "text-contradicted",
  unsupported: "text-unsupported",
  uncertain: "text-muted",
  opinion: "text-muted",
  unjudged: "text-muted",
};

export const signed = (value: number, digits = 1) =>
  `${value >= 0 ? "+" : "-"}${Math.abs(value).toFixed(digits)}`;

function Counter({
  label,
  value,
  demo,
  wide,
}: {
  label: string;
  value: string;
  demo: boolean;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "lg:col-span-2" : ""}>
      <dt className="truncate text-xs uppercase tracking-wider text-muted">{label}</dt>
      <dd className={`font-semibold leading-tight ${demo ? "text-4xl lg:text-5xl" : "text-2xl lg:text-3xl"}`}>
        {value}
      </dd>
    </div>
  );
}

function TugOfWar({ margin }: { margin: number }) {
  const reach = 50 * Math.tanh(margin / 6);
  return (
    <div
      className="relative mt-3 h-2 rounded-full bg-line"
      role="img"
      aria-label={`Score margin ${signed(margin, 2)} for PRO`}
    >
      <div
        className={`absolute top-0 h-full rounded-full transition-all duration-300 ${reach >= 0 ? "bg-accent" : "bg-fg"}`}
        style={reach >= 0 ? { right: "50%", width: `${reach}%` } : { left: "50%", width: `${-reach}%` }}
      />
      <div className="absolute left-1/2 top-[-3px] h-[14px] w-px bg-muted" />
    </div>
  );
}

export function JudgePanel({
  state,
  judgeLabel,
  demo,
}: {
  state: ArenaState;
  judgeLabel: string;
  demo: boolean;
}) {
  const median = medianLatencyMs(state);
  const sides: Side[] = ["PRO", "CON"];
  const margin = state.score ? state.score.PRO.T - state.score.CON.T : 0;

  return (
    <aside aria-label="Judge" className="flex flex-col gap-5 border-line lg:border-x lg:px-5">
      <div key={state.rewind?.count ?? 0} className={`${state.rewind ? "flash" : ""} rounded`}>
        <header className="mb-3 border-b border-line pb-2">
          <h2 className="text-sm font-semibold tracking-wide">Judge</h2>
          <p className="text-sm text-muted">
            {judgeLabel}
            {state.latencies.length > 0 &&
              ` · ${Math.round(median)} ms median · $${state.costUsd.toFixed(4)}`}
          </p>
        </header>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-5 lg:grid-cols-2">
          <Counter label="Judged" value={String(state.judged)} demo={demo} />
          <Counter label="Retracted" value={String(state.retracted)} demo={demo} />
          <Counter label="Contradictions" value={String(state.contradicted)} demo={demo} />
          <Counter label="Median" value={`${Math.round(median)} ms`} demo={demo} />
          <Counter label="Cost" value={`${(state.costUsd * 100).toFixed(2)}¢`} demo={demo} wide />
        </dl>
        {state.rewind && (
          <p className="mt-3 text-sm text-contradicted" role="status">
            Rewound after retracting: <span className="italic">“{state.rewind.text}”</span>
          </p>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs uppercase tracking-wider text-muted">Score</h3>
        {sides.map((side) => {
          const score = state.score?.[side];
          return (
            <div key={side} className="flex items-baseline justify-between gap-3 py-1">
              <span className="text-sm font-semibold">{side}</span>
              <span className="text-sm text-muted">
                {score ? `E ${signed(score.E, 0)} · A ${signed(score.A, 0)} · J ${signed(score.J, 1)}` : "-"}
              </span>
              <span className={`font-semibold ${demo ? "text-3xl" : "text-xl"}`}>
                {score ? score.T.toFixed(1) : "0.0"}
              </span>
            </div>
          );
        })}
        <TugOfWar margin={margin} />
      </div>

      {!demo && state.recent.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs uppercase tracking-wider text-muted">Last verdicts</h3>
          <ol className="space-y-1.5 text-sm">
            {state.recent.map((item) => (
              <li key={item.id} className="flex gap-2">
                <span className={`w-24 shrink-0 font-medium ${VERDICT_COLOR[item.verdict]}`}>
                  {item.verdict}
                </span>
                <span className="min-w-0 truncate text-muted" title={item.text}>
                  {item.text}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </aside>
  );
}

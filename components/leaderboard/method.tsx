import type { Leaderboard } from "@/lib/bench/leaderboard";
import { POINTS, THRESHOLDS } from "@/lib/scoring/rules";
import { day, plural } from "./format";

const signed = (n: number) => (n > 0 ? `+${n}` : `${n}`.replace("-", "−"));

const SCORING: { component: string; rule: string; points: string }[] = [
  { component: "Evidence E", rule: "per factual claim: supported", points: signed(POINTS.supported) },
  { component: "", rule: "unsupported (retracted)", points: signed(POINTS.unsupported) },
  { component: "", rule: "contradicted (retracted)", points: signed(POINTS.contradicted) },
  { component: "", rule: "uncertain or opinion", points: "0" },
  {
    component: "Argument A",
    rule: `per turn: rebuts ≥ ${THRESHOLDS.rebuts} (from round 2)`,
    points: signed(POINTS.rebuts),
  },
  { component: "", rule: `per turn: on_motion < ${THRESHOLDS.offMotion}`, points: signed(POINTS.offMotion) },
  {
    component: "",
    rule: `per turn: evidence_use score ≥ ${THRESHOLDS.evidenceUse}`,
    points: signed(POINTS.evidenceUse),
  },
  {
    component: "Judge J",
    rule: `final verdict: ${POINTS.judgeScale} × (p_side − p_other), 0 on tie`,
    points: `−${POINTS.judgeScale} … +${POINTS.judgeScale}`,
  },
  { component: "Total T", rule: "E + A + J", points: "" },
];

export function Method({ board }: { board: Leaderboard }) {
  return (
    <div className="max-w-3xl space-y-4 text-[0.9375rem] leading-relaxed">
      <p>
        Every pair of models debated every motion twice, once on each side, for {board.rounds.join(" and ")}{" "}
        rounds, from the same evidence pack and with the same prompt, temperature setting and word cap. Jev{" "}
        {board.judge} checked every finished sentence against the pack and assigned every point and every
        penalty, under {board.rules}. Strict mode was off, so no debate was interrupted: every retraction
        stands and costs points. Results: {plural(board.debates, "debate")} over{" "}
        {plural(board.packs.length, "pack")} ({board.packs.join(", ")}), played {day(board.firstDebateAt)}
        {day(board.firstDebateAt) === day(board.lastDebateAt) ? "" : ` to ${day(board.lastDebateAt)}`},
        aggregated {day(board.generatedAt)}.
        {board.failed > 0 &&
          ` ${plural(board.failed, "debate")} failed and ${board.failed === 1 ? "is" : "are"} not counted.`}
      </p>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
            <th className="py-2 pr-4 font-normal">Component</th>
            <th className="py-2 pr-4 font-normal">Rule</th>
            <th className="py-2 text-right font-normal">Points</th>
          </tr>
        </thead>
        <tbody>
          {SCORING.map((row, index) => (
            <tr key={index} className="border-b border-line">
              <td className="py-1.5 pr-4 font-medium">{row.component}</td>
              <td className="py-1.5 pr-4">{row.rule}</td>
              <td className="py-1.5 text-right">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        Rating is a Bradley-Terry fit to debate outcomes (a win is 1, a draw 0.5), shown on the Elo scale with
        the mean at 1500. A weak prior of a quarter of a draw against every other model keeps unbeaten models
        finite. The interval is the 2.5th to 97.5th percentile of 500 resamples of the debates. The retraction
        rate is (unsupported + contradicted) divided by factual claims, pooled over both sides, with a 95
        percent Wilson interval.
      </p>

      <h3 className="pt-2 text-sm font-semibold">Caveats</h3>
      <ul className="list-disc space-y-1.5 pl-5">
        <li>
          The judge can be wrong. Jev is calibrated, not infallible, and reproduces some of the errors of LLM
          judges (Rao and Callison-Burch, 2026). A retraction means the judge found no support in the pack,
          not that the sentence is false.
        </li>
        <li>
          The packs are short and few, the language is English only, and a model that writes fewer factual
          sentences has fewer chances to be retracted.
        </li>
        <li>
          Whether a sentence is a factual claim at all is itself a Jev call, so opinion detection moves the
          denominators.
        </li>
        <li>
          Models received identical prompts and word caps. Three of them (Claude Opus 5.5, Claude Sonnet 5.5,
          Kimi K3) do not accept a temperature setting and sampled at their own default instead of 0.7.
          Reasoning effort was set to low wherever the provider exposes it.
        </li>
        <li>
          With few debates per model the intervals are wide, and neighbouring ranks are often not
          distinguishable.
        </li>
      </ul>
    </div>
  );
}

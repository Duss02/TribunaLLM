import type { CertifiedBoard } from "@/lib/bench/load";
import { percent } from "./format";
import { vendorColor, vendorName } from "./vendor";

type Vendor = Parameters<typeof vendorColor>[0];

/**
 * The pilot's claims judged again with the certified question: the framed contradiction criterion over every
 * passage the arena read, at the 0.5 rule and at the confident rule fitted on DebateCheck's training motions.
 * Match outcomes (ratings, wins) are the pilot's and sit in the table above this one.
 */
export function CertifiedTable({ board }: { board: CertifiedBoard }) {
  const confident = board.thresholds.confident.toFixed(2);
  return (
    <div className="space-y-3">
      <p className="max-w-3xl text-sm text-muted">
        {board.claims.toLocaleString("en-US")} claims from {board.debates} debates, judged again by{" "}
        {board.judge}. The arena&apos;s original question struck {board.pilotContradicted}; the certified
        question marks {board.contradicted} at the 0.5 rule and {board.contradictedConfident} when the judge
        is confident (p &ge; {confident}, about 5% error on held-out DebateCheck). A strike means the library
        gives a different figure, not that the claim is false. Wilson 95% intervals.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-2 pr-4 font-normal">Model</th>
              <th className="py-2 pr-4 text-right font-normal">Claims</th>
              <th className="py-2 pr-4 text-right font-normal">Struck (pilot)</th>
              <th className="py-2 pr-4 text-right font-normal">Contradicted, 0.5</th>
              <th className="py-2 pr-4 text-right font-normal">Confident</th>
              <th className="py-2 pr-4 text-right font-normal">Confident rate</th>
              <th className="py-2 text-right font-normal">Pilot win rate</th>
            </tr>
          </thead>
          <tbody>
            {board.models.map((m) => (
              <tr key={m.key} className="border-t border-line">
                <td className="py-2 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      aria-hidden
                      className="inline-block size-2.5 shrink-0 rounded-sm"
                      style={{ background: vendorColor(m.vendor as Vendor) }}
                    />
                    <span className="font-medium">{m.label}</span>
                    <span className="text-muted">{vendorName(m.vendor as Vendor)}</span>
                  </span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{m.claims}</td>
                <td className="py-2 pr-4 text-right tabular-nums">{m.pilotContradicted}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {m.contradicted} <span className="text-muted">({percent(m.rate)})</span>
                </td>
                <td className="py-2 pr-4 text-right tabular-nums">{m.contradictedConfident}</td>
                <td className="py-2 pr-4 text-right tabular-nums">
                  {percent(m.rateConfident)}{" "}
                  <span className="text-muted">
                    [{percent(m.lowConfident)}, {percent(m.highConfident)}]
                  </span>
                </td>
                <td className="py-2 text-right tabular-nums">{percent(m.winRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

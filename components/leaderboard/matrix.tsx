import type { Leaderboard } from "@/lib/bench/leaderboard";
import { vendorColor } from "./vendor";

const cell = (wins: number) => (Number.isInteger(wins) ? String(wins) : wins.toFixed(1));

export function HeadToHead({ board }: { board: Leaderboard }) {
  const { models, wins } = board.headToHead;
  const byKey = new Map(board.models.map((m) => [m.key, m]));

  return (
    <div className="overflow-x-auto">
      <table className="border-collapse text-sm">
        <caption className="mb-2 text-left text-sm text-muted">
          Debates won by the row model against the column model. A draw counts half to each.
        </caption>
        <thead>
          <tr className="text-xs text-muted">
            <th />
            {models.map((_, column) => (
              <th key={column} scope="col" className="px-2 py-1 text-right font-normal">
                {column + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {models.map((row, r) => (
            <tr key={row}>
              <th scope="row" className="whitespace-nowrap py-1 pr-4 text-left font-normal">
                <span className="mr-2 inline-block w-4 text-right text-muted">{r + 1}</span>
                <span
                  aria-hidden
                  className="mr-2 inline-block size-2.5 rounded-sm align-baseline"
                  style={{ background: vendorColor(byKey.get(row)?.vendor ?? "unknown") }}
                />
                {byKey.get(row)?.label ?? row}
              </th>
              {models.map((column, c) => {
                const mine = wins[r]?.[c] ?? 0;
                const theirs = wins[c]?.[r] ?? 0;
                const share = mine + theirs === 0 ? 0 : mine / (mine + theirs);
                return (
                  <td
                    key={column}
                    className="px-2 py-1 text-right"
                    style={
                      r === c
                        ? undefined
                        : {
                            background: `color-mix(in srgb, var(--accent) ${Math.round(share * 45)}%, transparent)`,
                          }
                    }
                  >
                    {r === c ? <span className="text-muted">-</span> : cell(mine)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

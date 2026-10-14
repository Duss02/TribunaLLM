import type { Metadata } from "next";
import { HeadToHead } from "@/components/leaderboard/matrix";
import { day, percent, plural } from "@/components/leaderboard/format";
import { Method } from "@/components/leaderboard/method";
import { RetractionChart } from "@/components/leaderboard/retraction-chart";
import { LeaderboardTable } from "@/components/leaderboard/table";
import { readCertifiedBoard, readLeaderboard } from "@/lib/bench/load";
import { CertifiedTable } from "@/components/leaderboard/certified";

export const metadata: Metadata = { title: "TribunaLLM: leaderboard" };

const heading = "mb-4 text-lg font-semibold";

export default async function Page() {
  const board = await readLeaderboard();
  const certified = await readCertifiedBoard();

  if (!board) {
    return (
      <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
        <h1 className="text-2xl font-semibold">Leaderboard</h1>
        <p className="mt-4 max-w-xl text-muted">
          No results yet. Run <code>pnpm tournament</code> with your keys, then{" "}
          <code>pnpm leaderboard:build</code>, and this page shows the ranking from{" "}
          <code>bench/leaderboard.json</code>.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1400px] px-4 pb-16 sm:px-6">
      <div className="max-w-5xl space-y-12">
        <header>
          <h1 className="text-2xl font-semibold sm:text-3xl">Which model gets retracted least?</h1>
          <p className="mt-2 text-muted">
            {plural(board.debates, "debate")} · {plural(board.models.length, "model")} ·{" "}
            {plural(board.packs.length, "pack")} · judge {board.judge} · {board.rules} ·{" "}
            {day(board.lastDebateAt)} ·{" "}
            <a className="underline underline-offset-2 hover:text-fg" href="/leaderboard.json" download>
              JSON
            </a>
          </p>
          {board.mock && (
            <p role="alert" className="mt-4 max-w-2xl border-l-2 border-unsupported pl-3 text-sm">
              These results come from the mock judge and scripted debaters. They are not measurements of any
              model.
            </p>
          )}
        </header>

        <section aria-labelledby="ranking">
          <h2 id="ranking" className={heading}>
            Ranking
          </h2>
          <LeaderboardTable models={board.models} />
        </section>

        {certified && (
          <section aria-labelledby="certified">
            <h2 id="certified" className={heading}>
              The same claims under the certified question
            </h2>
            <CertifiedTable board={certified} />
          </section>
        )}

        <section aria-labelledby="chart">
          <h2 id="chart" className={heading}>
            Retraction rate
          </h2>
          <RetractionChart models={board.models} />
        </section>

        <section aria-labelledby="h2h">
          <h2 id="h2h" className={heading}>
            Head to head
          </h2>
          <HeadToHead board={board} />
        </section>

        <section aria-labelledby="packs">
          <h2 id="packs" className={heading}>
            By pack
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2 pr-4 font-normal">Pack</th>
                  <th className="py-2 pl-4 text-right font-normal">Debates</th>
                  <th className="py-2 pl-4 text-right font-normal">Retraction rate</th>
                  <th className="py-2 pl-4 text-right font-normal">Contradiction rate</th>
                  <th className="py-2 pl-4 text-right font-normal">Fewest retractions</th>
                  <th className="py-2 pl-4 text-right font-normal">Most retractions</th>
                </tr>
              </thead>
              <tbody>
                {board.perPack.map((row) => {
                  const label = (model: string | undefined) =>
                    board.models.find((m) => m.key === model)?.label ?? model;
                  return (
                    <tr key={row.pack} className="border-b border-line">
                      <td className="py-2.5 pr-4 font-medium">{row.pack}</td>
                      <td className="py-2.5 pl-4 text-right">{row.debates}</td>
                      <td className="py-2.5 pl-4 text-right">{percent(row.retractionRate)}</td>
                      <td className="py-2.5 pl-4 text-right">{percent(row.contradictionRate)}</td>
                      <td className="py-2.5 pl-4 text-right">
                        {row.best ? `${label(row.best.model)} ${percent(row.best.retractionRate, 0)}` : "-"}
                      </td>
                      <td className="py-2.5 pl-4 text-right">
                        {row.worst
                          ? `${label(row.worst.model)} ${percent(row.worst.retractionRate, 0)}`
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby="method">
          <h2 id="method" className={heading}>
            Method
          </h2>
          <Method board={board} />
        </section>
      </div>
    </main>
  );
}

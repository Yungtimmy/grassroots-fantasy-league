import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-NG", { weekday: "short", month: "short", day: "numeric" }).format(d);
}

function formatTime(match: { date: Date; time: string | null }): string {
  if (match.time) return match.time;
  return new Intl.DateTimeFormat("en-NG", { hour: "2-digit", minute: "2-digit" }).format(match.date);
}

export default async function FixturesPage() {
  const gameweeks = await prisma.gameweek.findMany({
    where: { season: { status: { in: ["active", "upcoming"] } } },
    include: {
      matches: {
        include: {
          homeTeam: { select: { id: true, name: true, shortName: true, logo: true } },
          awayTeam: { select: { id: true, name: true, shortName: true, logo: true } },
        },
        orderBy: { date: "asc" },
      },
    },
    orderBy: { number: "asc" },
  });

  const withMatches = gameweeks.filter((gw) => gw.matches.length > 0);

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Fixtures</h1>
        <p className="mt-2 text-surface-400">Gameweeks and club vs club matches entered by GFL admin.</p>
      </div>

      {withMatches.length === 0 ? (
        <div className="rounded-xl border border-surface-800 bg-surface-900 p-12 text-center">
          <p className="text-lg text-surface-400">No fixtures published yet.</p>
          <p className="mt-2 text-sm text-surface-500">
            Fixtures appear here after an admin adds a gameweek and club vs club matches.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {withMatches.map((gw) => (
            <div key={gw.id}>
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold">{gw.name || `Gameweek ${gw.number}`}</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    gw.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : gw.status === "finished" || gw.status === "completed"
                        ? "bg-surface-500/20 text-surface-400"
                        : "bg-blue-500/20 text-blue-400"
                  }`}
                >
                  {gw.status}
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-surface-800 bg-surface-900">
                <div className="divide-y divide-surface-800">
                  {gw.matches.map((match) => {
                    const finished = match.status === "finished";
                    const live = match.status === "live";
                    return (
                      <div key={match.id} className="flex items-center gap-4 px-6 py-4">
                        <div className="w-28 shrink-0">
                          <p className="text-xs text-surface-500">{formatDate(match.date)}</p>
                          <p className="text-sm font-medium text-surface-300">{formatTime(match)}</p>
                        </div>

                        <div className="flex flex-1 items-center justify-center gap-4">
                          <span className="flex-1 truncate text-right text-sm font-medium">
                            {match.homeTeam.name}
                          </span>

                          {finished || live ? (
                            <div className="flex items-center gap-2 rounded-lg bg-surface-800 px-4 py-2">
                              <span className="font-mono text-lg font-bold">{match.homeScore}</span>
                              <span className="text-surface-500">-</span>
                              <span className="font-mono text-lg font-bold">{match.awayScore}</span>
                            </div>
                          ) : (
                            <span className="text-xs uppercase tracking-widest text-surface-500">vs</span>
                          )}

                          <span className="flex-1 truncate text-sm font-medium">{match.awayTeam.name}</span>
                        </div>

                        <div className="w-16 shrink-0 text-right text-xs text-surface-500">
                          {live ? "LIVE" : finished ? "FT" : match.venue || ""}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

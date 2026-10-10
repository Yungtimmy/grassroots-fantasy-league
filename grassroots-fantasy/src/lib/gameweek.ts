import { prisma } from "./db";

export type DisplayedGameweekCandidate = {
  id: string;
  number: number;
  status: string;
};

/**
 * Gameweek shown as current for GW Points, My Team badges, squad badges,
 * leaderboard GW columns, and leaderboard squad reveal.
 *
 * 1. An active gameweek. If more than one is active, the lowest number.
 * 2. Otherwise the finished gameweek with the highest number.
 * 3. Otherwise none. A later upcoming gameweek is not current just because
 *    the row exists, so creating the next week does not move these figures.
 */
export function selectDisplayedGameweek<T extends DisplayedGameweekCandidate>(
  gameweeks: readonly T[],
): T | null {
  const active = gameweeks
    .filter((gameweek) => gameweek.status === "active")
    .sort((a, b) => a.number - b.number);
  if (active.length > 0) return active[0]!;

  const finished = gameweeks
    .filter((gameweek) => gameweek.status === "finished")
    .sort((a, b) => b.number - a.number);
  return finished[0] ?? null;
}

export async function findDisplayedGameweek(seasonId: string) {
  const gameweeks = await prisma.gameweek.findMany({
    where: { seasonId },
  });
  return selectDisplayedGameweek(gameweeks);
}

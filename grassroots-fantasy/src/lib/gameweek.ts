import { prisma } from "./db";

/**
 * Gameweek used for the dashboard GW Points figure and for My Team badges.
 * Both surfaces must call this so they cannot drift onto different weeks.
 */
export async function findDisplayedGameweek(seasonId: string) {
  return prisma.gameweek.findFirst({
    where: { seasonId },
    orderBy: { number: "desc" },
  });
}

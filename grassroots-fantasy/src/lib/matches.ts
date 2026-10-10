import { prisma } from "./db";
import { MATCH_DURATION_MS } from "./fixture-admin";

export async function autoUpdateMatchStatuses() {
  const now = new Date();

  // upcoming → live: match date+time has been reached.
  // status "postponed" is neither upcoming nor live, so a postponed fixture
  // stays postponed after its original kickoff.
  const toLive = await prisma.match.updateMany({
    where: {
      status: "upcoming",
      date: { lte: now },
    },
    data: { status: "live" },
  });

  // live → finished: match date + 2 hours has passed
  const cutoff = new Date(now.getTime() - MATCH_DURATION_MS);
  const toFinished = await prisma.match.updateMany({
    where: {
      status: "live",
      date: { lte: cutoff },
    },
    data: { status: "finished" },
  });

  return { toLive: toLive.count, toFinished: toFinished.count };
}

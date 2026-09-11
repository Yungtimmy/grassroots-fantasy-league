import { prisma } from "./db";

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours (90 min + half-time + stoppage)

export async function autoUpdateMatchStatuses() {
  const now = new Date();

  // upcoming → live: match date+time has been reached
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

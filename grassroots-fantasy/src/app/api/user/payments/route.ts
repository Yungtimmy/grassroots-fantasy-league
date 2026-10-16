export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import {
  feeLookup,
  toPaymentHistory,
  type HistoryPayment,
  type LeagueFee,
  type SeasonFee,
} from "@/lib/payment-history";

export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const records = await prisma.payment.findMany({
      where: { userId: authUser.userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        amount: true,
        reference: true,
        status: true,
        metadata: true,
        seasonId: true,
        universityId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ payments: await withFeeContext(records) });
  } catch (error) {
    console.error("User payments error:", error);
    return NextResponse.json({ error: "Failed to load payment history" }, { status: 500 });
  }
}

async function withFeeContext(records: HistoryPayment[]) {
  if (records.length === 0) return [];

  const lookup = feeLookup(records);
  const [seasons, leagues] = await Promise.all([
    loadSeasons(lookup.seasonIds),
    loadLeagues(lookup.leagueIds, lookup.pairs),
  ]);
  return toPaymentHistory(records, seasons, leagues);
}

async function loadSeasons(seasonIds: string[]): Promise<SeasonFee[]> {
  if (seasonIds.length === 0) return [];
  return prisma.season.findMany({
    where: { id: { in: seasonIds } },
    select: { id: true, name: true, registrationFee: true },
  });
}

async function loadLeagues(
  leagueIds: string[],
  pairs: { universityId: string; seasonId: string }[],
): Promise<LeagueFee[]> {
  const filters = [
    ...(leagueIds.length > 0 ? [{ id: { in: leagueIds } }] : []),
    ...pairs,
  ];
  if (filters.length === 0) return [];

  const leagues = await prisma.universityLeague.findMany({
    where: { OR: filters },
    select: {
      id: true,
      name: true,
      entryFee: true,
      universityId: true,
      seasonId: true,
      university: { select: { name: true } },
    },
  });

  return leagues.map((league) => ({
    id: league.id,
    name: league.name,
    entryFee: league.entryFee,
    universityId: league.universityId,
    seasonId: league.seasonId,
    universityName: league.university.name,
  }));
}

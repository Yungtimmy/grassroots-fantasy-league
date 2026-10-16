export interface HistoryPayment {
  id: string;
  amount: number;
  reference: string;
  status: string;
  metadata: string | null;
  seasonId: string | null;
  universityId: string | null;
  createdAt: Date;
}

export interface SeasonFee {
  id: string;
  name: string;
  registrationFee: number;
}

export interface LeagueFee {
  id: string;
  name: string | null;
  entryFee: number | null;
  universityId: string;
  seasonId: string;
  universityName: string | null;
}

export interface PaymentHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: string;
  reference: string;
  description: string;
}

const PAGE_STATUS: Record<string, string> = {
  successful: "SUCCESSFUL",
  pending: "PENDING",
  failed: "FAILED",
};

export function leagueIdFromMetadata(metadata: string | null): string | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { leagueId?: unknown };
    return typeof parsed.leagueId === "string" && parsed.leagueId.length > 0
      ? parsed.leagueId
      : null;
  } catch {
    return null;
  }
}

export function feeLookup(payments: HistoryPayment[]) {
  const seasonIds = new Set<string>();
  const leagueIds = new Set<string>();
  const pairs = new Map<string, { universityId: string; seasonId: string }>();

  for (const payment of payments) {
    if (payment.seasonId) seasonIds.add(payment.seasonId);
    const leagueId = leagueIdFromMetadata(payment.metadata);
    if (leagueId) leagueIds.add(leagueId);
    if (payment.universityId && payment.seasonId) {
      pairs.set(`${payment.universityId}:${payment.seasonId}`, {
        universityId: payment.universityId,
        seasonId: payment.seasonId,
      });
    }
  }

  return {
    seasonIds: [...seasonIds],
    leagueIds: [...leagueIds],
    pairs: [...pairs.values()],
  };
}

/**
 * Season registration fees are stored in naira. League entry fees are stored in
 * kobo (50000 = ₦500). Payment.amount copies whichever fee was charged. The
 * history page prints ₦ and does not divide, so a row that still matches the
 * league's entry fee is converted to naira. Anything else is already naira.
 */
export function displayPaymentAmount(storedAmount: number, entryFeeKobo: number | null): number {
  if (entryFeeKobo != null && storedAmount === entryFeeKobo) {
    return storedAmount / 100;
  }
  return storedAmount;
}

export function paymentHistoryStatus(status: string): string {
  return PAGE_STATUS[status.trim().toLowerCase()] ?? status.toUpperCase();
}

export function toPaymentHistory(
  payments: HistoryPayment[],
  seasons: SeasonFee[],
  leagues: LeagueFee[],
): PaymentHistoryItem[] {
  const seasonById = new Map(seasons.map((season) => [season.id, season]));
  const leagueById = new Map(leagues.map((league) => [league.id, league]));
  const leagueByPair = new Map(
    leagues.map((league) => [`${league.universityId}:${league.seasonId}`, league]),
  );

  return [...payments]
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((payment) => {
      const league = resolveLeague(payment, leagueById, leagueByPair);
      const season = payment.seasonId ? seasonById.get(payment.seasonId) ?? null : null;
      const usedEntryFee = league?.entryFee != null && payment.amount === league.entryFee;
      return {
        id: payment.id,
        date: payment.createdAt.toISOString(),
        amount: displayPaymentAmount(payment.amount, league?.entryFee ?? null),
        status: paymentHistoryStatus(payment.status),
        reference: payment.reference,
        description: historyDescription(usedEntryFee, season, league),
      };
    });
}

function resolveLeague(
  payment: HistoryPayment,
  leagueById: Map<string, LeagueFee>,
  leagueByPair: Map<string, LeagueFee>,
): LeagueFee | null {
  const metadataLeagueId = leagueIdFromMetadata(payment.metadata);
  if (metadataLeagueId) {
    const match = leagueById.get(metadataLeagueId);
    if (match) return match;
  }
  if (payment.universityId && payment.seasonId) {
    return leagueByPair.get(`${payment.universityId}:${payment.seasonId}`) ?? null;
  }
  return null;
}

function historyDescription(
  usedEntryFee: boolean,
  season: SeasonFee | null,
  league: LeagueFee | null,
): string {
  if (usedEntryFee) {
    if (league?.name) return `Entry fee for ${league.name}`;
    if (league?.universityName) return `Entry fee for ${league.universityName}`;
    return "League entry fee";
  }
  if (season?.name) return `${season.name} registration`;
  return "Season registration";
}

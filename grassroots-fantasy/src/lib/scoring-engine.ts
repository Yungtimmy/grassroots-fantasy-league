/**
 * Pure gameweek scoring. No database access.
 *
 * Captain is always 3x and vice-captain is always 2x, including when both
 * play. There is no fallback that promotes the vice-captain. Only the
 * starting XI scores. Replacing a gameweek's awards (rather than adding
 * them) is what makes a re-save idempotent.
 *
 * Point values default to the figures below and can be overlaid with
 * ScoringRule rows. Role multipliers live only in ROLE_MULTIPLIERS.
 */

export const ROLE_MULTIPLIERS = {
  captain: 3,
  viceCaptain: 2,
  regular: 1,
} as const;

export type ScoringRules = {
  /** Awarded once per match when minutes > 0. */
  appearance: number;
  goal: Record<string, number>;
  assist: number;
  cleanSheet: Record<string, number>;
  /** Goalkeepers only. */
  penaltySave: number;
  penaltyMiss: number;
  /** Goalkeepers only, and only when they actually played. */
  goalConceded: number;
  yellowCard: number;
  redCard: number;
  ownGoal: number;
};

export const DEFAULT_SCORING_RULES: ScoringRules = {
  appearance: 2,
  goal: { GK: 10, DEF: 8, MID: 6, FWD: 5 },
  assist: 3,
  cleanSheet: { GK: 5, DEF: 4 },
  penaltySave: 5,
  penaltyMiss: -2,
  goalConceded: -2,
  yellowCard: -1,
  redCard: -3,
  ownGoal: -2,
};

export type ScoringRuleRow = {
  event: string;
  position: string | null;
  points: number;
};

export type MatchStatInput = {
  matchId: string;
  playerId: string;
  position: string;
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves?: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltyMiss: number;
  penaltySave: number;
  goalsConceded: number;
};

export type SquadSlot = {
  userId: string;
  teamId: string;
  playerId: string;
  isStarting: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
};

export type PlayerAward = {
  userId: string;
  teamId: string;
  playerId: string;
  gameweekId: string;
  eventType: string;
  basePoints: number;
  multiplier: number;
  totalPoints: number;
};

export type PointTxn = {
  userId: string;
  /** Null when a legacy row could not be attached to one team. */
  teamId: string | null;
  playerId: string;
  gameweekId: string;
  eventType: string;
  basePoints: number;
  multiplier: number;
  totalPoints: number;
};

export type PointsLedger = {
  transactions: PointTxn[];
  /** teamId -> overall points across every gameweek still in the ledger */
  teamTotals: Record<string, number>;
  /** playerId -> unmultiplied base points */
  playerTotals: Record<string, number>;
};

export function roleMultiplier(isCaptain: boolean, isViceCaptain: boolean): number {
  if (isCaptain) return ROLE_MULTIPLIERS.captain;
  if (isViceCaptain) return ROLE_MULTIPLIERS.viceCaptain;
  return ROLE_MULTIPLIERS.regular;
}

export function rulesFromRows(
  rows: ScoringRuleRow[],
  base: ScoringRules = DEFAULT_SCORING_RULES,
): ScoringRules {
  const rules: ScoringRules = {
    ...base,
    goal: { ...base.goal },
    cleanSheet: { ...base.cleanSheet },
  };

  for (const row of rows) {
    const event = row.event.toUpperCase();
    const position = row.position ? row.position.toUpperCase() : null;
    switch (event) {
      case "APPEARANCE":
        if (!position) rules.appearance = row.points;
        break;
      case "GOAL":
        if (position) rules.goal[position] = row.points;
        break;
      case "ASSIST":
        if (!position) rules.assist = row.points;
        break;
      case "CLEAN_SHEET":
        if (position) rules.cleanSheet[position] = row.points;
        break;
      case "PENALTY_SAVE":
        if (!position || position === "GK") rules.penaltySave = row.points;
        break;
      case "PENALTY_MISS":
        if (!position) rules.penaltyMiss = row.points;
        break;
      case "GOAL_CONCEDED":
        if (!position || position === "GK") rules.goalConceded = row.points;
        break;
      case "YELLOW_CARD":
        if (!position) rules.yellowCard = row.points;
        break;
      case "RED_CARD":
        if (!position) rules.redCard = row.points;
        break;
      case "OWN_GOAL":
        if (!position) rules.ownGoal = row.points;
        break;
      // SAVE is stored on the stat row but is not a scoring event.
      // A scored penalty is entered as a goal, so there is no separate event.
      default:
        break;
    }
  }

  return rules;
}

export function scoreMatchStat(
  stat: MatchStatInput,
  rules: ScoringRules = DEFAULT_SCORING_RULES,
): { points: number; events: string[] } {
  const position = stat.position.toUpperCase();
  let points = 0;
  const events: string[] = [];
  const played = stat.minutes > 0;

  if (played) {
    points += rules.appearance;
    events.push("APPEARANCE");
  }

  if (stat.goals > 0) {
    points += (rules.goal[position] ?? 0) * stat.goals;
    events.push(`GOALx${stat.goals}`);
  }

  if (stat.assists > 0) {
    points += rules.assist * stat.assists;
    events.push(`ASSISTx${stat.assists}`);
  }

  // Clean sheet is a team flag. Never award it to someone who did not play.
  if (stat.cleanSheet && played) {
    const cleanSheetPoints = rules.cleanSheet[position] ?? 0;
    if (cleanSheetPoints !== 0) {
      points += cleanSheetPoints;
      events.push("CLEAN_SHEET");
    }
  }

  if (position === "GK" && stat.goalsConceded > 0 && played) {
    points += rules.goalConceded * stat.goalsConceded;
    events.push(`GOAL_CONCEDEDx${stat.goalsConceded}`);
  }

  if (position === "GK" && stat.penaltySave > 0) {
    points += rules.penaltySave * stat.penaltySave;
    events.push(`PENALTY_SAVEx${stat.penaltySave}`);
  }

  if (stat.penaltyMiss > 0) {
    points += rules.penaltyMiss * stat.penaltyMiss;
    events.push(`PENALTY_MISSx${stat.penaltyMiss}`);
  }

  if (stat.yellowCards > 0) {
    points += rules.yellowCard * stat.yellowCards;
    events.push(`YELLOW_CARDx${stat.yellowCards}`);
  }

  if (stat.redCards > 0) {
    points += rules.redCard * stat.redCards;
    events.push(`RED_CARDx${stat.redCards}`);
  }

  if (stat.ownGoals > 0) {
    points += rules.ownGoal * stat.ownGoals;
    events.push(`OWN_GOALx${stat.ownGoals}`);
  }

  return { points, events };
}

export function awardsForSquad(
  gameweekId: string,
  slots: Array<SquadSlot & { basePoints: number; eventType?: string }>,
): PlayerAward[] {
  const chosen = new Map<string, SquadSlot & { basePoints: number; eventType?: string }>();

  for (const slot of slots) {
    if (!slot.isStarting || slot.basePoints === 0) continue;
    const key = `${slot.teamId}:${slot.playerId}`;
    const existing = chosen.get(key);
    if (!existing || roleMultiplier(slot.isCaptain, slot.isViceCaptain) > roleMultiplier(existing.isCaptain, existing.isViceCaptain)) {
      chosen.set(key, slot);
    }
  }

  return [...chosen.values()].map((slot) => {
    const multiplier = roleMultiplier(slot.isCaptain, slot.isViceCaptain);
    return {
      userId: slot.userId,
      teamId: slot.teamId,
      playerId: slot.playerId,
      gameweekId,
      eventType: slot.eventType ?? "",
      basePoints: slot.basePoints,
      multiplier,
      totalPoints: slot.basePoints * multiplier,
    };
  });
}

export type GameweekScore = {
  awards: PlayerAward[];
  /** Unmultiplied base for every player who has a stat line in this gameweek, including 0. */
  playerBases: Record<string, number>;
};

export function scoreGameweek(input: {
  gameweekId: string;
  stats: MatchStatInput[];
  squad: SquadSlot[];
  rules?: ScoringRules;
}): GameweekScore {
  const rules = input.rules ?? DEFAULT_SCORING_RULES;
  const playerBases: Record<string, number> = {};
  const eventTypes: Record<string, string[]> = {};

  for (const stat of input.stats) {
    const scored = scoreMatchStat(stat, rules);
    playerBases[stat.playerId] = (playerBases[stat.playerId] ?? 0) + scored.points;
    eventTypes[stat.playerId] = [...(eventTypes[stat.playerId] ?? []), ...scored.events];
  }

  const slots = input.squad.map((slot) => ({
    ...slot,
    basePoints: playerBases[slot.playerId] ?? 0,
    eventType: (eventTypes[slot.playerId] ?? []).join(","),
  }));

  return {
    awards: awardsForSquad(input.gameweekId, slots),
    playerBases,
  };
}

export function emptyLedger(): PointsLedger {
  return { transactions: [], teamTotals: {}, playerTotals: {} };
}

/**
 * Drop this gameweek's transactions and insert `awards` in their place.
 * Team totals are the sum of whatever transactions remain. Player totals
 * are replaced with `playerBases` for the ids provided (pass the full
 * season base, not a delta).
 */
export function replaceGameweek(
  ledger: PointsLedger,
  gameweekId: string,
  awards: PlayerAward[],
  playerBases: Record<string, number>,
): PointsLedger {
  const transactions: PointTxn[] = [
    ...ledger.transactions.filter((txn) => txn.gameweekId !== gameweekId),
    ...awards.map((award) => ({
      userId: award.userId,
      teamId: award.teamId,
      playerId: award.playerId,
      gameweekId: award.gameweekId,
      eventType: award.eventType,
      basePoints: award.basePoints,
      multiplier: award.multiplier,
      totalPoints: award.totalPoints,
    })),
  ];

  const next = ledgerFromTransactions(transactions, { ...ledger.playerTotals, ...playerBases });
  for (const teamId of Object.keys(ledger.teamTotals)) {
    if (next.teamTotals[teamId] === undefined) next.teamTotals[teamId] = 0;
  }
  return next;
}

export function ledgerFromTransactions(
  transactions: PointTxn[],
  playerTotals: Record<string, number> = {},
): PointsLedger {
  const teamIds = new Set<string>();
  for (const txn of transactions) {
    if (txn.teamId) teamIds.add(txn.teamId);
  }

  const teamTotals: Record<string, number> = {};
  for (const teamId of teamIds) {
    teamTotals[teamId] = transactions
      .filter((txn) => txn.teamId === teamId)
      .reduce((sum, txn) => sum + txn.totalPoints, 0);
  }

  return { transactions, teamTotals, playerTotals };
}

export function badgesForUser(awards: PlayerAward[], userId: string): Record<string, number> {
  const badges: Record<string, number> = {};
  for (const award of awards) {
    if (award.userId !== userId) continue;
    badges[award.playerId] = (badges[award.playerId] ?? 0) + award.totalPoints;
  }
  return badges;
}

/** Badges for one fantasy team. Two teams of the same manager do not share these. */
export function badgesForTeam(awards: PlayerAward[], teamId: string): Record<string, number> {
  const badges: Record<string, number> = {};
  for (const award of awards) {
    if (award.teamId !== teamId) continue;
    badges[award.playerId] = (badges[award.playerId] ?? 0) + award.totalPoints;
  }
  return badges;
}

export type AttributionRow = {
  teamId: string | null;
  userId: string;
  totalPoints: number;
};

/**
 * Rows with a teamId stay on that team. A row with no teamId counts for a
 * manager only when they have exactly one team. Two teams leave it unattributed.
 */
export function attributePoints(input: {
  rows: AttributionRow[];
  teams: Array<{ teamId: string; userId: string }>;
}): { totals: Record<string, number>; unattributedPoints: number; unattributedRows: number } {
  const teamsByUser = new Map<string, string[]>();
  const totals: Record<string, number> = {};
  for (const team of input.teams) {
    totals[team.teamId] = 0;
    const list = teamsByUser.get(team.userId) ?? [];
    list.push(team.teamId);
    teamsByUser.set(team.userId, list);
  }

  let unattributedPoints = 0;
  let unattributedRows = 0;
  for (const row of input.rows) {
    if (row.teamId) {
      totals[row.teamId] = (totals[row.teamId] ?? 0) + row.totalPoints;
      continue;
    }
    const teams = teamsByUser.get(row.userId) ?? [];
    if (teams.length === 1) {
      totals[teams[0]] += row.totalPoints;
      continue;
    }
    unattributedRows += 1;
    unattributedPoints += row.totalPoints;
  }

  return { totals, unattributedPoints, unattributedRows };
}

export function sumPoints(values: Record<string, number>): number {
  return Object.values(values).reduce((sum, value) => sum + value, 0);
}

export type SeasonGameweekInput = {
  gameweekId: string;
  stats: MatchStatInput[];
  squad: SquadSlot[];
};

/** Rebuild every gameweek from stats. Running it again on the same input returns the same ledger. */
export function rebuildSeason(
  gameweeks: SeasonGameweekInput[],
  rules: ScoringRules = DEFAULT_SCORING_RULES,
): PointsLedger {
  return rebuildWithSnapshots(
    gameweeks.map((gameweek) => ({ ...gameweek, squad: gameweek.squad })),
    [],
    rules,
  ).ledger;
}

export type SnapshotGameweekInput = {
  gameweekId: string;
  stats: MatchStatInput[];
  /**
   * Lineup saved for this gameweek. Null means there is no snapshot.
   * `currentSquad` is accepted and ignored so a caller cannot fall back to it.
   */
  squad: SquadSlot[] | null;
  currentSquad?: SquadSlot[];
};

/**
 * Score gameweeks that have a lineup snapshot. A gameweek with `squad: null`
 * is left untouched: its preserved transactions stay, and `currentSquad` is
 * not read.
 */
export function rebuildWithSnapshots(
  gameweeks: SnapshotGameweekInput[],
  preserved: PointTxn[] = [],
  rules: ScoringRules = DEFAULT_SCORING_RULES,
): { ledger: PointsLedger; skippedGameweekIds: string[] } {
  const skippedGameweekIds = gameweeks.filter((gameweek) => gameweek.squad === null).map((gameweek) => gameweek.gameweekId);
  let ledger = ledgerFromTransactions(preserved);
  const seasonBases: Record<string, number> = {};

  for (const gameweek of gameweeks) {
    if (gameweek.squad === null) {
      for (const stat of gameweek.stats) {
        const scored = scoreMatchStat(stat, rules);
        seasonBases[stat.playerId] = (seasonBases[stat.playerId] ?? 0) + scored.points;
      }
      continue;
    }

    const scored = scoreGameweek({
      gameweekId: gameweek.gameweekId,
      stats: gameweek.stats,
      squad: gameweek.squad,
      rules,
    });
    for (const [playerId, base] of Object.entries(scored.playerBases)) {
      seasonBases[playerId] = (seasonBases[playerId] ?? 0) + base;
    }
    ledger = replaceGameweek(ledger, gameweek.gameweekId, scored.awards, { ...ledger.playerTotals, ...seasonBases });
  }

  return {
    ledger: { ...ledger, playerTotals: seasonBases },
    skippedGameweekIds,
  };
}

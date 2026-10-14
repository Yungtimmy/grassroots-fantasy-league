import type { ScoringDb } from "./scoring";
import { BENCH_MULTIPLIER, ROLE_MULTIPLIERS } from "./scoring-engine";

/**
 * One-off rebuild of a finished gameweek that was scored but never frozen.
 *
 * Each team starts from that gameweek's point rows (the players who scored).
 * Captain is multiplier 3 and vice-captain is multiplier 2, and only when
 * that is the single stored role. A 1x row is a starter or a substitute;
 * those are the same multiplier, so the row does not say which.
 *
 * Players who did not score are copied from the current squad only when
 * FantasyTeamPlayer.createdAt — the latest save, because a save deletes and
 * recreates those rows — is at or before the gameweek end. FantasyTeam.updatedAt
 * is not a squad edit time (a rename updates it) and is not read.
 * If that save time is missing, or the save is after the gameweek ended,
 * the team is skipped. Nothing is invented.
 *
 * Confirm writes source = 'rebuilt' and sets lineupFrozenAt. It does not
 * delete or replace a snapshot that is already there.
 */

export const REBUILT_LINEUP_SOURCE = "rebuilt";
export const FROZEN_LINEUP_SOURCE = "frozen";

const ALREADY_FROZEN =
  "A lineup snapshot already exists for this gameweek. It was not overwritten.";
const NOT_FINISHED = "Only a finished gameweek can be rebuilt.";
const NO_END =
  "This gameweek has no usable end time, so a squad save cannot be compared with it.";
const ALL_SKIPPED =
  "No squad was written because every team was skipped. The gameweek was not marked frozen.";
const NO_SAVE_TIME =
  "No reliable record of when this squad was last saved, so players who did not score were not filled in.";
const EDITED_AFTER =
  "This squad was saved after the gameweek ended, so the current squad was not used to fill players who did not score.";

export type RebuildPlayer = {
  playerId: string;
  playerName: string;
  position: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  filledFromCurrentSquad: boolean;
};

export type RebuildTeamPlan =
  | {
      status: "ready";
      teamId: string;
      teamName: string;
      userName: string;
      reason: null;
      squadSavedAt: string | null;
      players: RebuildPlayer[];
    }
  | {
      status: "skipped";
      teamId: string;
      teamName: string;
      userName: string;
      reason: string;
      squadSavedAt: string | null;
      players: [];
    };

export type SquadRebuildPlan = {
  ok: boolean;
  canWrite: boolean;
  alreadyFrozen: boolean;
  reason: string | null;
  gameweek: {
    id: string;
    name: string;
    number: number;
    seasonName: string;
    status: string;
    endDate: string;
  } | null;
  teams: RebuildTeamPlan[];
};

export type SquadRebuildResult = SquadRebuildPlan & { written: boolean };

type SquadPlayerInput = {
  playerId: string;
  playerName: string;
  position: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
};

type PointInput = {
  playerId: string;
  playerName: string;
  position: string;
  multiplier: number;
};

export type SquadRebuildTeamInput = {
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  /** Latest FantasyTeamPlayer.createdAt. Null when the team has no player rows. */
  squadSavedAt: Date | string | null;
  players: SquadPlayerInput[];
  /** Point rows already attributed to this team. Do not include another team's rows. */
  points: PointInput[];
};

export type SquadRebuildGameweekInput = {
  id: string;
  name: string;
  number: number;
  seasonName: string;
  status: string;
  endDate: Date | string | null;
  lineupFrozenAt: Date | string | null;
  lineupCount: number;
};

const POSITION_ORDER = ["GK", "DEF", "MID", "FWD"];

function instant(value: Date | string | null | undefined): number | null {
  if (value == null) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function stamp(value: Date | string | null): string | null {
  const ms = instant(value);
  if (ms == null || value == null) return null;
  return new Date(ms).toISOString();
}

function skip(
  team: { teamId: string; teamName: string; userName: string; squadSavedAt: Date | string | null },
  reason: string,
): RebuildTeamPlan {
  return {
    status: "skipped",
    teamId: team.teamId,
    teamName: team.teamName,
    userName: team.userName,
    reason,
    squadSavedAt: stamp(team.squadSavedAt),
    players: [],
  };
}

function orderPlayers(players: RebuildPlayer[]): RebuildPlayer[] {
  return [...players].sort((a, b) => {
    if (a.isStarting !== b.isStarting) return a.isStarting ? -1 : 1;
    const ai = POSITION_ORDER.indexOf(a.position);
    const bi = POSITION_ORDER.indexOf(b.position);
    const ao = ai === -1 ? POSITION_ORDER.length : ai;
    const bo = bi === -1 ? POSITION_ORDER.length : bi;
    if (ao !== bo) return ao - bo;
    return a.playerName.localeCompare(b.playerName);
  });
}

function knownMultiplier(multiplier: number): "captain" | "vice" | "plain" | null {
  if (multiplier === ROLE_MULTIPLIERS.captain) return "captain";
  if (multiplier === ROLE_MULTIPLIERS.viceCaptain) return "vice";
  // Starters and substitutes both score at 1x, so a 1x row does not store the slot.
  if (multiplier === ROLE_MULTIPLIERS.regular && multiplier === BENCH_MULTIPLIER) return "plain";
  return null;
}

function planTeam(team: SquadRebuildTeamInput, endedAtMs: number): RebuildTeamPlan {
  const savedAtMs = instant(team.squadSavedAt);
  if (savedAtMs == null) return skip(team, NO_SAVE_TIME);
  if (savedAtMs > endedAtMs) return skip(team, EDITED_AFTER);
  if (team.players.length === 0) return skip(team, "This team has no squad rows to rebuild from.");

  const seenSquad = new Set<string>();
  for (const player of team.players) {
    if (seenSquad.has(player.playerId)) return skip(team, "The current squad lists the same player twice.");
    seenSquad.add(player.playerId);
    if (!player.position.trim()) return skip(team, `${player.playerName} has no position stored.`);
  }

  const byPlayer = new Map<string, PointInput[]>();
  for (const row of team.points) {
    const list = byPlayer.get(row.playerId) ?? [];
    list.push(row);
    byPlayer.set(row.playerId, list);
  }

  const points: PointInput[] = [];
  for (const rows of byPlayer.values()) {
    const role = knownMultiplier(rows[0]!.multiplier);
    if (!role) {
      return skip(
        team,
        `A point row uses multiplier ${rows[0]!.multiplier}, which is not a stored captain, vice, or plain score.`,
      );
    }
    if (rows.some((row) => row.multiplier !== rows[0]!.multiplier)) {
      return skip(team, "More than one point row for the same player disagrees, so that role was not used.");
    }
    points.push(rows[0]!);
  }

  const captains = points.filter((row) => knownMultiplier(row.multiplier) === "captain");
  const vices = points.filter((row) => knownMultiplier(row.multiplier) === "vice");
  if (captains.length > 1) return skip(team, "More than one player is stored as captain on the point rows.");
  if (vices.length > 1) return skip(team, "More than one player is stored as vice-captain on the point rows.");

  const currentById = new Map(team.players.map((player) => [player.playerId, player]));
  for (const row of points) {
    const current = currentById.get(row.playerId);
    const role = knownMultiplier(row.multiplier);
    if (!current) {
      return skip(
        team,
        `${row.playerName} scored in this gameweek but is not in the current squad, so the two records disagree.`,
      );
    }
    if (role === "captain" && !(current.isCaptain && !current.isViceCaptain && current.isStarting)) {
      return skip(
        team,
        `${row.playerName} is stored as captain on the points, but the unchanged squad does not match that role.`,
      );
    }
    if (role === "vice" && !(current.isViceCaptain && !current.isCaptain && current.isStarting)) {
      return skip(
        team,
        `${row.playerName} is stored as vice-captain on the points, but the unchanged squad does not match that role.`,
      );
    }
    if (role === "plain" && (current.isCaptain || current.isViceCaptain)) {
      return skip(
        team,
        `${row.playerName} scored at 1x, but the unchanged squad marks them as captain or vice-captain.`,
      );
    }
  }

  const scoredIds = new Set(points.map((row) => row.playerId));
  const players = orderPlayers(
    team.players.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      isCaptain: player.isCaptain,
      isViceCaptain: player.isViceCaptain,
      isStarting: player.isStarting,
      filledFromCurrentSquad: !scoredIds.has(player.playerId),
    })),
  );

  return {
    status: "ready",
    teamId: team.teamId,
    teamName: team.teamName,
    userName: team.userName,
    reason: null,
    squadSavedAt: stamp(team.squadSavedAt),
    players,
  };
}

export function planSquadRebuild(input: {
  gameweek: SquadRebuildGameweekInput | null;
  teams: SquadRebuildTeamInput[];
}): SquadRebuildPlan {
  if (!input.gameweek) {
    return {
      ok: false,
      canWrite: false,
      alreadyFrozen: false,
      reason: "Gameweek not found.",
      gameweek: null,
      teams: [],
    };
  }

  const gameweek = {
    id: input.gameweek.id,
    name: input.gameweek.name,
    number: input.gameweek.number,
    seasonName: input.gameweek.seasonName,
    status: input.gameweek.status,
    endDate: stamp(input.gameweek.endDate) ?? "",
  };
  const frozen = input.gameweek.lineupFrozenAt != null || input.gameweek.lineupCount > 0;
  if (frozen) {
    return {
      ok: false,
      canWrite: false,
      alreadyFrozen: true,
      reason: ALREADY_FROZEN,
      gameweek,
      teams: [],
    };
  }
  if (input.gameweek.status !== "finished") {
    return {
      ok: false,
      canWrite: false,
      alreadyFrozen: false,
      reason: NOT_FINISHED,
      gameweek,
      teams: [],
    };
  }
  const endedAtMs = instant(input.gameweek.endDate);
  if (endedAtMs == null) {
    return {
      ok: false,
      canWrite: false,
      alreadyFrozen: false,
      reason: NO_END,
      gameweek,
      teams: [],
    };
  }

  const teams = [...input.teams]
    .sort((a, b) => a.teamName.localeCompare(b.teamName) || a.userName.localeCompare(b.userName))
    .map((team) => planTeam(team, endedAtMs));
  const canWrite = teams.some((team) => team.status === "ready");

  return {
    ok: true,
    canWrite,
    alreadyFrozen: false,
    reason: null,
    gameweek,
    teams,
  };
}

export type RebuiltLineupWrite = {
  gameweekId: string;
  teamId: string;
  playerId: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  position: string;
  source: typeof REBUILT_LINEUP_SOURCE;
};

export function lineupRowsFromPlan(gameweekId: string, plan: SquadRebuildPlan): RebuiltLineupWrite[] {
  if (!plan.canWrite) return [];
  const rows: RebuiltLineupWrite[] = [];
  for (const team of plan.teams) {
    if (team.status !== "ready") continue;
    for (const player of team.players) {
      rows.push({
        gameweekId,
        teamId: team.teamId,
        playerId: player.playerId,
        isCaptain: player.isCaptain,
        isViceCaptain: player.isViceCaptain,
        isStarting: player.isStarting,
        position: player.position,
        source: REBUILT_LINEUP_SOURCE,
      });
    }
  }
  return rows;
}

type LoadedTeam = {
  id: string;
  name: string;
  userId: string;
  user: { name: string };
  players: Array<{
    playerId: string;
    position: string;
    isCaptain: boolean;
    isViceCaptain: boolean;
    isStarting: boolean;
    createdAt: Date;
    player: { name: string; position: string };
  }>;
};

type LoadedPoint = {
  teamId: string | null;
  userId: string;
  playerId: string;
  multiplier: number;
  player: { name: string; position: string };
};

function attributePoints(teams: LoadedTeam[], points: LoadedPoint[]): Map<string, PointInput[]> {
  const teamsByUser = new Map<string, string[]>();
  for (const team of teams) {
    const list = teamsByUser.get(team.userId) ?? [];
    list.push(team.id);
    teamsByUser.set(team.userId, list);
  }

  const byTeam = new Map<string, PointInput[]>();
  for (const team of teams) byTeam.set(team.id, []);

  for (const row of points) {
    let teamId = row.teamId;
    if (!teamId) {
      const owned = teamsByUser.get(row.userId) ?? [];
      // A row with no team belongs to a manager only when they have one team.
      // Two teams leave it unattributed. It is not copied onto both.
      if (owned.length !== 1) continue;
      teamId = owned[0]!;
    }
    const list = byTeam.get(teamId);
    if (!list) continue;
    list.push({
      playerId: row.playerId,
      playerName: row.player.name,
      position: row.player.position,
      multiplier: row.multiplier,
    });
  }
  return byTeam;
}

function toTeamInput(team: LoadedTeam, points: PointInput[]): SquadRebuildTeamInput {
  const squadSavedAt = team.players.reduce<Date | null>((latest, player) => {
    if (!latest || player.createdAt > latest) return player.createdAt;
    return latest;
  }, null);
  return {
    teamId: team.id,
    teamName: team.name,
    userId: team.userId,
    userName: team.user.name,
    squadSavedAt,
    points,
    players: team.players.map((player) => ({
      playerId: player.playerId,
      playerName: player.player.name,
      position: player.position || player.player.position,
      isCaptain: player.isCaptain,
      isViceCaptain: player.isViceCaptain,
      isStarting: player.isStarting,
    })),
  };
}

export function rebuildSquadsLog(result: SquadRebuildResult, confirm: boolean): string {
  const ready = result.teams.filter((team) => team.status === "ready").length;
  const skipped = result.teams.filter((team) => team.status === "skipped").length;
  const state = result.written ? "WRITTEN" : confirm && !result.written ? "REFUSED" : "DRY RUN";
  const why = result.reason ? ` reason=${JSON.stringify(result.reason)}` : "";
  return `[rebuild-squads] ${state} confirm=${confirm} gameweek=${result.gameweek?.name ?? "none"} id=${result.gameweek?.id ?? "none"} ready=${ready} skipped=${skipped} at=${new Date().toISOString()}${why}`;
}

/**
 * Dry run unless confirm is true. Confirm claims the gameweek only while it
 * still has no lineup rows and no lineupFrozenAt, then inserts source='rebuilt'.
 */
export async function rebuildGameweekSquads(
  db: ScoringDb,
  input: { gameweekId: string; confirm: boolean },
): Promise<SquadRebuildResult> {
  const gameweek = await db.gameweek.findUnique({
    where: { id: input.gameweekId },
    select: {
      id: true,
      name: true,
      number: true,
      status: true,
      endDate: true,
      lineupFrozenAt: true,
      seasonId: true,
      season: { select: { name: true } },
      _count: { select: { lineups: true } },
    },
  });

  const base = {
    id: gameweek?.id ?? input.gameweekId,
    name: gameweek?.name ?? "",
    number: gameweek?.number ?? 0,
    seasonName: gameweek?.season.name ?? "",
    status: gameweek?.status ?? "",
    endDate: gameweek?.endDate ?? null,
    lineupFrozenAt: gameweek?.lineupFrozenAt ?? null,
    lineupCount: gameweek?._count.lineups ?? 0,
  };

  let teams: SquadRebuildTeamInput[] = [];
  if (
    gameweek
    && gameweek.status === "finished"
    && gameweek.lineupFrozenAt == null
    && gameweek._count.lineups === 0
    && instant(gameweek.endDate) != null
  ) {
    const [loadedTeams, loadedPoints] = await Promise.all([
      db.fantasyTeam.findMany({
        where: { league: { seasonId: gameweek.seasonId } },
        select: {
          id: true,
          name: true,
          userId: true,
          user: { select: { name: true } },
          players: {
            select: {
              playerId: true,
              position: true,
              isCaptain: true,
              isViceCaptain: true,
              isStarting: true,
              createdAt: true,
              player: { select: { name: true, position: true } },
            },
          },
        },
      }),
      db.fantasyPointTransaction.findMany({
        where: { gameweekId: gameweek.id },
        select: {
          teamId: true,
          userId: true,
          playerId: true,
          multiplier: true,
          player: { select: { name: true, position: true } },
        },
      }),
    ]);
    const attributed = attributePoints(loadedTeams, loadedPoints);
    teams = loadedTeams.map((team) => toTeamInput(team, attributed.get(team.id) ?? []));
  }

  const plan = planSquadRebuild({
    gameweek: gameweek ? base : null,
    teams,
  });

  if (!input.confirm || !plan.canWrite || !gameweek) {
    const result: SquadRebuildResult = {
      ...plan,
      written: false,
      reason:
        input.confirm && plan.ok && !plan.canWrite ? (plan.reason ?? ALL_SKIPPED) : plan.reason,
    };
    console.log(rebuildSquadsLog(result, input.confirm));
    return result;
  }

  const claimed = await db.gameweek.updateMany({
    where: { id: gameweek.id, lineupFrozenAt: null, lineups: { none: {} } },
    data: { lineupFrozenAt: new Date() },
  });
  if (claimed.count !== 1) {
    const result: SquadRebuildResult = {
      ...plan,
      ok: false,
      canWrite: false,
      alreadyFrozen: true,
      written: false,
      reason: ALREADY_FROZEN,
      teams: [],
    };
    console.log(rebuildSquadsLog(result, true));
    return result;
  }

  const rows = lineupRowsFromPlan(gameweek.id, plan);
  if (rows.length > 0) {
    await db.gameweekLineup.createMany({ data: rows });
  }

  const result: SquadRebuildResult = { ...plan, written: true };
  console.log(rebuildSquadsLog(result, true));
  return result;
}

import type { DisplayedGameweekCandidate } from "./gameweek";

/**
 * Whether another manager's squad may be shown on a leaderboard.
 *
 * `gameweek` must be the shared current gameweek from selectDisplayedGameweek
 * or findDisplayedGameweek. This does not choose a different week.
 * Reveal only when that gameweek is active and its deadline has passed.
 * A finished current gameweek, an upcoming week, or an active week still
 * before its deadline does not qualify. A client gameweek id is not an input.
 */

export const SQUAD_REVEAL_MESSAGE = "Squads reveal at the deadline";

export type RevealGameweek = DisplayedGameweekCandidate & {
  name?: string | null;
  deadline: Date | string;
  lineupFrozenAt?: Date | string | null;
};

export type SquadRevealDecision =
  | { reveal: true; gameweek: RevealGameweek }
  | { reveal: false; gameweek: RevealGameweek | null };

export function deadlineHasPassed(deadline: Date | string, now: Date): boolean {
  const at = deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime();
  if (Number.isNaN(at)) return false;
  return at < now.getTime();
}

export function decideSquadReveal(
  gameweek: RevealGameweek | null,
  now: Date,
): SquadRevealDecision {
  if (!gameweek || gameweek.status !== "active" || !deadlineHasPassed(gameweek.deadline, now)) {
    return { reveal: false, gameweek };
  }
  return { reveal: true, gameweek };
}

export type RevealedSquadPlayer = {
  playerId: string;
  name: string;
  position: string;
  club: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  points: number;
};

const POSITION_ORDER = ["GK", "DEF", "MID", "FWD"];

export function orderSquadPlayers<T extends { isStarting: boolean; position: string; name: string }>(
  players: T[],
): T[] {
  return [...players].sort((a, b) => {
    if (a.isStarting !== b.isStarting) return a.isStarting ? -1 : 1;
    const ai = POSITION_ORDER.indexOf(a.position);
    const bi = POSITION_ORDER.indexOf(b.position);
    const ao = ai === -1 ? POSITION_ORDER.length : ai;
    const bo = bi === -1 ? POSITION_ORDER.length : bi;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}

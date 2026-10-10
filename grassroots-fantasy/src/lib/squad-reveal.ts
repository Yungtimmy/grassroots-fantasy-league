/**
 * Whether another manager's squad may be shown on a leaderboard.
 *
 * Reveal only when a gameweek is active and its deadline has passed — the
 * same moment squad edits lock. An upcoming gameweek, a finished gameweek,
 * or an active gameweek still before its deadline does not qualify.
 * The caller must decide this from gameweeks it loaded itself. A client
 * gameweek id, deadline, or "locked" flag is not an input.
 */

export const SQUAD_REVEAL_MESSAGE = "Squads reveal at the deadline";

export type RevealGameweek = {
  id: string;
  number: number;
  name?: string | null;
  status: string;
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

export function decideSquadReveal(gameweeks: RevealGameweek[], now: Date): SquadRevealDecision {
  const active = gameweeks
    .filter((gameweek) => gameweek.status === "active")
    .sort((a, b) => a.number - b.number);
  const gameweek = active[0] ?? null;
  if (!gameweek) return { reveal: false, gameweek: null };
  if (!deadlineHasPassed(gameweek.deadline, now)) return { reveal: false, gameweek };
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

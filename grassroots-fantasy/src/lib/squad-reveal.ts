import type { DisplayedGameweekCandidate } from "./gameweek";

/**
 * Whether another manager's squad may be shown on a leaderboard.
 *
 * `gameweek` must be the shared current gameweek from selectDisplayedGameweek
 * or findDisplayedGameweek. This does not choose a different week, and a
 * client gameweek id is not an input.
 *
 * An active gameweek hides every other squad, before and after its deadline.
 * Between gameweeks, and after the last one finishes, the latest finished
 * gameweek is shown only from its frozen lineup. A missing snapshot does not
 * fall back to the live squad: managers are already editing the next week.
 */

export const SQUAD_HIDDEN_MESSAGE = "Squads are hidden while a gameweek is live";
export const SQUAD_UNAVAILABLE_MESSAGE = "Squad not available for this gameweek";

export type RevealGameweek = DisplayedGameweekCandidate & {
  name?: string | null;
  lineupFrozenAt?: Date | string | null;
};

export type SquadRevealDecision =
  | { reveal: true; gameweek: RevealGameweek }
  | { reveal: false; reason: "hidden" | "unavailable"; gameweek: RevealGameweek | null };

export function hasLineupSnapshot(gameweek: { lineupFrozenAt?: Date | string | null }): boolean {
  return gameweek.lineupFrozenAt != null;
}

export function decideSquadReveal(gameweek: RevealGameweek | null): SquadRevealDecision {
  if (!gameweek) return { reveal: false, reason: "unavailable", gameweek: null };
  if (gameweek.status === "active") return { reveal: false, reason: "hidden", gameweek };
  if (gameweek.status === "finished" && hasLineupSnapshot(gameweek)) {
    return { reveal: true, gameweek };
  }
  return { reveal: false, reason: "unavailable", gameweek };
}

export function squadGameweekLabel(gameweek: { number: number }): string {
  return `Gameweek ${gameweek.number} squad`;
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

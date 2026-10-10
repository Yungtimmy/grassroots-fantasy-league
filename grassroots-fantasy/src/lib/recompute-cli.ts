/**
 * Argument parsing for `npm run points:recompute`. Kept separate from the
 * script so a missing flag fails before any database connection.
 */

export type RecomputeArgs =
  | { ok: true; write: boolean; captureLive: boolean; gameweek?: string }
  | { ok: false; error: string };

const USAGE =
  'Usage: npm run points:recompute -- [--gameweek <name or id>] [--capture-live] [--write]';

export function parseRecomputeArgs(argv: readonly string[]): RecomputeArgs {
  const write = argv.includes("--write");
  const captureLive = argv.includes("--capture-live");
  const index = argv.indexOf("--gameweek");
  if (index === -1) return { ok: true, write, captureLive };

  const value = argv[index + 1];
  if (value === undefined || value.startsWith("--") || value.trim() === "") {
    return { ok: false, error: USAGE };
  }
  return { ok: true, write, captureLive, gameweek: value.trim() };
}

export type GameweekRef = {
  id: string;
  name: string;
  number: number;
  season: string;
};

export function resolveGameweekRef(
  gameweeks: readonly GameweekRef[],
  selector: string,
): { ok: true; gameweek: GameweekRef } | { ok: false; error: string } {
  const needle = selector.trim();
  if (!needle) return { ok: false, error: USAGE };

  const byId = gameweeks.filter((gameweek) => gameweek.id === needle);
  if (byId.length === 1) return { ok: true, gameweek: byId[0]! };

  const byName = gameweeks.filter((gameweek) => gameweek.name === needle);
  if (byName.length === 1) return { ok: true, gameweek: byName[0]! };
  if (byName.length > 1) {
    const listed = byName
      .map((gameweek) => `${gameweek.season} GW${gameweek.number} ${gameweek.id}`)
      .join(", ");
    return {
      ok: false,
      error: `More than one gameweek is named "${needle}": ${listed}. Pass the gameweek id.`,
    };
  }

  return { ok: false, error: `No gameweek with id or name "${needle}".` };
}

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ScoringDb } from "./scoring";
import { ROLE_MULTIPLIERS } from "./scoring-engine";
import {
  REBUILT_LINEUP_SOURCE,
  lineupRowsFromPlan,
  planSquadRebuild,
  rebuildGameweekSquads,
  type RebuiltLineupWrite,
  type SquadRebuildGameweekInput,
  type SquadRebuildTeamInput,
} from "./squad-rebuild";

const END = "2026-10-08T22:00:00.000Z";
const SAVED_BEFORE = "2026-10-08T18:00:00.000Z";
const SAVED_AFTER = "2026-10-09T09:00:00.000Z";

function week(overrides: Partial<SquadRebuildGameweekInput> = {}): SquadRebuildGameweekInput {
  return {
    id: "gw-12",
    name: "Gameweek 12",
    number: 12,
    seasonName: "2026",
    status: "finished",
    endDate: END,
    lineupFrozenAt: null,
    lineupCount: 0,
    ...overrides,
  };
}

function player(
  playerId: string,
  name: string,
  overrides: Partial<SquadRebuildTeamInput["players"][number]> = {},
): SquadRebuildTeamInput["players"][number] {
  return {
    playerId,
    playerName: name,
    position: "MID",
    isCaptain: false,
    isViceCaptain: false,
    isStarting: true,
    ...overrides,
  };
}

function team(overrides: Partial<SquadRebuildTeamInput> = {}): SquadRebuildTeamInput {
  return {
    teamId: "team-1",
    teamName: "Lions",
    userId: "user-1",
    userName: "Ada",
    squadSavedAt: SAVED_BEFORE,
    players: [
      player("p-cap", "Captain", { position: "FWD", isCaptain: true }),
      player("p-vice", "Vice", { position: "MID", isViceCaptain: true }),
      player("p-bench", "Bench", { position: "DEF", isStarting: false }),
      player("p-zero", "Silent", { position: "GK", isStarting: false }),
    ],
    points: [
      { playerId: "p-cap", playerName: "Captain", position: "FWD", multiplier: ROLE_MULTIPLIERS.captain },
      { playerId: "p-vice", playerName: "Vice", position: "MID", multiplier: ROLE_MULTIPLIERS.viceCaptain },
      { playerId: "p-bench", playerName: "Bench", position: "DEF", multiplier: ROLE_MULTIPLIERS.regular },
    ],
    ...overrides,
  };
}

describe("planSquadRebuild", () => {
  it("fills players who did not score from a squad saved before the gameweek ended", () => {
    const plan = planSquadRebuild({ gameweek: week(), teams: [team()] });
    assert.equal(plan.ok, true);
    assert.equal(plan.canWrite, true);
    assert.equal(plan.alreadyFrozen, false);
    const ready = plan.teams[0]!;
    assert.equal(ready.status, "ready");
    if (ready.status !== "ready") return;
    const byId = new Map(ready.players.map((row) => [row.playerId, row]));
    assert.equal(byId.get("p-cap")?.isCaptain, true);
    assert.equal(byId.get("p-cap")?.isStarting, true);
    assert.equal(byId.get("p-cap")?.filledFromCurrentSquad, false);
    assert.equal(byId.get("p-vice")?.isViceCaptain, true);
    assert.equal(byId.get("p-vice")?.filledFromCurrentSquad, false);
    assert.deepEqual(
      { starting: byId.get("p-bench")?.isStarting, filled: byId.get("p-bench")?.filledFromCurrentSquad },
      { starting: false, filled: false },
    );
    assert.equal(byId.get("p-zero")?.filledFromCurrentSquad, true);
    assert.equal(byId.get("p-zero")?.isStarting, false);
    assert.equal(byId.get("p-zero")?.position, "GK");
  });

  it("skips a squad saved after the gameweek ended and does not list its players", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [team({ squadSavedAt: SAVED_AFTER, teamName: "Edited" })],
    });
    assert.equal(plan.canWrite, false);
    assert.equal(plan.teams[0]?.status, "skipped");
    assert.match(plan.teams[0]?.reason ?? "", /saved after the gameweek ended/);
    assert.deepEqual(plan.teams[0]?.players, []);
    assert.equal(lineupRowsFromPlan("gw-12", plan).length, 0);
  });

  it("skips when there is no squad save time", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [team({ squadSavedAt: null, players: [] })],
    });
    assert.equal(plan.teams[0]?.status, "skipped");
    assert.match(plan.teams[0]?.reason ?? "", /No reliable record of when this squad was last saved/);
  });

  it("allows a squad saved at the gameweek end itself", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [team({ squadSavedAt: END })],
    });
    assert.equal(plan.teams[0]?.status, "ready");
  });

  it("skips when a scorer is not in the unchanged squad", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [
        team({
          points: [
            ...team().points,
            { playerId: "p-gone", playerName: "Departed", position: "FWD", multiplier: ROLE_MULTIPLIERS.regular },
          ],
        }),
      ],
    });
    assert.equal(plan.teams[0]?.status, "skipped");
    assert.match(plan.teams[0]?.reason ?? "", /Departed scored in this gameweek but is not in the current squad/);
  });

  it("skips when the stored captain does not match the unchanged squad", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [
        team({
          players: [
            player("p-cap", "Captain", { position: "FWD", isStarting: true }),
            player("p-vice", "Vice", { isViceCaptain: true }),
          ],
          points: [
            { playerId: "p-cap", playerName: "Captain", position: "FWD", multiplier: ROLE_MULTIPLIERS.captain },
          ],
        }),
      ],
    });
    assert.match(plan.teams[0]?.reason ?? "", /stored as captain/);
  });

  it("skips a 1x scorer the unchanged squad still marks as captain", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [
        team({
          points: [
            { playerId: "p-cap", playerName: "Captain", position: "FWD", multiplier: ROLE_MULTIPLIERS.regular },
          ],
        }),
      ],
    });
    assert.match(plan.teams[0]?.reason ?? "", /scored at 1x/);
  });

  it("skips an unknown multiplier and two stored captains", () => {
    const unknown = planSquadRebuild({
      gameweek: week(),
      teams: [
        team({
          points: [{ playerId: "p-cap", playerName: "Captain", position: "FWD", multiplier: 4 }],
        }),
      ],
    });
    assert.match(unknown.teams[0]?.reason ?? "", /multiplier 4/);

    const doubled = planSquadRebuild({
      gameweek: week(),
      teams: [
        team({
          players: [
            player("p-cap", "Captain", { isCaptain: true }),
            player("p-other", "Other", { isCaptain: true }),
          ],
          points: [
            { playerId: "p-cap", playerName: "Captain", position: "MID", multiplier: ROLE_MULTIPLIERS.captain },
            { playerId: "p-other", playerName: "Other", position: "MID", multiplier: ROLE_MULTIPLIERS.captain },
          ],
        }),
      ],
    });
    assert.match(doubled.teams[0]?.reason ?? "", /More than one player is stored as captain/);
  });

  it("refuses a gameweek that is not finished or that already has a snapshot", () => {
    const live = planSquadRebuild({ gameweek: week({ status: "active" }), teams: [team()] });
    assert.equal(live.ok, false);
    assert.equal(live.canWrite, false);
    assert.match(live.reason ?? "", /finished/);
    assert.deepEqual(live.teams, []);

    const frozen = planSquadRebuild({
      gameweek: week({ lineupFrozenAt: "2026-10-08T22:30:00.000Z" }),
      teams: [team()],
    });
    assert.equal(frozen.alreadyFrozen, true);
    assert.match(frozen.reason ?? "", /not overwritten/);

    const rows = planSquadRebuild({ gameweek: week({ lineupCount: 3 }), teams: [team()] });
    assert.equal(rows.alreadyFrozen, true);
    assert.equal(lineupRowsFromPlan("gw-12", rows).length, 0);
  });

  it("writes rebuilt rows only for ready teams", () => {
    const plan = planSquadRebuild({
      gameweek: week(),
      teams: [
        team(),
        team({
          teamId: "team-2",
          teamName: "Edited XI",
          userId: "user-2",
          userName: "Bo",
          squadSavedAt: SAVED_AFTER,
        }),
      ],
    });
    const rows = lineupRowsFromPlan("gw-12", plan);
    assert.equal(rows.length, 4);
    assert.equal(rows.every((row) => row.source === REBUILT_LINEUP_SOURCE && row.teamId === "team-1"), true);
    assert.equal(rows.some((row) => row.playerId === "p-zero" && row.isStarting === false), true);
    assert.equal(rows.some((row) => row.teamId === "team-2"), false);
  });
});

type MemoryTeam = {
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

function memoryTeam(overrides: Partial<MemoryTeam> = {}): MemoryTeam {
  return {
    id: "team-1",
    name: "Lions",
    userId: "user-1",
    user: { name: "Ada" },
    players: [
      {
        playerId: "p-cap",
        position: "FWD",
        isCaptain: true,
        isViceCaptain: false,
        isStarting: true,
        createdAt: new Date(SAVED_BEFORE),
        player: { name: "Captain", position: "MID" },
      },
      {
        playerId: "p-zero",
        position: "GK",
        isCaptain: false,
        isViceCaptain: false,
        isStarting: false,
        createdAt: new Date(SAVED_BEFORE),
        player: { name: "Silent", position: "GK" },
      },
    ],
    ...overrides,
  };
}

function memoryDb(options: {
  gameweek?: null | {
    id: string;
    name: string;
    number: number;
    status: string;
    endDate: Date;
    lineupFrozenAt: Date | null;
    seasonId: string;
    season: { name: string };
  };
  teams?: MemoryTeam[];
  points?: Array<{
    teamId: string | null;
    userId: string;
    playerId: string;
    multiplier: number;
    player: { name: string; position: string };
  }>;
}) {
  const state: {
    gameweek: NonNullable<typeof options.gameweek> | null;
    teams: MemoryTeam[];
    points: NonNullable<typeof options.points>;
    lineups: RebuiltLineupWrite[];
    teamQuery: unknown;
    pointQuery: unknown;
    updateMany: number;
    createMany: number;
  } = {
    gameweek:
      options.gameweek === null
        ? null
        : options.gameweek ?? {
            id: "gw-12",
            name: "Gameweek 12",
            number: 12,
            status: "finished",
            endDate: new Date(END),
            lineupFrozenAt: null,
            seasonId: "season-1",
            season: { name: "2026" },
          },
    teams: options.teams ?? [memoryTeam()],
    points: options.points ?? [
      {
        teamId: "team-1",
        userId: "user-1",
        playerId: "p-cap",
        multiplier: ROLE_MULTIPLIERS.captain,
        player: { name: "Captain", position: "MID" },
      },
    ],
    lineups: [],
    teamQuery: null,
    pointQuery: null,
    updateMany: 0,
    createMany: 0,
  };

  const db = {
    gameweek: {
      findUnique: async () => {
        if (!state.gameweek) return null;
        return { ...state.gameweek, _count: { lineups: state.lineups.length } };
      },
      updateMany: async () => {
        state.updateMany += 1;
        if (!state.gameweek || state.gameweek.lineupFrozenAt != null || state.lineups.length > 0) {
          return { count: 0 };
        }
        state.gameweek = { ...state.gameweek, lineupFrozenAt: new Date() };
        return { count: 1 };
      },
    },
    gameweekLineup: {
      createMany: async ({ data }: { data: RebuiltLineupWrite[] }) => {
        state.createMany += 1;
        state.lineups.push(...data);
        return { count: data.length };
      },
    },
    fantasyTeam: {
      findMany: async (args: unknown) => {
        state.teamQuery = args;
        return state.teams;
      },
    },
    fantasyPointTransaction: {
      findMany: async (args: unknown) => {
        state.pointQuery = args;
        return state.points;
      },
    },
  };

  return { state, db: db as unknown as ScoringDb };
}

describe("rebuildGameweekSquads", () => {
  it("previews without writing, then confirm writes rebuilt rows once", async () => {
    const { state, db } = memoryDb({});
    const preview = await rebuildGameweekSquads(db, { gameweekId: "gw-12", confirm: false });
    assert.equal(preview.written, false);
    assert.equal(preview.canWrite, true);
    assert.equal(state.updateMany, 0);
    assert.equal(state.createMany, 0);
    assert.equal(state.lineups.length, 0);
    const ready = preview.teams.find((row) => row.teamId === "team-1");
    assert.equal(ready?.status, "ready");
    if (ready?.status === "ready") {
      const silent = ready.players.find((row) => row.playerId === "p-zero");
      assert.equal(silent?.filledFromCurrentSquad, true);
      assert.equal(silent?.position, "GK");
    }

    const teamQuery = JSON.stringify(state.teamQuery);
    assert.equal(teamQuery.includes("updatedAt"), false);
    assert.equal(teamQuery.includes("createdAt"), true);

    const written = await rebuildGameweekSquads(db, { gameweekId: "gw-12", confirm: true });
    assert.equal(written.written, true);
    assert.equal(state.createMany, 1);
    assert.equal(state.lineups.length, 2);
    assert.equal(state.lineups.every((row) => row.source === REBUILT_LINEUP_SOURCE), true);
    assert.equal(state.gameweek?.lineupFrozenAt instanceof Date, true);

    const again = await rebuildGameweekSquads(db, { gameweekId: "gw-12", confirm: true });
    assert.equal(again.written, false);
    assert.equal(again.alreadyFrozen, true);
    assert.match(again.reason ?? "", /not overwritten/);
    assert.equal(state.createMany, 1);
    assert.equal(state.lineups.length, 2);
  });

  it("does not mark the gameweek frozen when every team is skipped", async () => {
    const { state, db } = memoryDb({
      teams: [memoryTeam({ players: [{ ...memoryTeam().players[0]!, createdAt: new Date(SAVED_AFTER) }] })],
    });
    const result = await rebuildGameweekSquads(db, { gameweekId: "gw-12", confirm: true });
    assert.equal(result.written, false);
    assert.equal(result.canWrite, false);
    assert.match(result.reason ?? "", /every team was skipped/);
    assert.equal(state.updateMany, 0);
    assert.equal(state.createMany, 0);
    assert.equal(state.gameweek?.lineupFrozenAt, null);
  });

  it("uses an unattributed point row only when the manager has one team", async () => {
    const sole = memoryDb({
      points: [
        {
          teamId: null,
          userId: "user-1",
          playerId: "p-cap",
          multiplier: ROLE_MULTIPLIERS.captain,
          player: { name: "Captain", position: "FWD" },
        },
      ],
    });
    const ok = await rebuildGameweekSquads(sole.db, { gameweekId: "gw-12", confirm: false });
    assert.equal(ok.teams[0]?.status, "ready");

    const shared = memoryDb({
      teams: [
        memoryTeam(),
        memoryTeam({
          id: "team-2",
          name: "Tigers",
          userId: "user-1",
          user: { name: "Ada" },
          players: [
            {
              playerId: "p-other",
              position: "DEF",
              isCaptain: true,
              isViceCaptain: false,
              isStarting: true,
              createdAt: new Date(SAVED_BEFORE),
              player: { name: "Other", position: "DEF" },
            },
          ],
        }),
      ],
      points: [
        {
          teamId: null,
          userId: "user-1",
          playerId: "p-cap",
          multiplier: ROLE_MULTIPLIERS.regular,
          player: { name: "Captain", position: "FWD" },
        },
      ],
    });
    const both = await rebuildGameweekSquads(shared.db, { gameweekId: "gw-12", confirm: false });
    const lions = both.teams.find((row) => row.teamId === "team-1");
    assert.equal(lions?.status, "ready");
    if (lions?.status === "ready") {
      assert.equal(lions.players.find((row) => row.playerId === "p-cap")?.isCaptain, true);
    }
  });

  it("does not load squads for a gameweek that is still active", async () => {
    const { state, db } = memoryDb({
      gameweek: {
        id: "gw-13",
        name: "Gameweek 13",
        number: 13,
        status: "active",
        endDate: new Date(END),
        lineupFrozenAt: null,
        seasonId: "season-1",
        season: { name: "2026" },
      },
    });
    const result = await rebuildGameweekSquads(db, { gameweekId: "gw-13", confirm: true });
    assert.equal(result.written, false);
    assert.match(result.reason ?? "", /finished/);
    assert.equal(state.teamQuery, null);
    assert.equal(state.updateMany, 0);
  });
});

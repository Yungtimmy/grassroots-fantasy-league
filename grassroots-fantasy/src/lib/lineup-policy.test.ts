import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessNamedGameweekFreeze,
  canSnapshotCurrentSquads,
  liveLineupGameweekId,
  planSeasonRecompute,
  type NamedFreezeGameweek,
  type SquadSaveStamp,
} from "./lineup-policy";

describe("live lineup", () => {
  it("keeps the earliest open gameweek when a later one is already upcoming", () => {
    const gameweeks = [
      { id: "gw1", number: 1, status: "active" },
      { id: "gw2", number: 2, status: "upcoming" },
    ];
    assert.equal(liveLineupGameweekId(gameweeks), "gw1");
    assert.equal(canSnapshotCurrentSquads("gw1", gameweeks), true);
    assert.equal(canSnapshotCurrentSquads("gw2", gameweeks), false);
  });

  it("moves to the next gameweek once the previous one is finished", () => {
    const gameweeks = [
      { id: "gw1", number: 1, status: "finished" },
      { id: "gw2", number: 2, status: "upcoming" },
    ];
    assert.equal(liveLineupGameweekId(gameweeks), "gw2");
    assert.equal(canSnapshotCurrentSquads("gw1", gameweeks), false);
    assert.equal(canSnapshotCurrentSquads("gw2", gameweeks), true);
  });

  it("has no live lineup when every gameweek is finished", () => {
    const gameweeks = [
      { id: "gw1", number: 1, status: "finished" },
      { id: "gw2", number: 2, status: "finished" },
    ];
    assert.equal(liveLineupGameweekId(gameweeks), null);
    assert.equal(canSnapshotCurrentSquads("gw1", gameweeks), false);
  });

  it("snapshots the only upcoming gameweek", () => {
    const gameweeks = [{ id: "gw1", number: 1, status: "upcoming" }];
    assert.equal(liveLineupGameweekId(gameweeks), "gw1");
    assert.equal(canSnapshotCurrentSquads("gw1", gameweeks), true);
  });
});

describe("recompute script", () => {
  it("skips a gameweek that has no lineup snapshot", () => {
    const plan = planSeasonRecompute([
      { id: "gw1", number: 1, status: "finished", lineupFrozenAt: null },
      { id: "gw2", number: 2, status: "upcoming", lineupFrozenAt: null },
    ]);

    assert.deepEqual(plan.recomputeIds, []);
    assert.equal(plan.captureLiveId, null);
    assert.equal(plan.skipped.length, 2);
    assert.match(plan.skipped[0]?.reason ?? "", /skipped/i);
    assert.equal(plan.skipped[0]?.isLive, false);
    assert.match(plan.skipped[1]?.reason ?? "", /--capture-live/);
    assert.equal(plan.skipped[1]?.isLive, true);
  });

  it("scores a frozen gameweek and still skips one without a snapshot", () => {
    const plan = planSeasonRecompute([
      { id: "gw1", number: 1, status: "finished", lineupFrozenAt: "2026-10-01T00:00:00.000Z" },
      { id: "gw2", number: 2, status: "finished", lineupFrozenAt: null },
    ]);

    assert.deepEqual(plan.recomputeIds, ["gw1"]);
    assert.deepEqual(plan.skipped.map((gameweek) => gameweek.id), ["gw2"]);
    assert.match(plan.skipped[0]?.reason ?? "", /No lineup snapshot/);
  });

  it("captures only the live gameweek when asked, and still skips the rest", () => {
    const plan = planSeasonRecompute(
      [
        { id: "gw1", number: 1, status: "finished", lineupFrozenAt: null },
        { id: "gw2", number: 2, status: "active", lineupFrozenAt: null },
      ],
      { captureLive: true },
    );

    assert.equal(plan.captureLiveId, "gw2");
    assert.deepEqual(plan.recomputeIds, ["gw2"]);
    assert.deepEqual(plan.skipped.map((gameweek) => gameweek.id), ["gw1"]);
  });

  it("rebuilds only the requested gameweek and leaves the others out", () => {
    const plan = planSeasonRecompute(
      [
        { id: "gw1", number: 1, status: "finished", lineupFrozenAt: "2026-10-01T00:00:00.000Z" },
        { id: "gw2", number: 2, status: "active", lineupFrozenAt: "2026-10-08T00:00:00.000Z" },
      ],
      { onlyGameweekId: "gw1" },
    );

    assert.deepEqual(plan.recomputeIds, ["gw1"]);
    assert.deepEqual(plan.skipped, []);
    assert.equal(plan.captureLiveId, null);
  });

  it("does not capture a different live week when one gameweek is requested", () => {
    const plan = planSeasonRecompute(
      [
        { id: "gw1", number: 1, status: "finished", lineupFrozenAt: null },
        { id: "gw2", number: 2, status: "active", lineupFrozenAt: null },
      ],
      { captureLive: true, onlyGameweekId: "gw1" },
    );

    assert.deepEqual(plan.recomputeIds, []);
    assert.equal(plan.captureLiveId, null);
    assert.deepEqual(plan.skipped.map((gameweek) => gameweek.id), ["gw1"]);
    assert.equal(plan.skipped[0]?.isLive, false);
  });

  it("captures the requested week only when that week is the live one", () => {
    const plan = planSeasonRecompute(
      [
        { id: "gw1", number: 1, status: "finished", lineupFrozenAt: "2026-10-01T00:00:00.000Z" },
        { id: "gw2", number: 2, status: "active", lineupFrozenAt: null },
      ],
      { captureLive: true, onlyGameweekId: "gw2" },
    );

    assert.equal(plan.captureLiveId, "gw2");
    assert.deepEqual(plan.recomputeIds, ["gw2"]);
    assert.deepEqual(plan.skipped, []);
  });
});

function namedGameweek(partial: Partial<NamedFreezeGameweek> & Pick<NamedFreezeGameweek, "id" | "number" | "status">): NamedFreezeGameweek {
  return {
    seasonId: "season",
    seasonName: "2026",
    name: partial.name ?? `Week ${partial.number}`,
    deadline: "2026-10-01T18:00:00.000Z",
    lineupFrozenAt: null,
    lineupCount: 0,
    ...partial,
  };
}

function squad(partial: Partial<SquadSaveStamp> = {}): SquadSaveStamp {
  return {
    seasonId: "season",
    teamId: "team-1",
    teamName: "Lions",
    squadSavedAt: "2026-09-30T12:00:00.000Z",
    teamUpdatedAt: "2026-09-30T12:00:00.000Z",
    ...partial,
  };
}

const now = new Date("2026-10-10T12:00:00.000Z");

describe("named gameweek freeze", () => {
  it("allows a finished gameweek when no later gameweek exists and squads were saved before the deadline", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [squad()],
      now,
    });

    assert.equal(result.ok, true);
    assert.equal(result.gameweekId, "gw1");
    assert.deepEqual(result.reasons, []);
    assert.ok(result.unverified.some((line) => /does not record that the lock stayed on/i.test(line)));
  });

  it("allows a later gameweek that is still upcoming and before its deadline when squads are unchanged", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [
        namedGameweek({ id: "gw1", number: 1, status: "finished" }),
        namedGameweek({
          id: "gw2",
          number: 2,
          name: "Week 2",
          status: "upcoming",
          deadline: "2026-10-20T18:00:00.000Z",
        }),
      ],
      squads: [squad()],
      now,
    });

    assert.equal(result.ok, true);
  });

  it("refuses when this gameweek's deadline has not passed", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({
        id: "gw1",
        number: 1,
        status: "finished",
        deadline: "2026-10-10T18:00:00.000Z",
      })],
      squads: [squad({ squadSavedAt: "2026-10-09T12:00:00.000Z" })],
      now,
    });

    assert.equal(result.ok, false);
    assert.match(result.reasons.join(" "), /deadline has not passed/);
  });

  it("refuses when a snapshot already exists", () => {
    const frozen = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({
        id: "gw1",
        number: 1,
        status: "finished",
        lineupFrozenAt: "2026-10-02T00:00:00.000Z",
      })],
      squads: [squad()],
      now,
    });
    assert.equal(frozen.ok, false);
    assert.match(frozen.reasons.join(" "), /snapshot already exists/);

    const rows = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished", lineupCount: 3 })],
      squads: [squad()],
      now,
    });
    assert.equal(rows.ok, false);
    assert.match(rows.reasons.join(" "), /snapshot already exists/);
  });

  it("refuses when a later gameweek has opened or its deadline has passed", () => {
    const opened = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [
        namedGameweek({ id: "gw1", number: 1, status: "finished" }),
        namedGameweek({ id: "gw2", number: 2, name: "Week 2", status: "active" }),
      ],
      squads: [squad()],
      now,
    });
    assert.equal(opened.ok, false);
    assert.match(opened.reasons.join(" "), /has opened/);

    const passed = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [
        namedGameweek({ id: "gw1", number: 1, status: "finished" }),
        namedGameweek({
          id: "gw2",
          number: 2,
          name: "Week 2",
          status: "upcoming",
          deadline: "2026-10-05T18:00:00.000Z",
        }),
      ],
      squads: [squad()],
      now,
    });
    assert.equal(passed.ok, false);
    assert.match(passed.reasons.join(" "), /deadline has passed/);
  });

  it("refuses when a squad was saved after the deadline", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [squad({ squadSavedAt: "2026-10-03T12:00:00.000Z" })],
      now,
    });

    assert.equal(result.ok, false);
    assert.match(result.reasons.join(" "), /after the deadline/);
  });

  it("refuses an empty team updated after the deadline", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [squad({ squadSavedAt: null, teamUpdatedAt: "2026-10-03T12:00:00.000Z" })],
      now,
    });

    assert.equal(result.ok, false);
    assert.match(result.reasons.join(" "), /wiped squad/);
  });

  it("ignores a squad saved later in a different season", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [squad({ seasonId: "other", squadSavedAt: "2026-10-09T00:00:00.000Z" })],
      now,
    });

    assert.equal(result.ok, true);
  });

  it("allows a squad saved at the deadline itself", () => {
    const result = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [squad({ squadSavedAt: "2026-10-01T18:00:00.000Z" })],
      now,
    });

    assert.equal(result.ok, true);
  });

  it("refuses an unknown or ambiguous name", () => {
    const missing = assessNamedGameweekFreeze({
      gameweekName: "Week 9",
      gameweeks: [namedGameweek({ id: "gw1", number: 1, status: "finished" })],
      squads: [],
      now,
    });
    assert.equal(missing.ok, false);
    assert.match(missing.reasons.join(" "), /No gameweek named/);

    const ambiguous = assessNamedGameweekFreeze({
      gameweekName: "Week 1",
      gameweeks: [
        namedGameweek({ id: "gw1", number: 1, status: "finished", seasonId: "a", seasonName: "2026" }),
        namedGameweek({ id: "gw9", number: 1, status: "finished", seasonId: "b", seasonName: "2025" }),
      ],
      squads: [],
      now,
    });
    assert.equal(ambiguous.ok, false);
    assert.match(ambiguous.reasons.join(" "), /More than one gameweek/);
  });
});

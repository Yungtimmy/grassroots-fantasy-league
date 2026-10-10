import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canSnapshotCurrentSquads,
  liveLineupGameweekId,
  planSeasonRecompute,
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
});

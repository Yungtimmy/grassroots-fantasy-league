import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_SCORING_RULES,
  ROLE_MULTIPLIERS,
  awardsForSquad,
  badgesForUser,
  emptyLedger,
  rebuildSeason,
  replaceGameweek,
  roleMultiplier,
  rulesFromRows,
  scoreGameweek,
  scoreMatchStat,
  sumPoints,
  type MatchStatInput,
  type PlayerAward,
  type SquadSlot,
} from "./scoring-engine";

function stat(partial: Partial<MatchStatInput> & Pick<MatchStatInput, "playerId" | "position">): MatchStatInput {
  return {
    matchId: partial.matchId ?? "m1",
    playerId: partial.playerId,
    position: partial.position,
    minutes: partial.minutes ?? 0,
    goals: partial.goals ?? 0,
    assists: partial.assists ?? 0,
    cleanSheet: partial.cleanSheet ?? false,
    saves: partial.saves ?? 0,
    yellowCards: partial.yellowCards ?? 0,
    redCards: partial.redCards ?? 0,
    ownGoals: partial.ownGoals ?? 0,
    penaltyMiss: partial.penaltyMiss ?? 0,
    penaltySave: partial.penaltySave ?? 0,
    goalsConceded: partial.goalsConceded ?? 0,
  };
}

function slot(partial: Partial<SquadSlot> & Pick<SquadSlot, "userId" | "playerId">): SquadSlot {
  return {
    userId: partial.userId,
    teamId: partial.teamId ?? partial.userId,
    playerId: partial.playerId,
    isStarting: partial.isStarting ?? true,
    isCaptain: partial.isCaptain ?? false,
    isViceCaptain: partial.isViceCaptain ?? false,
  };
}

function totalFor(awards: PlayerAward[], userId: string): number {
  return awards.filter((award) => award.userId === userId).reduce((sum, award) => sum + award.totalPoints, 0);
}

describe("role multipliers", () => {
  it("keeps captain at 3x and vice-captain at 2x in one config", () => {
    assert.equal(ROLE_MULTIPLIERS.captain, 3);
    assert.equal(ROLE_MULTIPLIERS.viceCaptain, 2);
    assert.equal(ROLE_MULTIPLIERS.regular, 1);
    assert.equal(roleMultiplier(true, false), 3);
    assert.equal(roleMultiplier(false, true), 2);
    assert.equal(roleMultiplier(false, false), 1);
    assert.equal(roleMultiplier(true, true), 3);
  });
});

describe("reference case", () => {
  it("scores Abdul's captain line at 42 and drops the bench +1, so 50 becomes 49", () => {
    const awards = awardsForSquad("gw1", [
      { ...slot({ userId: "manager", playerId: "abdul", isCaptain: true }), basePoints: 14, eventType: "ABDUL" },
      { ...slot({ userId: "manager", playerId: "seven" }), basePoints: 7 },
      { ...slot({ userId: "manager", playerId: "one" }), basePoints: 1 },
      { ...slot({ userId: "manager", playerId: "yellow" }), basePoints: -1 },
      { ...slot({ userId: "manager", playerId: "bench", isStarting: false }), basePoints: 1 },
    ]);

    const abdul = awards.find((award) => award.playerId === "abdul");
    assert.ok(abdul);
    assert.equal(abdul.basePoints, 14);
    assert.equal(abdul.multiplier, 3);
    assert.equal(abdul.totalPoints, 42);
    assert.equal(awards.some((award) => award.playerId === "bench"), false);
    assert.equal(totalFor(awards, "manager"), 49);
  });
});

describe("appearance re-save", () => {
  const other = stat({ playerId: "other", position: "MID", matchId: "m1", minutes: 90, assists: 1 });
  const squad = [
    slot({ userId: "regular", playerId: "edited" }),
    slot({ userId: "regular", playerId: "other" }),
    slot({ userId: "captain", playerId: "edited", isCaptain: true }),
    slot({ userId: "vice", playerId: "edited", isViceCaptain: true }),
  ];

  function score(edited: MatchStatInput) {
    return scoreGameweek({ gameweekId: "gw", stats: [edited, other], squad });
  }

  it("adds appearance once, then a second save does not add it again", () => {
    const forgotten = stat({ playerId: "edited", position: "FWD", minutes: 0, goals: 1 });
    const corrected = stat({ playerId: "edited", position: "FWD", minutes: 90, goals: 1 });

    const first = score(forgotten);
    let ledger = replaceGameweek(emptyLedger(), "gw", first.awards, first.playerBases);
    const x = ledger.teamTotals.regular;
    const otherBefore = first.awards.find((award) => award.userId === "regular" && award.playerId === "other");
    assert.ok(otherBefore);

    const second = score(corrected);
    ledger = replaceGameweek(ledger, "gw", second.awards, second.playerBases);
    assert.equal(ledger.teamTotals.regular, x + DEFAULT_SCORING_RULES.appearance);
    assert.equal(ledger.teamTotals.regular, x + 2);

    const otherAfter = second.awards.find((award) => award.userId === "regular" && award.playerId === "other");
    assert.equal(otherAfter?.totalPoints, otherBefore.totalPoints);
    assert.equal(otherAfter?.basePoints, otherBefore.basePoints);

    const captainBefore = totalFor(first.awards, "captain");
    const viceBefore = totalFor(first.awards, "vice");
    assert.equal(ledger.teamTotals.captain, captainBefore + 6);
    assert.equal(ledger.teamTotals.vice, viceBefore + 4);

    const third = score(corrected);
    ledger = replaceGameweek(ledger, "gw", third.awards, third.playerBases);
    assert.equal(ledger.teamTotals.regular, x + 2);
    assert.equal(ledger.teamTotals.captain, captainBefore + 6);
    assert.equal(ledger.teamTotals.vice, viceBefore + 4);
    assert.equal(ledger.playerTotals.edited, second.playerBases.edited);
    assert.equal(ledger.playerTotals.other, first.playerBases.other);
  });
});

describe("idempotent overall", () => {
  it("saving twice without changes leaves Overall unchanged", () => {
    const scored = scoreGameweek({
      gameweekId: "gw",
      stats: [stat({ playerId: "p", position: "FWD", minutes: 90, goals: 1 })],
      squad: [slot({ userId: "manager", playerId: "p", isCaptain: true })],
    });

    let ledger = replaceGameweek(emptyLedger(), "gw", scored.awards, scored.playerBases);
    const overall = ledger.teamTotals.manager;
    ledger = replaceGameweek(ledger, "gw", scored.awards, scored.playerBases);
    assert.equal(ledger.teamTotals.manager, overall);
    assert.equal(ledger.playerTotals.p, scored.playerBases.p);
    assert.equal(ledger.transactions.length, 1);
  });

  it("re-saving one gameweek does not disturb another gameweek's Overall", () => {
    const squad = [slot({ userId: "manager", playerId: "p" })];
    const gw1 = scoreGameweek({
      gameweekId: "gw1",
      stats: [stat({ playerId: "p", position: "FWD", minutes: 90, goals: 1 })],
      squad,
    });
    const gw2 = scoreGameweek({
      gameweekId: "gw2",
      stats: [stat({ playerId: "p", position: "FWD", matchId: "m2", minutes: 90 })],
      squad,
    });

    let ledger = replaceGameweek(emptyLedger(), "gw1", gw1.awards, gw1.playerBases);
    ledger = replaceGameweek(ledger, "gw2", gw2.awards, {
      p: gw1.playerBases.p + gw2.playerBases.p,
    });
    const overall = ledger.teamTotals.manager;
    ledger = replaceGameweek(ledger, "gw2", gw2.awards, {
      p: gw1.playerBases.p + gw2.playerBases.p,
    });
    assert.equal(ledger.teamTotals.manager, overall);
    assert.equal(ledger.playerTotals.p, gw1.playerBases.p + gw2.playerBases.p);
  });
});

describe("editing a stat down", () => {
  it("lowers the total from two goals to one goal", () => {
    const squad = [slot({ userId: "manager", playerId: "p" })];
    const twoGoals = scoreGameweek({
      gameweekId: "gw",
      stats: [stat({ playerId: "p", position: "FWD", minutes: 90, goals: 2 })],
      squad,
    });
    const oneGoal = scoreGameweek({
      gameweekId: "gw",
      stats: [stat({ playerId: "p", position: "FWD", minutes: 90, goals: 1 })],
      squad,
    });

    let ledger = replaceGameweek(emptyLedger(), "gw", twoGoals.awards, twoGoals.playerBases);
    const before = ledger.teamTotals.manager;
    ledger = replaceGameweek(ledger, "gw", oneGoal.awards, oneGoal.playerBases);
    assert.ok(ledger.teamTotals.manager < before);
    assert.equal(ledger.teamTotals.manager, oneGoal.playerBases.p);
    assert.equal(ledger.playerTotals.p, oneGoal.playerBases.p);
    assert.equal(twoGoals.playerBases.p - oneGoal.playerBases.p, DEFAULT_SCORING_RULES.goal.FWD);
  });
});

describe("two matches in one gameweek", () => {
  it("adds both matches and does not replace the first with the second", () => {
    const squad = [slot({ userId: "manager", playerId: "p", isCaptain: true })];
    const firstMatch = stat({ playerId: "p", position: "FWD", matchId: "m1", minutes: 90 });
    const secondMatch = stat({ playerId: "p", position: "FWD", matchId: "m2", minutes: 90, goals: 1 });
    const scored = scoreGameweek({ gameweekId: "gw", stats: [firstMatch, secondMatch], squad });

    const firstPoints = scoreMatchStat(firstMatch).points;
    const secondPoints = scoreMatchStat(secondMatch).points;
    assert.equal(scored.playerBases.p, firstPoints + secondPoints);
    assert.notEqual(scored.playerBases.p, secondPoints);

    const award = scored.awards.find((row) => row.userId === "manager");
    assert.ok(award);
    assert.equal(award.basePoints, firstPoints + secondPoints);
    assert.equal(award.totalPoints, (firstPoints + secondPoints) * ROLE_MULTIPLIERS.captain);

    let ledger = replaceGameweek(emptyLedger(), "gw", scored.awards, scored.playerBases);
    ledger = replaceGameweek(ledger, "gw", scored.awards, scored.playerBases);
    assert.equal(ledger.teamTotals.manager, award.totalPoints);
    assert.equal(ledger.transactions.length, 1);
  });
});

describe("bench", () => {
  it("never counts a substitute toward the total", () => {
    const scored = scoreGameweek({
      gameweekId: "gw",
      stats: [
        stat({ playerId: "starter", position: "FWD", minutes: 90, goals: 1 }),
        stat({ playerId: "bench", position: "FWD", minutes: 90, goals: 1 }),
      ],
      squad: [
        slot({ userId: "manager", playerId: "starter" }),
        slot({ userId: "manager", playerId: "bench", isStarting: false, isCaptain: true }),
      ],
    });

    assert.equal(scored.awards.some((award) => award.playerId === "bench"), false);
    assert.equal(totalFor(scored.awards, "manager"), scored.playerBases.starter);
    assert.ok(scored.playerBases.bench > 0);
  });
});

describe("clean sheet at 0 minutes", () => {
  it("does not award a clean sheet or goals conceded when the player did not play", () => {
    const unused = scoreMatchStat(stat({
      playerId: "gk",
      position: "GK",
      minutes: 0,
      cleanSheet: true,
      goalsConceded: 3,
    }));
    assert.equal(unused.points, 0);
    assert.equal(unused.events.includes("CLEAN_SHEET"), false);
    assert.equal(unused.events.some((event) => event.startsWith("GOAL_CONCEDED")), false);

    const defender = scoreMatchStat(stat({
      playerId: "def",
      position: "DEF",
      minutes: 0,
      cleanSheet: true,
    }));
    assert.equal(defender.points, 0);

    const played = scoreMatchStat(stat({
      playerId: "def",
      position: "DEF",
      minutes: 90,
      cleanSheet: true,
    }));
    assert.equal(played.points, DEFAULT_SCORING_RULES.appearance + DEFAULT_SCORING_RULES.cleanSheet.DEF);
    assert.equal(played.events.includes("CLEAN_SHEET"), true);
  });
});

describe("per-user badges", () => {
  it("shows +42, +28 and +14 for the same base of 14", () => {
    const awards = awardsForSquad("gw", [
      { ...slot({ userId: "captain", playerId: "abdul", isCaptain: true }), basePoints: 14 },
      { ...slot({ userId: "vice", playerId: "abdul", isViceCaptain: true }), basePoints: 14 },
      { ...slot({ userId: "regular", playerId: "abdul" }), basePoints: 14 },
    ]);

    assert.deepEqual(badgesForUser(awards, "captain"), { abdul: 42 });
    assert.deepEqual(badgesForUser(awards, "vice"), { abdul: 28 });
    assert.deepEqual(badgesForUser(awards, "regular"), { abdul: 14 });

    assert.equal(sumPoints(badgesForUser(awards, "captain")), totalFor(awards, "captain"));
    assert.equal(sumPoints(badgesForUser(awards, "vice")), totalFor(awards, "vice"));
    assert.equal(sumPoints(badgesForUser(awards, "regular")), totalFor(awards, "regular"));
    assert.notEqual(badgesForUser(awards, "regular").abdul, badgesForUser(awards, "captain").abdul);
  });

  it("keeps both multipliers when the captain and the vice-captain both play", () => {
    const awards = awardsForSquad("gw", [
      { ...slot({ userId: "captain", playerId: "abdul", isCaptain: true }), basePoints: 14 },
      { ...slot({ userId: "vice", playerId: "abdul", isViceCaptain: true }), basePoints: 14 },
    ]);
    assert.equal(awards.find((award) => award.userId === "captain")?.multiplier, 3);
    assert.equal(awards.find((award) => award.userId === "vice")?.multiplier, 2);

    const viceOnly = awardsForSquad("gw", [
      { ...slot({ userId: "captain", playerId: "abdul", isCaptain: true }), basePoints: 0 },
      { ...slot({ userId: "vice", playerId: "other", isViceCaptain: true }), basePoints: 4 },
    ]);
    assert.equal(viceOnly.find((award) => award.userId === "vice")?.multiplier, 2);
    assert.equal(viceOnly.find((award) => award.userId === "vice")?.totalPoints, 8);
    assert.equal(viceOnly.some((award) => award.userId === "captain"), false);
  });
});

describe("penalty columns", () => {
  it("counts a scored penalty as a goal only, PS as +5, and PM as a miss", () => {
    const scoredPenalty = scoreMatchStat(stat({
      playerId: "fwd",
      position: "FWD",
      minutes: 90,
      goals: 1,
    }));
    assert.equal(scoredPenalty.points, DEFAULT_SCORING_RULES.appearance + DEFAULT_SCORING_RULES.goal.FWD);
    assert.deepEqual(scoredPenalty.events, ["APPEARANCE", "GOALx1"]);

    const saved = scoreMatchStat(stat({
      playerId: "gk",
      position: "GK",
      minutes: 90,
      penaltySave: 1,
    }));
    assert.equal(saved.points, DEFAULT_SCORING_RULES.appearance + 5);

    const outfieldSave = scoreMatchStat(stat({
      playerId: "def",
      position: "DEF",
      minutes: 90,
      penaltySave: 1,
    }));
    assert.equal(outfieldSave.points, DEFAULT_SCORING_RULES.appearance);

    const missed = scoreMatchStat(stat({
      playerId: "fwd",
      position: "FWD",
      minutes: 90,
      penaltyMiss: 1,
    }));
    assert.equal(missed.points, DEFAULT_SCORING_RULES.appearance + DEFAULT_SCORING_RULES.penaltyMiss);
    assert.equal(missed.events.includes("PENALTY_MISSx1"), true);
  });

  it("does not award goalkeeper saves even when a SAVE rule is present", () => {
    const rules = rulesFromRows([
      { event: "APPEARANCE", position: null, points: 1 },
      { event: "SAVE", position: "GK", points: 1 },
    ]);
    const scored = scoreMatchStat(stat({
      playerId: "gk",
      position: "GK",
      minutes: 30,
      saves: 6,
    }), rules);
    assert.equal(scored.points, 1);
  });
});

describe("rebuildSeason", () => {
  it("returns the same overall when the same stats are rebuilt twice", () => {
    const squad = [
      slot({ userId: "manager", playerId: "p", isCaptain: true }),
      slot({ userId: "manager", playerId: "bench", isStarting: false }),
    ];
    const gameweeks = [
      {
        gameweekId: "gw1",
        squad,
        stats: [
          stat({ playerId: "p", position: "FWD", minutes: 90, goals: 2 }),
          stat({ playerId: "bench", position: "FWD", minutes: 90 }),
        ],
      },
      {
        gameweekId: "gw2",
        squad,
        stats: [
          stat({ playerId: "p", position: "FWD", matchId: "a", minutes: 90 }),
          stat({ playerId: "p", position: "FWD", matchId: "b", minutes: 90, goals: 1 }),
        ],
      },
    ];

    const once = rebuildSeason(gameweeks);
    const twice = rebuildSeason(gameweeks);
    assert.equal(twice.teamTotals.manager, once.teamTotals.manager);
    assert.equal(twice.playerTotals.p, once.playerTotals.p);
    assert.equal(once.playerTotals.bench, DEFAULT_SCORING_RULES.appearance);
    assert.equal(once.transactions.some((txn) => txn.playerId === "bench"), false);
  });
});

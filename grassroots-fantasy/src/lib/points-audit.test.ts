import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assignTeamId,
  auditStoredRow,
  classifyPointRatio,
  legacyMatchBase,
  summarizeTeamAudit,
} from "./points-audit";

describe("point ratio classifier", () => {
  it("classifies an exact last-save multiplier as x1, x2, or x3", () => {
    assert.deepEqual(classifyPointRatio(14, 14), { ratio: 1, classification: "x1" });
    assert.deepEqual(classifyPointRatio(28, 14), { ratio: 2, classification: "x2" });
    assert.deepEqual(classifyPointRatio(42, 14), { ratio: 3, classification: "x3" });
    assert.deepEqual(classifyPointRatio(-6, -2), { ratio: 3, classification: "x3" });
  });

  it("does not treat a 2x row as a duplicated x1", () => {
    const row = auditStoredRow({ storedPoints: 28, matchBases: [14] });
    assert.equal(row.classification, "x2");
    assert.equal(row.ratio, 2);
    assert.equal(row.recomputedBase, 14);
  });

  it("leaves a ratio other than 1, 2, or 3 unexplained", () => {
    const doubledAgain = classifyPointRatio(56, 14);
    assert.equal(doubledAgain.classification, "unexplained");
    assert.equal(doubledAgain.ratio, 4);

    const notIntegral = classifyPointRatio(15, 7);
    assert.equal(notIntegral.classification, "unexplained");

    const zero = auditStoredRow({ storedPoints: 0, matchBases: [0] });
    assert.equal(zero.classification, "unexplained");
    assert.equal(zero.ratio, null);
  });

  it("uses the last match's multiplier when two matches share a base", () => {
    const row = auditStoredRow({ storedPoints: 42, matchBases: [14, 14] });
    assert.equal(row.classification, "x3");
    assert.equal(row.recomputedBase, 14);
    assert.equal(row.fullGameweekBase, 28);
    assert.match(row.note ?? "", /last match/);
  });

  it("does not pick a multiplier when two matches support different ones", () => {
    const row = auditStoredRow({ storedPoints: 20, matchBases: [10, 20] });
    assert.equal(row.classification, "unexplained");
    assert.match(row.note ?? "", /cannot be told apart/);
  });

  it("recomputes a match with the pre-fix formula", () => {
    assert.equal(legacyMatchBase({
      minutes: 90,
      goals: 2,
      assists: 0,
      cleanSheet: false,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
      penaltySave: 0,
      goalsConceded: 0,
      position: "MID",
    }), 13);

    assert.equal(legacyMatchBase({
      minutes: 0,
      goals: 0,
      assists: 0,
      cleanSheet: true,
      yellowCards: 0,
      redCards: 0,
      ownGoals: 0,
      penaltySave: 0,
      goalsConceded: 0,
      position: "DEF",
    }), 4);
  });
});

describe("team inflation", () => {
  it("puts repeated saves in the gap between the team total and the sum of rows", () => {
    const summary = summarizeTeamAudit({
      teamId: "team-1",
      storedTotal: 70,
      rows: [
        { id: "captain", teamId: "team-1", storedPoints: 28, classification: "x2", audited: true },
        { id: "regular", teamId: "team-1", storedPoints: 14, classification: "x1", audited: true },
      ],
    });

    assert.equal(summary.sumOfRows, 42);
    assert.equal(summary.inflationGap, 28);
    assert.equal(summary.bestSupportedCorrected, 42);
    assert.deepEqual(summary.unresolvedRowIds, []);
  });

  it("keeps an unexplained row out of the best-supported total and flags it", () => {
    const summary = summarizeTeamAudit({
      teamId: "team-1",
      storedTotal: 100,
      rows: [
        { id: "ok", teamId: "team-1", storedPoints: 42, classification: "x3", audited: true },
        { id: "also-ok", teamId: "team-1", storedPoints: 14, classification: "x1", audited: true },
        { id: "odd", teamId: "team-1", storedPoints: 10, classification: "unexplained", audited: true },
        { id: "other-gw", teamId: "team-1", storedPoints: 5, classification: "x1", audited: false },
      ],
    });

    assert.equal(summary.sumOfRows, 71);
    assert.equal(summary.inflationGap, 29);
    assert.equal(summary.bestSupportedCorrected, 61);
    assert.deepEqual(summary.unresolvedRowIds, ["odd"]);
  });

  it("does not attach a teamless row to a manager with two teams", () => {
    const teams = [
      { teamId: "uni", userId: "manager" },
      { teamId: "national", userId: "manager" },
    ];
    assert.equal(assignTeamId({ teamId: null, userId: "manager" }, teams), null);
    assert.equal(assignTeamId({ teamId: null, userId: "solo" }, [{ teamId: "only", userId: "solo" }]), "only");
    assert.equal(assignTeamId({ teamId: "uni", userId: "manager" }, teams), "uni");
  });
});

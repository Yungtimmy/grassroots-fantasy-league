import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertDirectSchemaUrl,
  assertTestDatabase,
  DATABASE_URL_ENV_VARS,
  identifySupabaseProject,
  TestDatabaseGuardError,
  TEST_SUPABASE_PROJECT_REF,
} from "../src/lib/test-db-guard";
import { assertSeedPlan, buildSeedPlan, playerByKey, usedBudget, FANTASY_BUDGET } from "../scripts/testdb-data";

const REF = TEST_SUPABASE_PROJECT_REF;
const POOLER = (ref: string) =>
  `postgresql://postgres.${ref}:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
const DIRECT = (ref: string) =>
  `postgresql://postgres:secret@db.${ref}.supabase.co:5432/postgres`;

describe("test database guard", () => {
  it("checks DATABASE_URL and DIRECT_URL", () => {
    assert.deepEqual([...DATABASE_URL_ENV_VARS], ["DATABASE_URL", "DIRECT_URL"]);
  });

  it("allows the test project on the pooler username and the direct host", () => {
    const result = assertTestDatabase({
      DATABASE_URL: POOLER(REF),
      DIRECT_URL: DIRECT(REF),
    });
    assert.equal(result.databaseUrl, POOLER(REF));
    assert.equal(result.directUrl, DIRECT(REF));
  });

  it("allows a missing DIRECT_URL when DATABASE_URL is the test project", () => {
    const result = assertTestDatabase({ DATABASE_URL: DIRECT(REF) });
    assert.equal(result.directUrl, null);
  });

  it("treats a blank DIRECT_URL as unset", () => {
    const result = assertTestDatabase({
      DATABASE_URL: `  "${DIRECT(REF)}"  `,
      DIRECT_URL: "   ",
    });
    assert.equal(result.databaseUrl, DIRECT(REF));
    assert.equal(result.directUrl, null);
  });

  it("refuses when DATABASE_URL is missing", () => {
    assert.throws(
      () => assertTestDatabase({}),
      (error: unknown) => {
        assert.ok(error instanceof TestDatabaseGuardError);
        assert.match(error.message, /DATABASE_URL is not set/);
        assert.match(error.message, /Nothing was written/);
        return true;
      }
    );
  });

  it("refuses when DATABASE_URL is a different Supabase project", () => {
    assert.throws(
      () => assertTestDatabase({ DATABASE_URL: POOLER("otherprojectref") }),
      (error: unknown) => {
        assert.ok(error instanceof TestDatabaseGuardError);
        assert.match(error.message, /otherprojectref/);
        assert.equal(error.message.includes("secret"), false);
        return true;
      }
    );
  });

  it("refuses when DIRECT_URL points elsewhere even if DATABASE_URL is the test project", () => {
    assert.throws(
      () =>
        assertTestDatabase({
          DATABASE_URL: POOLER(REF),
          DIRECT_URL: DIRECT("prodprojectref"),
        }),
      (error: unknown) => {
        assert.ok(error instanceof TestDatabaseGuardError);
        assert.match(error.message, /DIRECT_URL/);
        assert.match(error.message, /prodprojectref/);
        return true;
      }
    );
  });

  it("refuses a URL that only hides the test ref in the password", () => {
    const url = `postgresql://postgres.evilproject:${REF}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;
    const identified = identifySupabaseProject(url);
    assert.equal(identified.ok, true);
    if (identified.ok) assert.equal(identified.ref, "evilproject");
    assert.throws(() => assertTestDatabase({ DATABASE_URL: url }), TestDatabaseGuardError);
  });

  it("refuses to push schema through the transaction pooler", () => {
    assert.throws(() => assertDirectSchemaUrl(POOLER(REF)), TestDatabaseGuardError);
    assert.doesNotThrow(() => assertDirectSchemaUrl(DIRECT(REF)));
    assert.doesNotThrow(() =>
      assertDirectSchemaUrl(
        `postgresql://postgres.${REF}:secret@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`
      )
    );
  });

  it("refuses a non-postgres URL and a host that is not this project", () => {
    assert.throws(
      () => assertTestDatabase({ DATABASE_URL: `https://${REF}.supabase.co` }),
      TestDatabaseGuardError
    );
    assert.throws(
      () =>
        assertTestDatabase({
          DATABASE_URL: "postgresql://postgres:secret@localhost:5432/grassroots",
        }),
      TestDatabaseGuardError
    );
  });

  it("refuses a URL whose username and host name different projects", () => {
    const url = `postgresql://postgres.${REF}:secret@db.otherproject.supabase.co:5432/postgres`;
    const identified = identifySupabaseProject(url);
    assert.equal(identified.ok, false);
    assert.throws(() => assertTestDatabase({ DATABASE_URL: url }), TestDatabaseGuardError);
  });
});

describe("test seed plan", () => {
  const plan = buildSeedPlan(new Date("2026-10-10T12:00:00Z"));

  it("is a legal preview dataset", () => {
    assert.doesNotThrow(() => assertSeedPlan(plan));
    for (const mgr of plan.managers) {
      assert.ok(usedBudget(plan, mgr.slots) <= FANTASY_BUDGET);
    }
  });

  it("shares Chidi as captain and vice-captain and benches Ngozi", () => {
    const ada = plan.managers.find((mgr) => mgr.email === "ada.captain@gfl.test");
    const bola = plan.managers.find((mgr) => mgr.email === "bola.vice@gfl.test");
    const chioma = plan.managers.find((mgr) => mgr.email === "chioma.bench@gfl.test");
    assert.ok(ada && bola && chioma);
    assert.equal(ada.slots.find((slot) => slot.playerKey === "chidi")?.isCaptain, true);
    assert.equal(bola.slots.find((slot) => slot.playerKey === "chidi")?.isViceCaptain, true);
    const chiomaChidi = chioma.slots.find((slot) => slot.playerKey === "chidi");
    assert.equal(chiomaChidi?.isStarting, true);
    assert.equal(chiomaChidi?.isCaptain, false);
    assert.equal(chiomaChidi?.isViceCaptain, false);
    const ngozi = chioma.slots.find((slot) => slot.playerKey === "ngozi");
    assert.equal(ngozi?.isStarting, false);
    assert.equal(playerByKey(plan, "chidi").position, "MID");
    assert.equal(playerByKey(plan, "ngozi").clubKey, playerByKey(plan, "chidi").clubKey);
  });

  it("gives Emeka two fixtures in the upcoming gameweek", () => {
    const emeka = playerByKey(plan, "emeka");
    const gw2 = plan.fixtures.filter(
      (fixture) =>
        fixture.gameweekNumber === 2 &&
        (fixture.homeClubKey === emeka.clubKey || fixture.awayClubKey === emeka.clubKey)
    );
    assert.equal(gw2.length, 2);
    const deadlines = plan.gameweeks.map((gw) => gw.deadline.getTime());
    assert.ok(Math.min(...deadlines) < plan.now.getTime());
    assert.ok(Math.max(...deadlines) > plan.now.getTime());
  });
});

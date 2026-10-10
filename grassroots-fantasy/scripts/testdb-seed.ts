import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  assertSeedPlan,
  buildSeedPlan,
  FANTASY_BUDGET,
  playerByKey,
  TEST_PASSWORD,
  usedBudget,
  type FixtureSeed,
  type ManagerSeed,
  type SeedPlan,
} from "./testdb-data";

const SCORING_RULES: Array<{
  id: string;
  event: string;
  position: string | null;
  points: number;
  description: string;
}> = [
  { id: "testdb_rule_appearance", event: "APPEARANCE", position: null, points: 2, description: "Appearance for any minutes" },
  { id: "testdb_rule_goal_gk", event: "GOAL", position: "GK", points: 10, description: "Goal scored by goalkeeper" },
  { id: "testdb_rule_goal_def", event: "GOAL", position: "DEF", points: 8, description: "Goal scored by defender" },
  { id: "testdb_rule_goal_mid", event: "GOAL", position: "MID", points: 6, description: "Goal scored by midfielder" },
  { id: "testdb_rule_goal_fwd", event: "GOAL", position: "FWD", points: 5, description: "Goal scored by forward" },
  { id: "testdb_rule_assist", event: "ASSIST", position: null, points: 3, description: "Goal assist" },
  { id: "testdb_rule_cs_gk", event: "CLEAN_SHEET", position: "GK", points: 5, description: "Clean sheet (GK)" },
  { id: "testdb_rule_cs_def", event: "CLEAN_SHEET", position: "DEF", points: 4, description: "Clean sheet (DEF)" },
  { id: "testdb_rule_pen_save", event: "PENALTY_SAVE", position: "GK", points: 5, description: "Penalty save" },
  { id: "testdb_rule_pen_miss", event: "PENALTY_MISS", position: null, points: -2, description: "Penalty miss" },
  { id: "testdb_rule_gc", event: "GOAL_CONCEDED", position: "GK", points: -2, description: "Goal conceded (GK)" },
  { id: "testdb_rule_yellow", event: "YELLOW_CARD", position: null, points: -1, description: "Yellow card" },
  { id: "testdb_rule_red", event: "RED_CARD", position: null, points: -3, description: "Red card" },
  { id: "testdb_rule_own", event: "OWN_GOAL", position: null, points: -2, description: "Own goal" },
];

const APP_CONFIG: Array<{ id: string; key: string; value: string }> = [
  { id: "testdb_cfg_name", key: "platform_name", value: "Grassroots Fantasy League" },
  { id: "testdb_cfg_tagline", key: "platform_tagline", value: "Represent your university. Compete nationally." },
  { id: "testdb_cfg_formation", key: "default_formation", value: "4-4-2" },
  { id: "testdb_cfg_xi", key: "starting_xi_size", value: "11" },
  { id: "testdb_cfg_bench", key: "bench_size", value: "5" },
  { id: "testdb_cfg_squad", key: "squad_size", value: "16" },
  { id: "testdb_cfg_cap", key: "captain_multiplier", value: "3" },
  { id: "testdb_cfg_vice", key: "vice_captain_multiplier", value: "2" },
  { id: "testdb_cfg_fee", key: "registration_fee", value: "5200" },
  { id: "testdb_cfg_budget", key: "budget", value: "1000" },
];

async function seedRules(prisma: PrismaClient) {
  await prisma.scoringRule.deleteMany();
  await prisma.scoringRule.createMany({ data: SCORING_RULES });
  for (const config of APP_CONFIG) {
    await prisma.appConfig.upsert({
      where: { key: config.key },
      create: config,
      update: { value: config.value },
    });
  }
}

async function seedWorld(prisma: PrismaClient, plan: SeedPlan) {
  const universities = new Map<string, string>();
  for (const uni of plan.universities) {
    const row = await prisma.university.upsert({
      where: { slug: uni.slug },
      create: {
        id: uni.id,
        name: uni.name,
        shortName: uni.shortName,
        slug: uni.slug,
        state: uni.state,
        country: "Nigeria",
        status: "active",
      },
      update: {
        name: uni.name,
        shortName: uni.shortName,
        state: uni.state,
        status: "active",
      },
    });
    universities.set(uni.key, row.id);
  }

  const funaabId = universities.get(plan.faculty.universityKey);
  if (!funaabId) throw new Error("FUNAAB university was not seeded.");
  await prisma.faculty.upsert({
    where: { id: plan.faculty.id },
    create: { id: plan.faculty.id, name: plan.faculty.name, universityId: funaabId },
    update: { name: plan.faculty.name, universityId: funaabId },
  });
  await prisma.department.upsert({
    where: { id: plan.department.id },
    create: {
      id: plan.department.id,
      name: plan.department.name,
      facultyId: plan.department.facultyId,
    },
    update: { name: plan.department.name, facultyId: plan.department.facultyId },
  });

  const season = await prisma.season.upsert({
    where: { id: plan.season.id },
    create: plan.season,
    update: {
      name: plan.season.name,
      year: plan.season.year,
      startDate: plan.season.startDate,
      endDate: plan.season.endDate,
      registrationStart: plan.season.registrationStart,
      registrationEnd: plan.season.registrationEnd,
      registrationFee: plan.season.registrationFee,
      status: plan.season.status,
    },
  });

  const leagues = new Map<string, string>();
  for (const uni of plan.universities) {
    const universityId = universities.get(uni.key);
    if (!universityId) throw new Error(`Missing university ${uni.key}`);
    const league = await prisma.universityLeague.upsert({
      where: { universityId_seasonId: { universityId, seasonId: season.id } },
      create: {
        id: `testdb_league_${uni.key}`,
        universityId,
        seasonId: season.id,
        name: `${uni.shortName} Fantasy League`,
        status: "open",
        entryFee: plan.season.registrationFee,
      },
      update: {
        name: `${uni.shortName} Fantasy League`,
        status: "open",
        entryFee: plan.season.registrationFee,
      },
    });
    leagues.set(uni.key, league.id);
  }

  for (const club of plan.clubs) {
    await prisma.realTeam.upsert({
      where: { id: club.id },
      create: {
        id: club.id,
        name: club.name,
        shortName: club.shortName,
        country: "Nigeria",
        league: "Grassroots",
      },
      update: { name: club.name, shortName: club.shortName },
    });
  }

  for (const player of plan.players) {
    const club = plan.clubs.find((item) => item.key === player.clubKey);
    if (!club) throw new Error(`Missing club ${player.clubKey}`);
    await prisma.realPlayer.upsert({
      where: { id: player.id },
      create: {
        id: player.id,
        name: player.name,
        position: player.position,
        realTeamId: club.id,
        price: player.price,
        status: "active",
        totalPoints: 0,
      },
      update: {
        name: player.name,
        position: player.position,
        realTeamId: club.id,
        price: player.price,
        status: "active",
        totalPoints: 0,
      },
    });
  }

  for (const gw of plan.gameweeks) {
    await prisma.gameweek.upsert({
      where: { seasonId_number: { seasonId: season.id, number: gw.number } },
      create: {
        id: gw.id,
        seasonId: season.id,
        number: gw.number,
        name: gw.name,
        deadline: gw.deadline,
        startDate: gw.startDate,
        endDate: gw.endDate,
        status: gw.status,
      },
      update: {
        name: gw.name,
        deadline: gw.deadline,
        startDate: gw.startDate,
        endDate: gw.endDate,
        status: gw.status,
      },
    });
  }

  const gameweeks = await prisma.gameweek.findMany({
    where: { seasonId: season.id, number: { in: plan.gameweeks.map((gw) => gw.number) } },
  });
  const gameweekId = new Map(gameweeks.map((gw) => [gw.number, gw.id]));

  for (const fixture of plan.fixtures) {
    await upsertFixture(prisma, plan, fixture, gameweekId);
  }

  const matchIds = plan.fixtures.map((fixture) => fixture.id);
  await prisma.playerMatchStatistic.deleteMany({ where: { matchId: { in: matchIds } } });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  for (const mgr of plan.managers) {
    await seedManager(prisma, plan, mgr, leagues, universities, passwordHash);
  }
}

async function upsertFixture(
  prisma: PrismaClient,
  plan: SeedPlan,
  fixture: FixtureSeed,
  gameweekId: Map<number, string>
) {
  const gwId = gameweekId.get(fixture.gameweekNumber);
  const home = plan.clubs.find((club) => club.key === fixture.homeClubKey);
  const away = plan.clubs.find((club) => club.key === fixture.awayClubKey);
  const gw = plan.gameweeks.find((item) => item.number === fixture.gameweekNumber);
  if (!gwId || !home || !away || !gw) {
    throw new Error(`Fixture ${fixture.id} is missing a club or gameweek.`);
  }
  await prisma.match.upsert({
    where: { id: fixture.id },
    create: {
      id: fixture.id,
      gameweekId: gwId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      date: gw.startDate,
      time: "15:00",
      venue: fixture.venue,
      status: fixture.status,
    },
    update: {
      gameweekId: gwId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      homeScore: fixture.homeScore,
      awayScore: fixture.awayScore,
      date: gw.startDate,
      time: "15:00",
      venue: fixture.venue,
      status: fixture.status,
    },
  });
}

async function seedManager(
  prisma: PrismaClient,
  plan: SeedPlan,
  mgr: ManagerSeed,
  leagues: Map<string, string>,
  universities: Map<string, string>,
  passwordHash: string
) {
  const user = await prisma.user.upsert({
    where: { email: mgr.email },
    create: {
      id: mgr.id,
      email: mgr.email,
      username: mgr.username,
      name: mgr.name,
      passwordHash,
      role: "user",
    },
    update: {
      username: mgr.username,
      name: mgr.name,
      passwordHash,
      role: "user",
    },
  });

  const leagueId = leagues.get(mgr.universityKey);
  const universityId = universities.get(mgr.universityKey);
  if (!leagueId || !universityId) throw new Error(`No league for ${mgr.universityKey}`);

  await prisma.universityLeagueMember.upsert({
    where: { userId_leagueId: { userId: user.id, leagueId } },
    create: {
      id: `testdb_member_${mgr.key}`,
      userId: user.id,
      leagueId,
      status: "active",
    },
    update: { status: "active" },
  });

  await prisma.payment.upsert({
    where: { reference: `testdb-pay-${mgr.key}` },
    create: {
      id: `testdb_pay_${mgr.key}`,
      userId: user.id,
      amount: plan.season.registrationFee,
      currency: "NGN",
      reference: `testdb-pay-${mgr.key}`,
      provider: "test",
      status: "successful",
      seasonId: plan.season.id,
      universityId,
      verifiedAt: plan.now,
    },
    update: {
      userId: user.id,
      amount: plan.season.registrationFee,
      status: "successful",
      seasonId: plan.season.id,
      verifiedAt: plan.now,
    },
  });

  const budget = usedBudget(plan, mgr.slots);
  const team = await prisma.fantasyTeam.upsert({
    where: { userId_leagueId: { userId: user.id, leagueId } },
    create: {
      id: mgr.teamId,
      userId: user.id,
      leagueId,
      name: mgr.teamName,
      formation: "4-4-2",
      budget: FANTASY_BUDGET,
      usedBudget: budget,
      totalPoints: 0,
    },
    update: {
      name: mgr.teamName,
      formation: "4-4-2",
      budget: FANTASY_BUDGET,
      usedBudget: budget,
      totalPoints: 0,
    },
  });

  const picks = mgr.slots.map((slot) => {
    const player = playerByKey(plan, slot.playerKey);
    return {
      id: `testdb_pick_${mgr.key}_${slot.playerKey}`,
      teamId: team.id,
      playerId: player.id,
      isCaptain: slot.isCaptain,
      isViceCaptain: slot.isViceCaptain,
      isStarting: slot.isStarting,
      position: player.position,
    };
  });
  await prisma.fantasyPointTransaction.deleteMany({ where: { userId: user.id } });
  await prisma.fantasyTeamPlayer.deleteMany({
    where: { OR: [{ teamId: team.id }, { id: { in: picks.map((pick) => pick.id) } }] },
  });
  await prisma.fantasyTeamPlayer.createMany({ data: picks });
}

export async function seedTestDatabase(now = new Date()): Promise<SeedPlan> {
  const plan = buildSeedPlan(now);
  assertSeedPlan(plan);

  const prisma = new PrismaClient();
  try {
    await seedRules(prisma);
    await seedWorld(prisma, plan);
    return plan;
  } finally {
    await prisma.$disconnect();
  }
}

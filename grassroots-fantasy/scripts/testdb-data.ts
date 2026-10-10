/**
 * Realistic fixture for manual preview checks. No database access.
 * Prices are tenths of a million (50 = 5.0m). Budget is 1000 = 100.0m.
 */

export const TEST_PASSWORD = "gfl-test-2026";
export const FANTASY_BUDGET = 1000;
export const SQUAD_SIZE = 16;
export const STARTER_COUNT = 11;
export const BENCH_COUNT = 5;
export const MAX_PER_CLUB = 3;

export type Position = "GK" | "DEF" | "MID" | "FWD";

export interface ClubSeed {
  id: string;
  key: string;
  name: string;
  shortName: string;
}

export interface PlayerSeed {
  id: string;
  key: string;
  name: string;
  position: Position;
  clubKey: string;
  price: number;
}

export interface SlotSeed {
  playerKey: string;
  isStarting: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export interface ManagerSeed {
  id: string;
  key: string;
  email: string;
  username: string;
  name: string;
  universityKey: string;
  teamId: string;
  teamName: string;
  slots: SlotSeed[];
}

export interface UniversitySeed {
  id: string;
  key: string;
  name: string;
  shortName: string;
  slug: string;
  state: string;
}

export interface FixtureSeed {
  id: string;
  gameweekNumber: number;
  homeClubKey: string;
  awayClubKey: string;
  status: "finished" | "upcoming";
  homeScore: number | null;
  awayScore: number | null;
  venue: string;
}

export interface GameweekSeed {
  id: string;
  number: number;
  name: string;
  deadline: Date;
  startDate: Date;
  endDate: Date;
  status: "finished" | "upcoming";
}

export interface SeedPlan {
  now: Date;
  season: {
    id: string;
    name: string;
    year: number;
    startDate: Date;
    endDate: Date;
    registrationStart: Date;
    registrationEnd: Date;
    registrationFee: number;
    status: string;
  };
  universities: UniversitySeed[];
  faculty: { id: string; universityKey: string; name: string };
  department: { id: string; facultyId: string; name: string };
  clubs: ClubSeed[];
  players: PlayerSeed[];
  gameweeks: GameweekSeed[];
  fixtures: FixtureSeed[];
  managers: ManagerSeed[];
  /** Shared by Ada (captain) and Bola (vice-captain). */
  sharedPlayerKey: string;
  /** On Chioma's bench, same club as the shared player so one fixture covers both. */
  benchPlayerKey: string;
  /** Club plays twice inside the upcoming gameweek. */
  doubleFixturePlayerKey: string;
  doubleFixtureGameweekNumber: number;
}

const day = 24 * 60 * 60 * 1000;

function id(prefix: string, key: string): string {
  return `testdb_${prefix}_${key}`;
}

const CLUBS: ClubSeed[] = [
  { key: "lag", id: id("club", "lag"), name: "Lagoon FC", shortName: "LAG" },
  { key: "iba", id: id("club", "iba"), name: "Ibadan Rovers", shortName: "IBA" },
  { key: "ife", id: id("club", "ife"), name: "Ile-Ife Athletic", shortName: "IFE" },
  { key: "abj", id: id("club", "abj"), name: "Abuja Scholars", shortName: "ABJ" },
  { key: "phm", id: id("club", "phm"), name: "PH Mariners", shortName: "PHM" },
  { key: "enu", id: id("club", "enu"), name: "Enugu Campus", shortName: "ENU" },
];

function player(seed: Omit<PlayerSeed, "id">): PlayerSeed {
  return { ...seed, id: id("player", seed.key) };
}

const PLAYERS: PlayerSeed[] = [
  player({ key: "chidi", name: "Chidi Okafor", position: "MID", clubKey: "lag", price: 70 }),
  player({ key: "ngozi", name: "Ngozi Bench", position: "FWD", clubKey: "lag", price: 45 }),
  player({ key: "kunle", name: "Kunle Adebayo", position: "DEF", clubKey: "lag", price: 50 }),
  player({ key: "tunde", name: "Tunde Bakare", position: "GK", clubKey: "iba", price: 50 }),
  player({ key: "seyi", name: "Seyi Adeyemi", position: "DEF", clubKey: "iba", price: 45 }),
  player({ key: "amaka", name: "Amaka Nwosu", position: "MID", clubKey: "iba", price: 60 }),
  player({ key: "femi", name: "Femi Lawal", position: "FWD", clubKey: "iba", price: 65 }),
  player({ key: "emeka", name: "Emeka Dual", position: "MID", clubKey: "ife", price: 65 }),
  player({ key: "ifeanyi", name: "Ifeanyi Okonkwo", position: "DEF", clubKey: "ife", price: 50 }),
  player({ key: "zainab", name: "Zainab Bello", position: "GK", clubKey: "ife", price: 45 }),
  player({ key: "halima", name: "Halima Yusuf", position: "FWD", clubKey: "ife", price: 55 }),
  player({ key: "musa", name: "Musa Danjuma", position: "DEF", clubKey: "abj", price: 50 }),
  player({ key: "aisha", name: "Aisha Mohammed", position: "MID", clubKey: "abj", price: 55 }),
  player({ key: "ibrahim", name: "Ibrahim Sani", position: "DEF", clubKey: "abj", price: 45 }),
  player({ key: "fatima", name: "Fatima Usman", position: "FWD", clubKey: "abj", price: 50 }),
  player({ key: "tamuno", name: "Tamuno Briggs", position: "GK", clubKey: "phm", price: 55 }),
  player({ key: "preye", name: "Preye Okoro", position: "DEF", clubKey: "phm", price: 45 }),
  player({ key: "diepreye", name: "Diepreye George", position: "MID", clubKey: "phm", price: 50 }),
  player({ key: "sokari", name: "Sokari Hart", position: "FWD", clubKey: "phm", price: 60 }),
  player({ key: "obinna", name: "Obinna Eze", position: "DEF", clubKey: "enu", price: 45 }),
  player({ key: "chiamaka", name: "Chiamaka Obi", position: "MID", clubKey: "enu", price: 55 }),
  player({ key: "nnamdi", name: "Nnamdi Ude", position: "FWD", clubKey: "enu", price: 50 }),
  player({ key: "kelechi", name: "Kelechi Nnaji", position: "GK", clubKey: "enu", price: 45 }),
];

const STARTERS = [
  "tamuno",
  "kunle",
  "seyi",
  "musa",
  "obinna",
  "chidi",
  "emeka",
  "amaka",
  "aisha",
  "femi",
  "halima",
];

const BENCH = ["preye", "diepreye", "nnamdi", "fatima", "chiamaka"];

function slots(captain: string, vice: string, bench: string[]): SlotSeed[] {
  return [
    ...STARTERS.map((playerKey) => ({
      playerKey,
      isStarting: true,
      isCaptain: playerKey === captain,
      isViceCaptain: playerKey === vice,
    })),
    ...bench.map((playerKey) => ({
      playerKey,
      isStarting: false,
      isCaptain: false,
      isViceCaptain: false,
    })),
  ];
}

function manager(
  key: string,
  email: string,
  username: string,
  name: string,
  universityKey: string,
  captain: string,
  vice: string,
  bench: string[]
): ManagerSeed {
  return {
    id: id("user", key),
    key,
    email,
    username,
    name,
    universityKey,
    teamId: id("team", key),
    teamName: `${name.split(" ")[0]} XI`,
    slots: slots(captain, vice, bench),
  };
}

export function buildSeedPlan(now: Date): SeedPlan {
  const universities: UniversitySeed[] = [
    {
      key: "funaab",
      id: id("uni", "funaab"),
      name: "Federal University of Agriculture, Abeokuta",
      shortName: "FUNAAB",
      slug: "funaab",
      state: "Ogun",
    },
    {
      key: "unilag",
      id: id("uni", "unilag"),
      name: "University of Lagos",
      shortName: "UNILAG",
      slug: "unilag",
      state: "Lagos",
    },
    {
      key: "ui",
      id: id("uni", "ui"),
      name: "University of Ibadan",
      shortName: "UI",
      slug: "ui",
      state: "Oyo",
    },
  ];

  return {
    now,
    season: {
      id: id("season", "2026"),
      name: "2026/27 Test Season",
      year: 2026,
      startDate: new Date(now.getTime() - 30 * day),
      endDate: new Date(now.getTime() + 300 * day),
      registrationStart: new Date(now.getTime() - 20 * day),
      registrationEnd: new Date(now.getTime() + 60 * day),
      registrationFee: 5200,
      status: "active",
    },
    universities,
    faculty: {
      id: id("fac", "funaab_science"),
      universityKey: "funaab",
      name: "Faculty of Physical Sciences",
    },
    department: {
      id: id("dept", "funaab_computer"),
      facultyId: id("fac", "funaab_science"),
      name: "Computer Science",
    },
    clubs: CLUBS,
    players: PLAYERS,
    gameweeks: [
      {
        id: id("gw", "1"),
        number: 1,
        name: "Gameweek 1",
        startDate: new Date(now.getTime() - 9 * day),
        endDate: new Date(now.getTime() - 6 * day),
        deadline: new Date(now.getTime() - 7 * day),
        status: "finished",
      },
      {
        id: id("gw", "2"),
        number: 2,
        name: "Gameweek 2",
        startDate: new Date(now.getTime() + 6 * day),
        endDate: new Date(now.getTime() + 9 * day),
        deadline: new Date(now.getTime() + 6 * day),
        status: "upcoming",
      },
    ],
    fixtures: [
      {
        id: id("match", "gw1_abj_phm"),
        gameweekNumber: 1,
        homeClubKey: "abj",
        awayClubKey: "phm",
        status: "finished",
        homeScore: 1,
        awayScore: 0,
        venue: "Scholars Ground",
      },
      {
        id: id("match", "gw2_lag_iba"),
        gameweekNumber: 2,
        homeClubKey: "lag",
        awayClubKey: "iba",
        status: "upcoming",
        homeScore: null,
        awayScore: null,
        venue: "Lagoon Pitch",
      },
      {
        id: id("match", "gw2_ife_abj"),
        gameweekNumber: 2,
        homeClubKey: "ife",
        awayClubKey: "abj",
        status: "upcoming",
        homeScore: null,
        awayScore: null,
        venue: "Ife Bowl",
      },
      {
        id: id("match", "gw2_enu_ife"),
        gameweekNumber: 2,
        homeClubKey: "enu",
        awayClubKey: "ife",
        status: "upcoming",
        homeScore: null,
        awayScore: null,
        venue: "Campus Field",
      },
    ],
    managers: [
      manager("ada", "ada.captain@gfl.test", "ada_captain", "Ada Okonkwo", "funaab", "chidi", "halima", BENCH),
      manager("bola", "bola.vice@gfl.test", "bola_vice", "Bola Adeyemi", "unilag", "emeka", "chidi", BENCH),
      manager(
        "chioma",
        "chioma.bench@gfl.test",
        "chioma_bench",
        "Chioma Eze",
        "ui",
        "amaka",
        "halima",
        ["preye", "diepreye", "nnamdi", "fatima", "ngozi"]
      ),
    ],
    sharedPlayerKey: "chidi",
    benchPlayerKey: "ngozi",
    doubleFixturePlayerKey: "emeka",
    doubleFixtureGameweekNumber: 2,
  };
}

export function playerByKey(plan: SeedPlan, key: string): PlayerSeed {
  const player = plan.players.find((item) => item.key === key);
  if (!player) throw new Error(`Unknown player ${key}`);
  return player;
}

export function usedBudget(plan: SeedPlan, slotsForTeam: SlotSeed[]): number {
  return slotsForTeam.reduce((sum, slot) => sum + playerByKey(plan, slot.playerKey).price, 0);
}

/** Throws when the plan could not build a legal squad or the checklist cast. */
export function assertSeedPlan(plan: SeedPlan): void {
  if (plan.universities.length < 3) {
    throw new Error("Seed needs at least three universities.");
  }
  if (!plan.universities.some((uni) => uni.slug === "funaab")) {
    throw new Error("Registration looks up the funaab slug.");
  }
  if (plan.clubs.length < 3) throw new Error("Seed needs a few clubs.");
  if (plan.gameweeks.length < 2) throw new Error("Seed needs two gameweeks.");

  const past = plan.gameweeks.filter((gw) => gw.deadline.getTime() < plan.now.getTime());
  const upcoming = plan.gameweeks.filter((gw) => gw.deadline.getTime() > plan.now.getTime());
  if (past.length < 1 || upcoming.length < 1) {
    throw new Error("Need one past deadline and one upcoming deadline.");
  }

  if (plan.managers.length < 3) throw new Error("Seed needs three managers.");

  const players = new Map(plan.players.map((player) => [player.key, player]));

  for (const mgr of plan.managers) {
    if (mgr.slots.length !== SQUAD_SIZE) {
      throw new Error(`${mgr.name} does not have ${SQUAD_SIZE} players.`);
    }
    const keys = mgr.slots.map((slot) => slot.playerKey);
    if (new Set(keys).size !== keys.length) {
      throw new Error(`${mgr.name} has a duplicate player.`);
    }
    const starters = mgr.slots.filter((slot) => slot.isStarting);
    const bench = mgr.slots.filter((slot) => !slot.isStarting);
    if (starters.length !== STARTER_COUNT || bench.length !== BENCH_COUNT) {
      throw new Error(`${mgr.name} is not 11 starters and 5 subs.`);
    }
    const captains = mgr.slots.filter((slot) => slot.isCaptain);
    const vices = mgr.slots.filter((slot) => slot.isViceCaptain);
    if (captains.length !== 1 || !captains[0].isStarting) {
      throw new Error(`${mgr.name} needs exactly one starting captain.`);
    }
    if (vices.length > 1 || (vices[0] && !vices[0].isStarting)) {
      throw new Error(`${mgr.name} has an illegal vice-captain.`);
    }
    if (vices.length === 1 && vices[0].playerKey === captains[0].playerKey) {
      throw new Error(`${mgr.name} captains and vice-captains the same player.`);
    }
    const starterPositions = starters.map((slot) => players.get(slot.playerKey)?.position);
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const position of starterPositions) {
      if (!position) throw new Error(`${mgr.name} has an unknown starter.`);
      counts[position] += 1;
    }
    if (counts.GK !== 1 || counts.DEF !== 4 || counts.MID !== 4 || counts.FWD !== 2) {
      throw new Error(`${mgr.name} is not a 4-4-2 (got ${JSON.stringify(counts)}).`);
    }
    if (usedBudget(plan, mgr.slots) > FANTASY_BUDGET) {
      throw new Error(`${mgr.name} is over the 100.0m budget.`);
    }
    const perClub: Record<string, number> = {};
    for (const slot of mgr.slots) {
      const clubKey = players.get(slot.playerKey)?.clubKey;
      if (!clubKey) throw new Error(`${mgr.name} references ${slot.playerKey}.`);
      perClub[clubKey] = (perClub[clubKey] ?? 0) + 1;
    }
    for (const clubKey of Object.keys(perClub)) {
      const count = perClub[clubKey];
      if (count > MAX_PER_CLUB) {
        throw new Error(`${mgr.name} has ${count} players from ${clubKey}.`);
      }
    }
  }

  const ada = plan.managers.find((mgr) => mgr.key === "ada");
  const bola = plan.managers.find((mgr) => mgr.key === "bola");
  const chioma = plan.managers.find((mgr) => mgr.key === "chioma");
  if (!ada || !bola || !chioma) throw new Error("Missing Ada, Bola, or Chioma.");

  const role = (mgr: ManagerSeed, playerKey: string) =>
    mgr.slots.find((slot) => slot.playerKey === playerKey);

  const adaShared = role(ada, plan.sharedPlayerKey);
  const bolaShared = role(bola, plan.sharedPlayerKey);
  const chiomaShared = role(chioma, plan.sharedPlayerKey);
  if (!adaShared?.isCaptain || !adaShared.isStarting) {
    throw new Error("Ada must captain the shared player.");
  }
  if (!bolaShared?.isViceCaptain || !bolaShared.isStarting || bolaShared.isCaptain) {
    throw new Error("Bola must vice-captain the shared player.");
  }
  if (!chiomaShared?.isStarting || chiomaShared.isCaptain || chiomaShared.isViceCaptain) {
    throw new Error("Chioma must start the shared player without a multiplier.");
  }

  const benchSlot = role(chioma, plan.benchPlayerKey);
  if (!benchSlot || benchSlot.isStarting) {
    throw new Error("Chioma must have the bench player as a substitute.");
  }

  const dual = players.get(plan.doubleFixturePlayerKey);
  if (!dual) throw new Error("Missing the double-fixture player.");
  const sameWeek = plan.fixtures.filter(
    (fixture) =>
      fixture.gameweekNumber === plan.doubleFixtureGameweekNumber &&
      (fixture.homeClubKey === dual.clubKey || fixture.awayClubKey === dual.clubKey)
  );
  if (sameWeek.length < 2) {
    throw new Error("The double-fixture player needs two matches in one gameweek.");
  }
}

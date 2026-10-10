import { vi } from "vitest";

export const cookieJar = new Map<string, string>();
export const getUser = vi.fn();

function model() {
  return {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    upsert: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };
}

export const prismaMock = {
  user: model(),
  university: model(),
  season: model(),
  universityLeague: model(),
  universityLeagueMember: model(),
  payment: model(),
  fantasyPointTransaction: model(),
  fantasyTeamPlayer: model(),
  fantasyTeam: model(),
  playerMatchStatistic: model(),
  match: model(),
  gameweek: model(),
  gameweekLineup: model(),
  realPlayer: model(),
  $transaction: vi.fn(async (ops: unknown) => {
    if (Array.isArray(ops)) return Promise.all(ops);
    return ops;
  }),
};

const models = [
  prismaMock.user,
  prismaMock.university,
  prismaMock.season,
  prismaMock.universityLeague,
  prismaMock.universityLeagueMember,
  prismaMock.payment,
  prismaMock.fantasyPointTransaction,
  prismaMock.fantasyTeamPlayer,
  prismaMock.fantasyTeam,
  prismaMock.playerMatchStatistic,
  prismaMock.match,
  prismaMock.gameweek,
  prismaMock.gameweekLineup,
  prismaMock.realPlayer,
];

export function resetHarness() {
  cookieJar.clear();
  getUser.mockReset();
  for (const entry of models) {
    for (const fn of Object.values(entry)) {
      fn.mockReset();
    }
  }
  prismaMock.$transaction.mockClear();
}

export function cookiesModule() {
  return {
    cookies: () => ({
      get: (name: string) => {
        const value = cookieJar.get(name);
        return value === undefined ? undefined : { name, value };
      },
      set: (name: string, value: string) => {
        cookieJar.set(name, value);
      },
      delete: (name: string) => {
        cookieJar.delete(name);
      },
    }),
  };
}

import { prisma } from "./db";

export async function getCurrentSeason() {
  const active = await prisma.season.findFirst({
    where: { status: "active" },
    orderBy: { year: "desc" },
  });
  if (active) return active;

  return prisma.season.findFirst({
    where: { status: { in: ["upcoming", "open"] } },
    orderBy: { year: "desc" },
  });
}

export async function ensureUniversityLeague(universityId: string, seasonId?: string) {
  const season = seasonId
    ? await prisma.season.findUnique({ where: { id: seasonId } })
    : await getCurrentSeason();

  if (!season) return null;

  return prisma.universityLeague.upsert({
    where: {
      universityId_seasonId: {
        universityId,
        seasonId: season.id,
      },
    },
    create: {
      universityId,
      seasonId: season.id,
      status: "open",
    },
    update: {},
  });
}

export async function ensureLeaguesForSeason(seasonId: string) {
  const universities = await prisma.university.findMany({
    where: { status: "active" },
    select: { id: true },
  });

  await Promise.all(
    universities.map((uni) =>
      prisma.universityLeague.upsert({
        where: {
          universityId_seasonId: {
            universityId: uni.id,
            seasonId,
          },
        },
        create: {
          universityId: uni.id,
          seasonId,
          status: "open",
        },
        update: {},
      })
    )
  );
}

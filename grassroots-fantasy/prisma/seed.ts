import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding scoring rules and app config...");

  await prisma.scoringRule.deleteMany();
  await prisma.appConfig.deleteMany();

  await prisma.scoringRule.createMany({
    data: [
      // Appearance
      { event: "APPEARANCE", position: null, points: 2, description: "+2 for playing any minutes" },

      // Goals by position
      { event: "GOAL", position: "GK", points: 10, description: "Goal scored by goalkeeper" },
      { event: "GOAL", position: "DEF", points: 8, description: "Goal scored by defender" },
      { event: "GOAL", position: "MID", points: 6, description: "Goal scored by midfielder" },
      { event: "GOAL", position: "FWD", points: 5, description: "Goal scored by forward" },

      // Assists
      { event: "ASSIST", position: null, points: 3, description: "Goal assist" },

      // Clean sheets
      { event: "CLEAN_SHEET", position: "GK", points: 5, description: "Clean sheet (GK)" },
      { event: "CLEAN_SHEET", position: "DEF", points: 4, description: "Clean sheet (DEF)" },

      // Goalkeeper specific
      { event: "PENALTY_SAVE", position: "GK", points: 5, description: "Penalty save" },
      { event: "GOAL_CONCEDED", position: "GK", points: -2, description: "Goal conceded (GK only)" },

      // Discipline
      { event: "YELLOW_CARD", position: null, points: -1, description: "Yellow card" },
      { event: "RED_CARD", position: null, points: -3, description: "Red card" },

      // Own goals and missed penalties. A scored penalty is entered as a goal.
      { event: "OWN_GOAL", position: null, points: -2, description: "Own goal" },
      { event: "PENALTY_MISS", position: null, points: -2, description: "Penalty missed" },
    ],
  });

  await prisma.appConfig.createMany({
    data: [
      { key: "platform_name", value: "Grassroots Fantasy League" },
      { key: "platform_tagline", value: "Represent your university. Compete nationally." },
      { key: "default_formation", value: "4-4-2" },
      { key: "starting_xi_size", value: "11" },
      { key: "bench_size", value: "5" },
      { key: "squad_size", value: "16" },
      { key: "captain_multiplier", value: "3" },
      { key: "vice_captain_multiplier", value: "2" },
      { key: "registration_fee", value: "500" },
      { key: "budget", value: "1000" },
    ],
  });

  console.log("Seed completed. 14 scoring rules + 10 config entries.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

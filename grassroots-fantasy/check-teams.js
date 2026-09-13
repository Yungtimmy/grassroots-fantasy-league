const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const prisma = new PrismaClient();

const TEAM_FILE_MAP = {
  'ANA': 'analytix',
  'ARS': 'arsonist',
  'CAT': 'catalyst',
  'COV': 'covalent',
  'DEB': 'debuggers',
  'DEV': 'dev united',
  'EIN': 'einstein',
  'NOV': 'nova',
  'PHA': 'phantom',
  'PHO': 'photon',
  'PI-': 'pi-rate',
  'TTE': 'tech terrors',
  'TTI': 'tech titans',
  'THE': 'theorem',
  'TRA': 'trailblazer',
  'VAR': 'variance vikings',
  'WAV': 'waveriders',
};

const DB_TO_FILE = {
  'Analytix FC': 'analytix',
  'Arsonist FC': 'arsonist',
  'Catalyst FC': 'catalyst',
  'FC Covalent': 'covalent',
  'Debuggers FC': 'debuggers',
  'Dev United': 'dev united',
  "Einstein's XI": 'einstein',
  'Nova FC': 'nova',
  'Phantom FC': 'phantom',
  'Photon XI': 'photon',
  'Pi-Rates FC': 'pi-rate',
  'Tech Terrors': 'tech terrors',
  'Tech Titans': 'tech titans',
  'Theorem United': 'theorem',
  'Trailblazer FC': 'trailblazer',
  'Variance Vikings': 'variance vikings',
  'Wave Riders FC': 'waveriders',
};

const POSITION_MAP = {
  'Forward': 'FWD',
  'Midfielder': 'MID',
  'Defender': 'DEF',
  'Goalkeeper': 'GK',
};

async function main() {
  // 1. Update shortNames to match filenames
  const teams = await prisma.realTeam.findMany();
  for (const team of teams) {
    const fileName = DB_TO_FILE[team.name];
    if (fileName && team.shortName !== fileName) {
      await prisma.realTeam.update({ where: { id: team.id }, data: { shortName: fileName } });
      console.log(`Updated ${team.name}: ${team.shortName} -> ${fileName}`);
    }
  }

  // 2. Create Tech Titans if missing
  let techTitans = teams.find(t => t.name === 'Tech Titans');
  if (!techTitans) {
    techTitans = await prisma.realTeam.create({
      data: { name: 'Tech Titans', shortName: 'tech titans', country: 'Nigeria', league: 'Campus League' },
    });
    console.log('Created Tech Titans team:', techTitans.id);
  }

  // 3. Add Tech Titans players from Excel
  const wb = XLSX.readFile('C:\\Users\\Israel Oyenola\\Downloads\\CSL_4.0_All_Team_Player_Rosters-1-1.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet);
  const titans = data.filter(r => r.Team === 'Tech Titans');

  let added = 0;
  for (const p of titans) {
    const position = POSITION_MAP[p.Position] || p.Position;
    const price = Math.round(p.Price * 10); // Store as tenths

    const existing = await prisma.realPlayer.findFirst({
      where: { name: p.Player, realTeamId: techTitans.id },
    });
    if (existing) {
      console.log(`  Exists: ${p.Player}`);
      continue;
    }

    await prisma.realPlayer.create({
      data: {
        name: p.Player,
        position,
        price,
        status: 'active',
        realTeamId: techTitans.id,
      },
    });
    added++;
    console.log(`  Added: ${p.Player} (${position}) - ${p.Price}m`);
  }

  console.log(`\nDone. Added ${added} Tech Titans players.`);
  const total = await prisma.realPlayer.count();
  console.log(`Total players now: ${total}`);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });

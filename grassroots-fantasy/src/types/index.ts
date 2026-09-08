export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UserPublic {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar: string | null;
  role: string;
  createdAt: string;
}

export interface UniversityPublic {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logo: string | null;
  state: string | null;
  country: string;
  status: string;
}

export interface SeasonPublic {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  registrationStart: string;
  registrationEnd: string;
  registrationFee: number;
  status: string;
}

export interface LeaguePublic {
  id: string;
  universityId: string;
  seasonId: string;
  status: string;
  university: UniversityPublic;
  season: SeasonPublic;
  memberCount?: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  photo: string | null;
  position: string;
  price: number;
  status: string;
  totalPoints: number;
  realTeam: {
    id: string;
    name: string;
    shortName: string;
    logo: string | null;
  };
}

export interface FantasyTeamPublic {
  id: string;
  name: string;
  formation: string;
  totalPoints: number;
  players: FantasyTeamPlayerPublic[];
}

export interface FantasyTeamPlayerPublic {
  id: string;
  isCaptain: boolean;
  isViceCaptain: boolean;
  isStarting: boolean;
  position: string;
  player: PlayerPublic;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  name: string;
  avatar: string | null;
  teamName: string;
  university: string;
  universitySlug: string;
  totalPoints: number;
  gameweekPoints: number;
  movement: number;
}

export interface UniversityRankingEntry {
  rank: number;
  universityId: string;
  name: string;
  shortName: string;
  slug: string;
  logo: string | null;
  totalPoints: number;
  playerCount: number;
}

export interface GameweekPublic {
  id: string;
  number: number;
  name: string;
  deadline: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface MatchPublic {
  id: string;
  homeTeam: { id: string; name: string; shortName: string; logo: string | null };
  awayTeam: { id: string; name: string; shortName: string; logo: string | null };
  homeScore: number | null;
  awayScore: number | null;
  date: string;
  time: string | null;
  venue: string | null;
  status: string;
}

export interface PlayerStats {
  minutes: number;
  goals: number;
  assists: number;
  cleanSheet: boolean;
  saves: number;
  yellowCards: number;
  redCards: number;
  ownGoals: number;
  penaltyMiss: number;
  penaltySave: number;
}

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "universities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo" TEXT,
    "state" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nigeria',
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "registration_start" TIMESTAMP(3) NOT NULL,
    "registration_end" TIMESTAMP(3) NOT NULL,
    "registrationFee" INTEGER NOT NULL DEFAULT 500,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_leagues" (
    "id" TEXT NOT NULL,
    "university_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "university_leagues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "university_league_members" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "registered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "university_league_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_teams" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "league_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "formation" TEXT NOT NULL DEFAULT '4-4-2',
    "budget" INTEGER NOT NULL DEFAULT 1000,
    "used_budget" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fantasy_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_team_players" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_vice_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_starting" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_team_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT NOT NULL,
    "logo" TEXT,
    "country" TEXT NOT NULL DEFAULT 'England',
    "league" TEXT NOT NULL DEFAULT 'Premier League',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "real_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "real_players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photo" TEXT,
    "position" TEXT NOT NULL,
    "real_team_id" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "real_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scoring_rules" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "position" TEXT,
    "points" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scoring_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gameweeks" (
    "id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gameweeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "home_team_id" TEXT NOT NULL,
    "away_team_id" TEXT NOT NULL,
    "home_score" INTEGER,
    "away_score" INTEGER,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "venue" TEXT,
    "status" TEXT NOT NULL DEFAULT 'upcoming',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "player_match_statistics" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "match_id" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL DEFAULT 0,
    "goals" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "clean_sheet" BOOLEAN NOT NULL DEFAULT false,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "yellow_cards" INTEGER NOT NULL DEFAULT 0,
    "red_cards" INTEGER NOT NULL DEFAULT 0,
    "own_goals" INTEGER NOT NULL DEFAULT 0,
    "penalty_miss" INTEGER NOT NULL DEFAULT 0,
    "penalty_save" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "player_match_statistics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fantasy_point_transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "base_points" INTEGER NOT NULL,
    "multiplier" INTEGER NOT NULL DEFAULT 1,
    "total_points" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fantasy_point_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NGN',
    "reference" TEXT NOT NULL,
    "provider" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "season_id" TEXT,
    "university_id" TEXT,
    "metadata" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT,
    "category" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_config" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "universities_slug_key" ON "universities"("slug");

-- CreateIndex
CREATE INDEX "university_leagues_university_id_idx" ON "university_leagues"("university_id");

-- CreateIndex
CREATE INDEX "university_leagues_season_id_idx" ON "university_leagues"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "university_leagues_university_id_season_id_key" ON "university_leagues"("university_id", "season_id");

-- CreateIndex
CREATE INDEX "university_league_members_user_id_idx" ON "university_league_members"("user_id");

-- CreateIndex
CREATE INDEX "university_league_members_league_id_idx" ON "university_league_members"("league_id");

-- CreateIndex
CREATE UNIQUE INDEX "university_league_members_user_id_league_id_key" ON "university_league_members"("user_id", "league_id");

-- CreateIndex
CREATE INDEX "fantasy_teams_user_id_idx" ON "fantasy_teams"("user_id");

-- CreateIndex
CREATE INDEX "fantasy_teams_league_id_idx" ON "fantasy_teams"("league_id");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_teams_user_id_league_id_key" ON "fantasy_teams"("user_id", "league_id");

-- CreateIndex
CREATE INDEX "fantasy_team_players_team_id_idx" ON "fantasy_team_players"("team_id");

-- CreateIndex
CREATE INDEX "fantasy_team_players_player_id_idx" ON "fantasy_team_players"("player_id");

-- CreateIndex
CREATE UNIQUE INDEX "fantasy_team_players_team_id_player_id_key" ON "fantasy_team_players"("team_id", "player_id");

-- CreateIndex
CREATE INDEX "real_players_real_team_id_idx" ON "real_players"("real_team_id");

-- CreateIndex
CREATE INDEX "real_players_position_idx" ON "real_players"("position");

-- CreateIndex
CREATE UNIQUE INDEX "scoring_rules_event_position_key" ON "scoring_rules"("event", "position");

-- CreateIndex
CREATE INDEX "gameweeks_season_id_idx" ON "gameweeks"("season_id");

-- CreateIndex
CREATE UNIQUE INDEX "gameweeks_season_id_number_key" ON "gameweeks"("season_id", "number");

-- CreateIndex
CREATE INDEX "matches_gameweek_id_idx" ON "matches"("gameweek_id");

-- CreateIndex
CREATE INDEX "matches_home_team_id_idx" ON "matches"("home_team_id");

-- CreateIndex
CREATE INDEX "matches_away_team_id_idx" ON "matches"("away_team_id");

-- CreateIndex
CREATE INDEX "matches_date_idx" ON "matches"("date");

-- CreateIndex
CREATE INDEX "player_match_statistics_player_id_idx" ON "player_match_statistics"("player_id");

-- CreateIndex
CREATE INDEX "player_match_statistics_match_id_idx" ON "player_match_statistics"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_statistics_player_id_match_id_key" ON "player_match_statistics"("player_id", "match_id");

-- CreateIndex
CREATE INDEX "fantasy_point_transactions_user_id_idx" ON "fantasy_point_transactions"("user_id");

-- CreateIndex
CREATE INDEX "fantasy_point_transactions_player_id_idx" ON "fantasy_point_transactions"("player_id");

-- CreateIndex
CREATE INDEX "fantasy_point_transactions_gameweek_id_idx" ON "fantasy_point_transactions"("gameweek_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_reference_key" ON "payments"("reference");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_season_id_idx" ON "payments"("season_id");

-- CreateIndex
CREATE INDEX "payments_university_id_idx" ON "payments"("university_id");

-- CreateIndex
CREATE UNIQUE INDEX "app_config_key_key" ON "app_config"("key");

-- AddForeignKey
ALTER TABLE "university_leagues" ADD CONSTRAINT "university_leagues_university_id_fkey" FOREIGN KEY ("university_id") REFERENCES "universities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_leagues" ADD CONSTRAINT "university_leagues_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_league_members" ADD CONSTRAINT "university_league_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "university_league_members" ADD CONSTRAINT "university_league_members_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "university_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_teams" ADD CONSTRAINT "fantasy_teams_league_id_fkey" FOREIGN KEY ("league_id") REFERENCES "university_leagues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_team_players" ADD CONSTRAINT "fantasy_team_players_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "real_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "real_players" ADD CONSTRAINT "real_players_real_team_id_fkey" FOREIGN KEY ("real_team_id") REFERENCES "real_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gameweeks" ADD CONSTRAINT "gameweeks_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_fkey" FOREIGN KEY ("home_team_id") REFERENCES "real_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_fkey" FOREIGN KEY ("away_team_id") REFERENCES "real_teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_statistics" ADD CONSTRAINT "player_match_statistics_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "real_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "player_match_statistics" ADD CONSTRAINT "player_match_statistics_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_point_transactions" ADD CONSTRAINT "fantasy_point_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_point_transactions" ADD CONSTRAINT "fantasy_point_transactions_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "real_players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fantasy_point_transactions" ADD CONSTRAINT "fantasy_point_transactions_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Per-gameweek lineup snapshot, and fantasy points keyed by team.
-- This file is not applied by the app. Do not run it until the owner has
-- read the backfill notes below.

-- CreateTable
CREATE TABLE "gameweek_lineups" (
    "id" TEXT NOT NULL,
    "gameweek_id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "is_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_vice_captain" BOOLEAN NOT NULL DEFAULT false,
    "is_starting" BOOLEAN NOT NULL DEFAULT true,
    "position" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gameweek_lineups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "gameweek_lineups_gameweek_id_team_id_player_id_key" ON "gameweek_lineups"("gameweek_id", "team_id", "player_id");
CREATE INDEX "gameweek_lineups_gameweek_id_idx" ON "gameweek_lineups"("gameweek_id");
CREATE INDEX "gameweek_lineups_team_id_idx" ON "gameweek_lineups"("team_id");
CREATE INDEX "gameweek_lineups_player_id_idx" ON "gameweek_lineups"("player_id");

-- AddForeignKey
ALTER TABLE "gameweek_lineups" ADD CONSTRAINT "gameweek_lineups_gameweek_id_fkey" FOREIGN KEY ("gameweek_id") REFERENCES "gameweeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gameweek_lineups" ADD CONSTRAINT "gameweek_lineups_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "gameweek_lineups" ADD CONSTRAINT "gameweek_lineups_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "real_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "gameweeks" ADD COLUMN "lineup_frozen_at" TIMESTAMP(3);

-- lineup_frozen_at stays NULL for every existing gameweek.
-- fantasy_team_players is the squad managers can still edit for the live
-- gameweek. It is not a history of GW1, GW2, and so on. Copying those rows
-- onto past gameweeks would invent lineups, so this migration does not
-- insert any gameweek_lineups rows.

-- AlterTable
ALTER TABLE "fantasy_point_transactions" ADD COLUMN "team_id" TEXT;

-- AddForeignKey
ALTER TABLE "fantasy_point_transactions" ADD CONSTRAINT "fantasy_point_transactions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "fantasy_teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Point rows were unique on (user, player, gameweek) and did not store a team.
-- A manager with exactly one team in that season can be attached truthfully.
-- A manager with two teams in the season cannot: the same row was shared.
-- Those rows stay team_id NULL and must not be copied onto both teams.
UPDATE "fantasy_point_transactions" AS t
SET "team_id" = sub.team_id
FROM (
    SELECT txn.id AS txn_id, MIN(ft.id) AS team_id
    FROM "fantasy_point_transactions" AS txn
    JOIN "gameweeks" AS gw ON gw.id = txn.gameweek_id
    JOIN "fantasy_teams" AS ft ON ft.user_id = txn.user_id
    JOIN "university_leagues" AS ul ON ul.id = ft.league_id AND ul.season_id = gw.season_id
    GROUP BY txn.id
    HAVING COUNT(DISTINCT ft.id) = 1
) AS sub
WHERE t.id = sub.txn_id;

-- Drop the old per-user uniqueness. It may exist as a constraint (db push)
-- or only as an index. supabase-init.sql did not create it.
ALTER TABLE "fantasy_point_transactions" DROP CONSTRAINT IF EXISTS "fantasy_point_transactions_user_id_player_id_gameweek_id_key";
DROP INDEX IF EXISTS "fantasy_point_transactions_user_id_player_id_gameweek_id_key";

-- CreateIndex
-- team_id is nullable so legacy rows can remain. Postgres treats NULLs as
-- distinct, so several unattributed rows for one player do not collide.
CREATE UNIQUE INDEX "fantasy_point_transactions_team_id_player_id_gameweek_id_key" ON "fantasy_point_transactions"("team_id", "player_id", "gameweek_id");
CREATE INDEX "fantasy_point_transactions_team_id_idx" ON "fantasy_point_transactions"("team_id");

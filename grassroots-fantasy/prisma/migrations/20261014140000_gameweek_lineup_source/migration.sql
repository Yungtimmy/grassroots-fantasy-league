-- How a gameweek lineup row was captured.
-- Hand-run this in the Supabase SQL editor. The app does not apply it
-- (db push is not migrate deploy, and this must not be run against a
-- database you have not chosen).
--
-- Existing rows are real freezes, so they stay source = 'frozen'.
-- Rows written by Rebuild squads use source = 'rebuilt'.

ALTER TABLE "gameweek_lineups" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'frozen';

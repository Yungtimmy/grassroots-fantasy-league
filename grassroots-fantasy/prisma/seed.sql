DELETE FROM scoring_rules;
DELETE FROM app_config;

INSERT INTO scoring_rules (id, event, position, points, description, created_at, updated_at) VALUES
('seed_appearance', 'APPEARANCE', NULL, 2, '+2 for playing any minutes', NOW(), NOW()),
('seed_goal_gk', 'GOAL', 'GK', 10, 'Goal scored by goalkeeper', NOW(), NOW()),
('seed_goal_def', 'GOAL', 'DEF', 6, 'Goal scored by defender', NOW(), NOW()),
('seed_goal_mid', 'GOAL', 'MID', 5, 'Goal scored by midfielder', NOW(), NOW()),
('seed_goal_fwd', 'GOAL', 'FWD', 4, 'Goal scored by forward', NOW(), NOW()),
('seed_assist', 'ASSIST', NULL, 3, 'Goal assist', NOW(), NOW()),
('seed_cs_gk', 'CLEAN_SHEET', 'GK', 5, 'Clean sheet (GK)', NOW(), NOW()),
('seed_cs_def', 'CLEAN_SHEET', 'DEF', 4, 'Clean sheet (DEF)', NOW(), NOW()),
('seed_cs_mid', 'CLEAN_SHEET', 'MID', 1, 'Clean sheet (MID)', NOW(), NOW()),
('seed_save', 'SAVE', 'GK', 1, 'Goalkeeper save', NOW(), NOW()),
('seed_pen_save', 'PENALTY_SAVE', 'GK', 5, 'Penalty save', NOW(), NOW()),
('seed_yellow', 'YELLOW_CARD', NULL, -1, 'Yellow card', NOW(), NOW()),
('seed_red', 'RED_CARD', NULL, -3, 'Red card', NOW(), NOW()),
('seed_own', 'OWN_GOAL', NULL, -2, 'Own goal', NOW(), NOW()),
('seed_pen_miss', 'PENALTY_MISS', NULL, -2, 'Penalty miss', NOW(), NOW());

INSERT INTO app_config (id, key, value, updated_at) VALUES
('cfg_platform_name', 'platform_name', 'Grassroots Fantasy League', NOW()),
('cfg_tagline', 'platform_tagline', 'Represent your university. Compete nationally.', NOW()),
('cfg_formation', 'default_formation', '4-4-2', NOW()),
('cfg_xi', 'starting_xi_size', '11', NOW()),
('cfg_bench', 'bench_size', '5', NOW()),
('cfg_squad', 'squad_size', '16', NOW()),
('cfg_cap', 'captain_multiplier', '3', NOW()),
('cfg_vice', 'vice_captain_multiplier', '2', NOW()),
('cfg_fee', 'registration_fee', '500', NOW()),
('cfg_budget', 'budget', '1000', NOW());

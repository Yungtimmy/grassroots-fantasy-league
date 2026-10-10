# WORK.md — Codespace Memory

This file is the persistent brain for this repo. Read it at the start of every session. Update it at the end of every session with what changed, what is still broken, and what to do next.

Last updated: 2026-10-10 (Leaderboard squad reveal, bench 1x, admin recompute for one gameweek)

**Git branch: `ADMIN`** (repo initialized at workspace root `cfl/`)

---

## Product in one sentence

**Grassroots Fantasy League (GFL)** is a Nigerian university fantasy football platform. Admins enter every university, club, player, price, gameweek, and fixture. Students register by picking their university, then pick a starting 11 + 5 subs and compete on university + national leaderboards.

Brand: **GFL**. Tagline: *Represent your university. Compete nationally.*

---

## Repo layout

```
cfl/                          ← workspace root, git repo, branch ADMIN
├── WORK.md                   ← this file
├── .gitignore
├── CFL/                      ← empty placeholder (unused)
└── grassroots-fantasy/       ← the Next.js app
```

---

## Stack

| Layer | Choice |
|---|---|
| App | Next.js 14 (App Router), React 18, TypeScript |
| Styling | Tailwind, brand/pitch/surface tokens, Inter + Outfit |
| DB | Prisma 5 + **Supabase Postgres** (was SQLite). API keys in `.env`. Needs **database password** from Dashboard → Connect to finish `db push`. |
| Admin | Password only. Cookie `gfl-admin`. No user account. `/admin` unlock form. |
| Student auth | bcryptjs + jose JWT cookie `gfl-token` (7 days) |
| Payments | Mock default, Flutterwave |
| Money | NGN, registration fee ₦520 |
| Budget | **1000 stored = 100.0m**. Prices stored as tenths (55 = 5.5m) |

---

## How content is created now (operator-first)

Nothing public is mocked. Admin fills the platform in this order:

1. **Season** — `/admin/seasons`
2. **Universities** — `/admin/universities` (these become the register dropdown)
3. **Clubs** — `/admin/clubs`
4. **Players** — `/admin/players` (name, club, position, price in millions)
5. **Gameweeks** — `/admin/gameweeks`
6. **Fixtures** — `/admin/matches` (gameweek + home club vs away club + date + time)

Those fixtures are the only source for `/fixtures`. Those universities are the only source for register. Those players/clubs/prices are the only source for `/squad`.

---

## Nav rules

| State | Navbar |
|---|---|
| Logged out | Logo + Login + Register. **No other pages.** Landing is `/`. |
| Logged in | Dashboard, Squad, Fixtures, Leaderboard. **Home is gone.** Logo → `/dashboard`. |
| Admin | Go to `/admin`, type `ADMIN_PASSWORD`. No register/login. Not in the guest navbar. |

`(main)` layout requires auth. Guests hitting `/squad`, `/fixtures`, etc. redirect to `/auth/login`. Logged-in users hitting `/` redirect to dashboard (admin → `/admin`).

Public universities pages are **deleted**. `/players` redirects to `/squad`. Team builder redirects to `/squad`.

---

## Squad

Route: `/squad`

- Starting 11 on a pitch (formation: 4-4-2 default, several others)
- 5 substitutes
- Budget 100.0m
- Captain (C) from starting 11, optional vice (V)
- Market is admin-entered `RealPlayer`s only
- Saves via `POST /api/teams` (`formation` + 16 player slots with `isStarting` / captain flags)

---

## Admin (`/admin`)

Gated by `user.role === 'admin'`. Unauthenticated → `/auth/login`.

| Page | What you enter |
|---|---|
| Universities | Name, short name, state. Shown on register. Auto-creates a league for the current season. |
| Seasons | Dates + fee. Auto-creates leagues for existing universities. |
| Clubs | Real clubs (Arsenal, etc.). Required before players and fixtures. |
| Players | Name, position, club dropdown, price in millions (e.g. 12.5). |
| Gameweeks | Number, name, deadline, start/end. |
| Fixtures (`/admin/matches`) | Gameweek, home club, away club, date, time, venue. Shows on `/fixtures`. Delete supported. Results/stats still here. |
| Scoring / Payments / Users | Existing operator tools. |

Admin login:

- Email: `admin@gfl.com`
- Password: `password123`

---

## Domain (Prisma)

Unchanged models. Important defaults:

- `FantasyTeam.budget` default **1000** (100.0m)
- Squad size **16** (11 + 5), not classic FPL 15
- `Match` has **no** `seasonId` — belongs to a gameweek only

Helper: `src/lib/league.ts` — `getCurrentSeason`, `ensureUniversityLeague`, `ensureLeaguesForSeason`.

Price helpers in `src/lib/utils.ts`: `FANTASY_BUDGET`, `toStoredPrice`, `fromStoredPrice`, `formatFantasyPrice`.

---

## App surface

### Guest

| Route | Purpose |
|---|---|
| `/` | Marketing landing only (how-it-works + register/login). No uni list, no fake tables. |
| `/auth/login` | Sign in |
| `/auth/register` | Pick university (admin list) → account → optional payment |

### Signed-in student

| Route | Purpose |
|---|---|
| `/dashboard` | Points, ranks, squad snapshot |
| `/squad` | Pick 11 + 5 |
| `/fixtures` | Admin-entered gameweeks / club vs club / date / time |
| `/leaderboard` | Grassroots + university rankings |
| `/dashboard/team` | View saved squad |
| `/dashboard/profile` | Profile |
| `/dashboard/payments` | Payments |
| `/players` | Redirect → `/squad` |
| `/dashboard/team/builder` | Redirect → `/squad` |

### Chrome

`AppChrome` hides Navbar/Footer/MobileNav on `/admin` and `/auth`. Admin has its own sidebar.

---

## Seed (no mock content)

`prisma/seed.ts` now only creates:

- Admin user
- Scoring rules (one APPEARANCE rule at 2 pts; <60 mins handled in apply code)
- AppConfig (squad 16, bench 5, budget 1000)

**Not seeded:** universities, clubs, players, seasons, gameweeks, matches, sample users, fantasy teams.

DB was force-reset and re-seeded on 2026-09-07.

---

## Scoring (user-specified rules)

Stat saves and the admin "apply scoring" action both call `recomputeGameweekPoints` inside one database transaction. It rebuilds that gameweek from the **saved lineup** and stored stats, and **sets** totals. Running it again does not add a second copy.

- The whole squad in that gameweek's lineup snapshot scores. Substitutes score their base points at `BENCH_MULTIPLIER` (1x) and count toward GW Points and Overall. Set it to 0 to drop the bench again. Captain is 3x and vice-captain is 2x for whoever holds those roles in the snapshot, including when both play. `FantasyTeamPlayer` is the squad managers can still edit; it is not history.
- A snapshot (`gameweek_lineups` plus `gameweeks.lineup_frozen_at`) is taken when an admin moves that gameweek to active or finished, and on the first stat save of the live gameweek if it is not frozen yet. The live gameweek is the earliest one still `upcoming` or `active`. Once it is `finished`, the next gameweek is live and the old squad must not be rebuilt from `FantasyTeamPlayer`.
- Gameweeks with no snapshot cannot be scored from the current squad. Stat save returns 409. `npm run points:recompute` warns and skips them. `--capture-live` copies the current squad onto the live gameweek only.
- Points are stored on `teamId`. A manager with two teams in one season gets two totals. Old rows are attached to a team only when that manager had exactly one team in the season (see the migration). Other old rows stay unattributed.
- Appearance: +2 for any minutes above 0. There is no separate under-60 rate.
- Goal: GK 10, DEF 8, MID 6, FWD 5 (a scored penalty is entered as a goal, not a second event)
- Assist 3
- Clean sheet: GK 5, DEF 4, and only when minutes are above 0
- Penalty save (GK, the PS column): +5. Penalty miss (PM): -2
- Goalkeeper saves are stored and not scored
- Goal conceded (GK): -2, only when minutes are above 0
- Yellow -1, Red -3, Own goal -2
- Captain ×3 and vice-captain ×2, from `ROLE_MULTIPLIERS` in `src/lib/scoring-engine.ts`. Both apply when both play. No vice-captain fallback. Substitutes use `BENCH_MULTIPLIER` (1), not the captain or vice rate.
- `ScoringRule` rows override those point values when present. Role multipliers do not read `app_config` (an old seed had captain at 2).
- Two matches in the same gameweek are added together, then the multiplier is applied once.
- My Team badges, dashboard GW Points, Overall, and the leaderboards all use that team's transactions. Admin player total is the unmultiplied base.

Tests: `npm test` in `grassroots-fantasy/`.
Rebuild one gameweek (dry run, then write): `npm run points:recompute -- --gameweek "<name or id>"`, then the same command with `--write`. That is the active gameweek when you pass its exact name or id. Omitting `--gameweek` rebuilds every snapshotted gameweek. A gameweek with no snapshot is skipped unless you also pass `--capture-live`, and that flag only copies the current squad onto the live gameweek. The same one-gameweek recompute is on Admin → Gameweeks → Recompute points: the dialog is a dry run, and Confirm recompute calls `recomputeAllStoredPoints` in the script's transaction. It refuses a gameweek with no lineup snapshot. Read-only audit of finished gameweeks with no snapshot: `npm run points:audit`. It writes nothing and does not build snapshots. Do not run the write against production until the dry run has been checked. The migration file is `prisma/migrations/20261010103000_gameweek_lineup_snapshots/migration.sql`.

---

## Known remaining gaps

Fixed sessions: mock seed, public universities page, nav, fixtures source, squad page, admin clubs, player club+price UX, dashboard/teams/leaderboard wiring, admin login redirect, Match `seasonId` create bug, register university-only payload.

Fixed 2026-09-08 (this session):
- **#1 FIXED**: Scoring now awards ALL owners (`findMany` instead of `findFirst`).
- **#2 FIXED**: Re-applying scoring now resets `totalPoints` first (deletes old txns, decrements team totals, then re-applies).
- **#4 FIXED**: `ScoringService.calculateAllPoints` now accepts `gameweekId` param (no more empty string).
- Added `@@unique([userId, playerId, gameweekId])` constraint to `FantasyPointTransaction`.
- Created missing `/api/leaderboard/gameweek` route (gameweek tab was broken).
- Fixed leaderboard page response handling for gameweek tab.

Still open:

1. Vice-captain stays on 2x when the captain blanks. That is the rule (no fallback), not a bug.
2. Register still auto-joins the league; payment verify does not enroll (two funnels).
3. No deadline lock on squad edits.
4. No max-3-per-club rule.
5. No live EPL feed — fixtures and stats are admin-only by design.
6. Empty folders: `src/components/fantasy/`, `leaderboard/`, `university/`.
7. Empty unused route group `(auth)/login` and `(auth)/register` (no `page.tsx`).
8. No tests, Flutterwave in test mode.

---

## Secrets (never commit)

Stored only in `grassroots-fantasy/.env` (gitignored):

- `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (browser-safe)
- `SUPABASE_SECRET_KEY` (server only — do not prefix `NEXT_PUBLIC_`)
- `ADMIN_PASSWORD` (currently `gfl-admin-2026` — change it)
- `DATABASE_URL` — **still needs the Postgres password** from Supabase Dashboard → Project Settings → Database → Connect (URI). The `sb_secret_` key is **not** the DB password. Prisma cannot TCP-connect without it.
- `FLUTTERWAVE_PUBLIC_KEY` / `FLUTTERWAVE_SECRET_KEY` / `FLUTTERWAVE_ENCRYPTION_KEY` — Flutterwave test mode keys.

Helper: `src/lib/supabase.ts` (`createSupabaseAdminClient` uses the secret). Runtime data still goes through Prisma once `DATABASE_URL` works.

SQL dump of the schema: `prisma/supabase-init.sql` (paste into Supabase SQL editor if you want tables before Prisma can connect).

---

## Session log

### 2026-09-07 — Initial read

Mapped the original app: dual university/national fantasy league, Next.js + Prisma, lots of frontend/API mismatch and mock seed data.

### 2026-09-07 — ADMIN branch overhaul

**Decisions**

- Git repo at `cfl/`, working branch **`ADMIN`**.
- Admin is the source of truth for universities, clubs, players/prices, gameweeks, fixtures.
- Guest nav is empty except auth. Signed-in nav has no Home.
- Universities public pages removed. Players page became Squad (11 + 5).
- All mock universities/clubs/players/fixtures/users stripped from seed.

**Files (high signal)**

- Nav/chrome: `navbar.tsx`, `mobile-nav.tsx`, `footer.tsx`, `app-chrome.tsx`, `layout.tsx`, `(main)/layout.tsx`
- Guest home: `src/app/page.tsx` (no mock boards)
- Squad: `src/app/(main)/squad/page.tsx`; `/players` and team builder redirect here
- Fixtures: `(main)/fixtures/page.tsx` reads DB only
- Admin: `admin/clubs/page.tsx` (new), universities/players/matches/gameweeks/seasons, admin nav includes Clubs + Fixtures
- APIs: `admin/teams` POST/PUT/DELETE, matches without `seasonId`, universities auto-league, register by `universityId`, `/api/teams` 16-man save, `/api/user/dashboard`
- Seed: admin + rules + config only
- Deleted: `(main)/universities/**`

**What works now**

- Admin logs in at `/auth/login` → `/admin`
- Add universities → they appear on register
- Add clubs/players/prices → they appear on Squad
- Add gameweek + club vs club + date/time → they appear on Fixtures
- Empty platform until admin types data

### 2026-09-08 — Password-only admin + Supabase

**Done**

- `/admin` is a password gate. No student login/register required. Cookie `gfl-admin`.
- `requireAdmin()` checks that cookie, not `user.role`.
- Home/nav no longer treat a user as admin.
- Prisma datasource switched to `postgresql`.
- Supabase URL + publishable + secret stored in `.env`. REST API verified with the secret (empty project, no tables yet).
- Seed no longer creates an admin user.

**Blocked**

- Cannot `prisma db push` until we have the **database password** (Dashboard → Connect URI). API keys are not enough for Postgres TCP.
- `npm install @supabase/supabase-js` hung in this environment; dependency is in `package.json`.

**Need from you**

Paste the Supabase **connection string** (Session pooler URI) or the **database password**. Then I push schema + seed scoring rules.

### 2026-09-08 — Production audit + scoring fixes

**Done**

- Fixed scoring engine: `findMany` for all owners, reset-on-reapply, proper `gameweekId`.
- Added `@@unique` constraint on `FantasyPointTransaction([userId, playerId, gameweekId])`.
- Created `/api/leaderboard/gameweek` route (was missing, gameweek tab was broken).
- Fixed leaderboard page response handling.
- Full build passes (56 routes, 0 type errors).

**Still needs**

- Database password for `prisma db push` to Supabase.
- Tests (no test framework yet).
- Paystack integration (mock works).
- Deadline lock, max-3-per-club, vice-captain fallback.

### 2026-09-08 — Flutterwave migration + squad UX

**Done**

- Removed all Paystack code: `PaystackProvider`, `verifyPaystackSignature`, inline popup, Script tag.
- Added `FlutterwaveProvider`: uses `/v3/payments` + `/v3/transactions/verify_by_reference`.
- Webhook now verifies `verif-hash` header with HMAC-SHA256 on the encryption key.
- Callback reads `tx_ref` instead of `reference`/`trxref`.
- Register page loads Flutterwave checkout script, uses `FlutterwaveCheckout()` inline popup.
- `.env` updated: `PAYMENT_PROVIDER=flutterwave`, keys stored.
- Squad page: budget progress bar (green→yellow→red), football pitch background via `url('/pitch.jpg')` fallback gradient.
- 0 TypeScript errors, all Paystack references eliminated.

### 2026-09-09 — Dashboard redesign + navbar auth gating

**Done**

- Dashboard redesigned: single rounded card with gameweek info, countdown, GW points, overall points, rank, and rank change (up/down by X).
- "My Squad" section: 5-column sharp-cornered grid showing GK, DEF, MID, MID, FWD. Empty if no squad. "View Squad >" link with arrow icon.
- "Leaderboard Preview" section: user rank at top (highlighted), next 4 ranks below with tiny divider lines. Profile initial, name, points, "pts" label. "View All >" link.
- Navbar hidden for guests (returns null when not signed in). Login/Register buttons removed from navbar (only in footer/auth pages).
- Dashboard accessible without auth (shows empty state, "Sign In" button in header).
- 0 TypeScript errors.

**Still needs**

- Seed Faculty/Department data for FUNAAB so dropdowns have real data.
- Test payment flow with Flutterwave in development mode.
- Tests (no test framework yet).
- Deadline lock, max-3-per-club, vice-captain fallback.

### 2026-10-10 — Idempotent scoring

Stat saves were calling `ScoringService.calculateAllPoints`, which upserted the gameweek transaction but **incremented** `FantasyTeam.totalPoints` on every save. A second save of the same fixture added the points again. Two matches in one gameweek overwrote the single `(user, player, gameweek)` row and still incremented the team total for both. Bench players were included. My Team badges read every manager's transaction for that player and kept one of them, so a captain multiplier could show on the wrong squad.

`recomputeGameweekPoints` now replaces the gameweek inside a transaction. Failures roll back and the admin stats modal shows the error. `npm run points:recompute` prints before/after and writes only with `--write`.

### 2026-10-10 — Lineup snapshots and team-keyed points

Rescoring a finished gameweek was reading `FantasyTeamPlayer`, which only holds the current squad. Points were also unique on `(user, player, gameweek)`, so two teams of one manager shared one score.

`GameweekLineup` freezes starter, bench, captain, and vice per team at the live gameweek's lock. Scoring reads that snapshot. The recompute script skips any gameweek with `lineup_frozen_at` null. The migration does not invent historical lineups. It sets `team_id` on existing point rows only when the manager has one team in that season. Do not run the migration or `--write` against the live database from this environment.

`npm run points:audit` is read-only. The pre-fix stat save overwrote each point row and incremented the team total, so a row's ratio is x1, x2, or x3 from the last save, and stacking is `totalPoints` minus the sum of the rows. It does not build snapshots. It has not been run against a database.

`npm run points:freeze -- --gameweek "Week 1"` previews copying today's squads onto that named gameweek, including one that is already finished. `--confirm` writes the snapshot. The same action is on the admin gameweeks page (dry run, then Confirm freeze). It refuses when a snapshot exists, this deadline has not passed, a later gameweek has opened or passed its deadline, or a squad was saved after this deadline. It cannot prove the lock was on the whole time. Safe order: merge, migrate, freeze, re-save the Appearance, audit, recompute dry run, recompute write, and only then end matches and open the next gameweek. Do not run it against the live database from this environment.

### 2026-10-10 — Leaderboard squad reveal

National and university leaderboards open a manager's starting XI, bench, captain, and vice, with that gameweek's points keyed by team (`teamGameweekPointRows`). The week is `findDisplayedGameweek` (active, else the latest finished). `GET /api/leaderboard/squad/[userId]` reveals another squad only when that gameweek is `active` and its deadline has passed. Before that it returns 403 and `Squads reveal at the deadline`, with no players, and it ignores client `gameweekId` / `locked` / `reveal` flags. A frozen lineup (`lineupFrozenAt`) is what gets shown; the current squad is used only when that locked gameweek has no snapshot yet. The signed-in manager can always read their own squad. Leaderboard GETs are already public, so viewing someone else's squad does not require sign-in. Own squad editing is unchanged on `/api/teams`. Bench players are listed with the stored points for that team, which are 1x after substitutes score at `BENCH_MULTIPLIER`.

### 2026-10-10 — Admin recompute for one gameweek

Merged `ADMIN` (PR #6: current gameweek, postpone/move, `--gameweek`) into the bench 1x branch. Admin → Gameweeks → Recompute points previews that gameweek (before, after, delta, totals) and writes only after Confirm recompute, using `recomputeAllStoredPoints`. A gameweek with no lineup snapshot is refused. The action requires the admin session and logs `[recompute-points]`.

### 2026-10-10 — Substitutes score at 1x

`BENCH_MULTIPLIER` in `src/lib/scoring-engine.ts` is 1. The five substitutes score their base points at that rate and the award is stored like any other, so GW Points, Overall, leaderboards, and My Team badges include them. Captain stays 3x and vice stays 2x from the lineup snapshot. A captain or vice flag on a substitute does not raise the rate. Set `BENCH_MULTIPLIER` to 0 to drop the bench again. Do not run `points:recompute --write` against the live database from this environment.

### 2026-09-11 — Payment guard + fee fix + profile faculty/department

**Done**

- **Payment bypass fixed**: Dashboard API returns `hasPaid`. If `hasPaid === false`, dashboard page redirects to `/leagues` (prevents skipping payment by navigating directly to `/dashboard`).
- **Flutterwave amount fixed**: Default fallback changed from 50000 (₦500) to 52000 (₦520). Server-side `registrationFee` changed from 5000 to 5200. Auto-updates existing season from 5000→5200 on payment init.
- **Faculty/department in profile**: Profile page now has dropdown selectors for Faculty and Department (fetched from `/api/universities/{slug}/faculties` and `/api/faculties/{id}/departments`). API PATCH accepts `facultyId`/`departmentId`. GET returns `facultyId`, `departmentId`, `universitySlug`.

**Still needs**

- Seed Faculty/Department data for FUNAAB so dropdowns have real data.
- Test payment flow with Flutterwave in development mode.
- Tests (no test framework yet).
- Deadline lock, max-3-per-club, vice-captain fallback.
- Fix Google OAuth `bad_oauth_state` (update Supabase dashboard → Authentication → URL Configuration with Vercel domain).

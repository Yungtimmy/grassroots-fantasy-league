# WORK.md — Codespace Memory

This file is the persistent brain for this repo. Read it at the start of every session. Update it at the end of every session with what changed, what is still broken, and what to do next.

Last updated: 2026-10-10 (test-database setup for preview checks)

**Git branch: `ADMIN`** (repo initialized at workspace root `cfl/`)

Preview checks: `grassroots-fantasy/TESTING.md`. `npm run testdb:setup` applies `schema.prisma` and seeds a season, two gameweeks, clubs, squads, and three managers. It refuses to run unless `DATABASE_URL` and `DIRECT_URL` (when set) point at Supabase project `rctbzvpieotfmoagqbbk`.

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

- Appearance: 1 (any minutes)
- Goal: GK 10, DEF 8, MID 6, FWD 5
- Assist 3
- Clean sheet: GK 5, DEF 4 (no MID)
- Save (GK) 0, penalty save 5
- Goal conceded (GK): -2
- Yellow -1, Red -3, Own goal -2
- Captain ×3, Vice captain ×2
- No 60+ minute bonus, no penalty miss penalty

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

1. Vice-captain does not take the multiplier if captain blanks.
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

### 2026-10-10 — Preview test database

**Done**

- `npm run testdb:setup` pushes `schema.prisma` and seeds a season, two gameweeks, clubs, valid 16-man squads, and three managers. It exits before any write unless `DATABASE_URL` and `DIRECT_URL` (if set) are Supabase project `rctbzvpieotfmoagqbbk`.
- Manual preview checklists are in `grassroots-fantasy/TESTING.md`.

**Not run**

- The setup script was not executed against a database. Refuse-path checks only.

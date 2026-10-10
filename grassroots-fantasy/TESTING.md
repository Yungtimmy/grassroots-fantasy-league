# Testing a preview

Use a separate, empty Supabase project whose ref is `rctbzvpieotfmoagqbbk`. `npm run testdb:setup` checks `DATABASE_URL` and `DIRECT_URL` and exits before it writes anything if either one points anywhere else.

The live project is not this database. Do not put its URL in the preview.

## Preview env vars

In Vercel: project → **Settings** → **Environment Variables**. Add each variable with only **Preview** ticked. Then **Deployments** → the preview → **Redeploy**.

Copy the test project's connection strings from Supabase → **Connect**:

| Variable | What to put |
|---|---|
| `DATABASE_URL` | Transaction pooler, port **6543** |
| `DIRECT_URL` | Session pooler or `db.rctbzvpieotfmoagqbbk.supabase.co`, port **5432** |
| `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` | `https://rctbzvpieotfmoagqbbk.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key |
| `SUPABASE_SECRET_KEY` | Secret key |
| `JWT_SECRET` / `ADMIN_SESSION_SECRET` | Any long random string |
| `ADMIN_PASSWORD` | The password you will type on the admin gate |
| `NEXT_PUBLIC_APP_URL` | The preview origin, `https://…vercel.app` |
| `PAYMENT_PROVIDER` | `mock` |

Put the same `DATABASE_URL` and `DIRECT_URL` in `grassroots-fantasy/.env` on your machine (that file stays uncommitted). In Supabase → **Authentication** → **URL Configuration**, add the preview origin to **Redirect URLs**, or **Sign in with Google** will bounce.

## Load the database

From `grassroots-fantasy/`:

```bash
npm run testdb:setup
```

That pushes `schema.prisma` (this repo uses `prisma db push`, not a migration history) and seeds a season, clubs, players, and three managers. Running it again resets seeded fixture stats and those managers' points. It does not delete anyone else.

Schema push uses `DIRECT_URL` when it is set, because port 6543 cannot apply DDL. If `DIRECT_URL` is missing and `DATABASE_URL` is port 6543, the command refuses and writes nothing.

PR #2 (`cursor/fix-gameweek-scoring-b7dd`) adds a gameweek lineup snapshot migration. The preview does not apply schema by itself. Before the scoring checklist, check out that branch with this script on it (merge this branch in locally) and run `npm run testdb:setup` again so the new table exists. Then open that PR's preview.

## Accounts

Password for all three: `gfl-test-2026`. Admin is not one of these. Admin is `/teblad` plus `ADMIN_PASSWORD`, then **Unlock**.

| Email | Manager | Squad note |
|---|---|---|
| `ada.captain@gfl.test` | Ada Okonkwo (FUNAAB) | Captains **Chidi Okafor** |
| `bola.vice@gfl.test` | Bola Adeyemi (UNILAG) | Vice-captains **Chidi Okafor**. Captains **Emeka Dual** |
| `chioma.bench@gfl.test` | Chioma Eze (UI) | Starts Chidi with no badge. **Ngozi Bench** is a sub |

The sign-in page only has **Sign in with Google**. On the preview, open the browser console and paste this once:

```javascript
async function gflSignIn(email) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: "gfl-test-2026" }),
  });
  const data = await res.json();
  console.log(data.success ? "signed in as " + email : data);
  return data;
}
```

Call `gflSignIn("ada.captain@gfl.test")`, then open **Home** (`/dashboard`) and **Your Team** (`/dashboard/team`). Switch managers from the avatar menu → **Logout**, then call `gflSignIn` again. **Logout** first, in a private window, before the security checks.

Seeded scoring rules: appearance **+2** for any minutes, midfielder goal **+6**. Chidi is a midfielder, so 90 minutes and 2 goals is a base of **14**.

## Security (PR #1)

Branch `cursor/fix-auth-claim-admin-reset-9141`. Logged out.

1. In the console: `fetch("/api/auth/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: "ada.captain@gfl.test" }) }).then(async (r) => console.log(r.status, await r.json()))`. Status is **401**, `success` is false. The navbar stays hidden. You are not Ada.
2. `fetch("/api/admin/reset-test", { method: "POST" }).then(async (r) => console.log(r.status, await r.json()))`. Status is **401**. Open `/teblad`, **Unlock**, sidebar **Gameweeks**. **Gameweek 1** and **Gameweek 2** are still there. Do not click **Reset Test Data**.
3. `/auth/login` → **Sign in with Google**. A Google account that already has a GFL user lands on **Home**. A new one reaches **Complete Your Profile**.
4. **Register now** (or `/oauth/consent`) → **Sign in with Google** → **Complete Your Profile**. **University** shows **Federal University of Agriculture, Abeokuta**. Type a **Username**, click **Register & Pay**. With `PAYMENT_PROVIDER=mock` you end up signed in, not on an error page.

## Scoring (PR #2)

Branch `cursor/fix-gameweek-scoring-b7dd`, after the second `testdb:setup`. Enter stats on **Gameweek 2** only. **Home** GW Points follow that latest gameweek. **Gameweek 1**'s deadline is already past; leave it alone.

`/teblad` → **Unlock** → **Fixtures**. On the **GW2** row **LAG** vs **IBA**, click **Stats**.

1. **Chidi Okafor**: Min `90`, G `2`. **Ngozi Bench**: Min `90`. Everyone else stays 0, CS off. **Save Statistics**.
2. Sign in as each manager. On **Your Team**, Full Squad (and the pitch card) shows Chidi as **+42** with **C** for Ada, **+28** with **VC** for Bola, and **+14** with neither badge for Chioma. Ngozi is **0** on Chioma's Full Squad. **Home** **GW Points** and **Overall** are 42, 28, and 14. **Leaderboard** (season **2026/27 Test Season**, column **Total Points**) matches Overall. Admin **Players**, column **Points**: Chidi **14**, Ngozi **2**. Ngozi's 2 is not inside Chioma's 14.
3. Open the same **Stats** modal and click **Save Statistics** again without edits. Overall stays 42 / 28 / 14.
4. Set Chidi's Min to `0`, leave G at `2`. **Save Statistics**. Overall falls to 36 / 24 / 12. Click **Appearance**, click **Chidi Okafor**, **Save Statistics**. Only Chidi changes: Ada **+6**, Bola **+4**, Chioma **+2** (back to 42 / 28 / 14). **Save Statistics** again. Nothing changes.
5. Set Chidi's G from `2` to `1`. **Save Statistics**. Overall falls to 24 / 16 / 8. The badge, **GW Points**, **Overall**, **Total Points**, and Chidi's admin **Points** (**8**) all match. Ngozi is still 0 on Chioma's team.
6. **Kunle Adebayo** (DEF): leave Min at `0` and tick **CS**. **Save Statistics**. His admin **Points** stay 0 and nobody's Overall changes. Click **Auto Clean Sheet**. His CS box, and every other 0-minute GK or DEF, stays empty.

**Two fixtures, do this last.** **Emeka Dual** (Ile-Ife Athletic) plays **IFE** vs **ABJ** and **ENU** vs **IFE** in Gameweek 2. He starts for all three. Ada has no badge on him, Bola captains him, Chioma has no badge on him. Give him Min `90` in both modals and **Save Statistics** on each. Admin **Points** become **4** (2+2), not 2. Badges: Ada **+4**, Bola **+12**, Chioma **+4**, added on top of the totals above. Run `npm run testdb:setup` again if you want those totals back to zero.

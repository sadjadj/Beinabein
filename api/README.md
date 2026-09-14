# Beinabein API

Express + Postgres backend replacing Base44's hosted backend. One generic route handles all 36
entity types (`base44-entities/*.jsonc`) — see `server.js` for the full route reference.

## Run locally

```bash
cp .env.example .env   # fill in DATABASE_URL (a local/dev Postgres)
npm install
npm start
```

Listens on `:3000` by default — matches `../dashboard`'s dev proxy.

## Admins

No signup — admins are created/reset one at a time by running `scripts/upsert-admin.js`. Same
command for a new admin or a forgotten password; it always forces a password change on next login.

Pass a password as a second argument to set a specific one instead of the shared default
(`password`, override via `DEFAULT_ADMIN_PASSWORD`).

### Locally

```bash
DATABASE_URL=... node scripts/upsert-admin.js sadjad
# admin 'sadjad' ready. Temporary password: password
```

`DATABASE_URL` must point at the target Postgres — for the live one on Hamravesh, temporarily
enable its "آدرس خارجی" (external address) to get a connection string reachable from outside.

### On Hamravesh (no external address needed)

Open a Terminal/Console on the **`beinabein`** app itself (not the Postgres app) — it already runs
with the correct `DATABASE_URL` set, so no connection string needed:

```bash
cd /app
node scripts/upsert-admin.js sadjad
```

## Test

```bash
npm test
```

Runs the filter/sort/update translation self-check (`src/queryBuilder.test.js`) — pure logic, no
DB needed. Live-DB behavior has been verified manually against real Postgres containers, not as
an automated test — see `../../task.md`.

## Migrate existing Base44 data

`scripts/migrate-from-base44.js` — one-off, needs `BASE44_APP_ID`, `BASE44_APP_BASE_URL`,
`API_BASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD` (a real admin on this backend). Already run once —
see `../../task.md` for the migrated row counts. Safe to re-run (upserts by id).

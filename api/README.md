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
DATABASE_URL=... node scripts/upsert-admin.js <username>
# admin '<username>' ready. Temporary password: password
```

`DATABASE_URL` must point at the target Postgres — for the live one on Hamravesh, temporarily
enable its "آدرس خارجی" (external address) to get a connection string reachable from outside.

### On Hamravesh (no external address needed)

Open a Terminal/Console on the **`beinabein`** app itself (not the Postgres app) — it already runs
with the correct `DATABASE_URL` set, so no connection string needed:

```bash
cd /app
node scripts/upsert-admin.js <username>
```

## Test

```bash
npm test
```

Runs the filter/sort/update translation self-check (`src/queryBuilder.test.js`) — pure logic, no
DB needed.

For live-DB correctness — every entity's full create/get/list/filter/update/updateMany/bulk/delete
lifecycle, plus the public/admin route boundary — run the smoke test against a real running
instance instead of clicking through the dashboard by hand:

```bash
API_BASE_URL=http://localhost:3000 ADMIN_USER=... ADMIN_PASSWORD=... node scripts/smoke-test.js
```

Prints a pass/fail line per entity. Only ever run this against a local/test instance — it writes
and deletes real records (cleans up after itself, but still, never point it at production).

## Migrate existing Base44 data

`scripts/migrate-from-base44.js` — one-off, needs `BASE44_APP_ID`, `BASE44_APP_BASE_URL`,
`API_BASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD` (a real admin on this backend). Already run once —
see `../../task.md` for the migrated row counts. Safe to re-run (upserts by id).

## Backups (daily, on the maintainer's Mac)

`scripts/backup-from-api.js` dumps every entity from a running API into
`backups/api-<date-time>/<Entity>.json` (one JSON file per entity, all rows). `backups/` is
git-ignored — it holds real customer data, never commit it. Only the `entities` table is covered,
not `admins` or `admin_logs`.

```bash
API_BASE_URL=https://beinabein-space.ir ADMIN_USER=backup ADMIN_PASSWORD=... node scripts/backup-from-api.js
```

- Takes 1–2 minutes. After a fully successful run it deletes `api-*` folders older than 7 days
  (`KEEP_DAYS` in the script); a failed run deletes nothing. Manual folders (e.g. the Sep 12 Base44
  exports) are never touched.
- Exits non-zero if any entity fails or reaches the API's 5000-row cap (rows would be cut off).
- `backup` is a full admin account created with `node scripts/upsert-admin.js backup <password>`
  (see "Admins" above). Its password lives only in `~/.beinabein-backup.env` on the Mac
  (`API_BASE_URL`, `ADMIN_USER`, `ADMIN_PASSWORD`, chmod 600).

### The schedule

A macOS launchd agent, `~/Library/LaunchAgents/com.beinabein.backup.plist`, runs the script daily at
12:00 (or on wake if the Mac was asleep) from this repo checkout, logging to
`~/Library/Logs/beinabein-backup.log`. It runs whatever branch is checked out, so keep `main` and
`stage` in sync.

```bash
launchctl kickstart gui/$(id -u)/com.beinabein.backup      # run one backup now
tail -5 ~/Library/Logs/beinabein-backup.log                # check the last run
launchctl bootout gui/$(id -u)/com.beinabein.backup        # stop the schedule
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.beinabein.backup.plist   # start it again
```

### Restoring

`scripts/restore-from-backup.js` writes a backup folder back through the bulk route, which upserts
by id: rows in the backup overwrite the live row with the same id (deleted rows are re-created).
Rows created after the backup are left alone — nothing is deleted. Name the one entity you need:

```bash
API_BASE_URL=https://beinabein-space.ir ADMIN_USER=... ADMIN_PASSWORD=... \
  node scripts/restore-from-backup.js backups/api-<date-time> WorkshopPurchase
```

To see what a record looked like on a given day, open that folder's `<Entity>.json`. Before
any risky change to production data, take a fresh backup first.

## Running a local copy with real data

Docker Postgres + this API + the dashboard, loaded from a backup folder (do not point local dev at
production — the dashboard can edit and delete):

```bash
docker run -d --name beinabein-pg-local -e POSTGRES_PASSWORD=local -e POSTGRES_DB=beinabein -p 5433:5432 postgres:16-alpine
cd api
export DATABASE_URL=postgres://postgres:local@localhost:5433/beinabein
node scripts/upsert-admin.js localadmin localpass123
npm start &                                        # API on :3000
API_BASE_URL=http://localhost:3000 ADMIN_USER=localadmin ADMIN_PASSWORD=localpass123 \
  node scripts/restore-from-backup.js backups/<folder>
cd ../dashboard && npx vite --port 5173            # http://localhost:5173/dashboard/
```

Log in as `localadmin` / `localpass123` (it asks for a new password; after that, the API login
changes too). Stop with `docker rm -f beinabein-pg-local`.

## Running one-off code on production (Hamravesh Terminal)

Open the Terminal on the **`beinabein`** app (not `beinabein-pg`); `DATABASE_URL` is already set,
there is no `psql`, so query with `node`:

```bash
cd /app && node -e "require('./src/db').pool.query('SELECT count(*) FROM entities').then(r=>{console.log(r.rows);process.exit()})"
```

- A script file written to `/tmp` must `require('/app/src/db')` — a relative path resolves from `/tmp`.
- Write placeholders like `<password>` without the angle brackets; the shell reads `<` as a redirect.
- Cheap safety net before a bulk data fix: `CREATE TABLE x_backup AS SELECT * FROM entities WHERE
  collection='...'`, check the row counts match, and `DROP TABLE` it once you are sure.

## Things learned the hard way

- `GET /api/entities/:name` returns at most 500 rows by default (5000 max), newest first. Pages
  that need one record's children must use `.filter({ workshop_id: id })`, not `list()` plus a
  client-side filter — the old workshop page silently lost registrations of older workshops.
- Many WorkshopPurchase rows imported into Base44 on 2026-07-10 had no `purchase_date` (the real
  dates were never in Base44). On 2026-09-26 they were backfilled with `created_date`, so those
  registrations all show 10 Jul 2026 — an import date, not the real registration date.
- The dashboard's "must change password" lock is client-side only; the API accepts the temporary
  password straight away (scripts such as the backup rely on that).

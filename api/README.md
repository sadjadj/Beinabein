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

No signup — admins are created/reset one at a time:

```bash
DATABASE_URL=... node scripts/upsert-admin.js sadjad
# admin 'sadjad' ready. Temporary password: password
# They will be required to set their own password on first login.
```

Pass a password as a second argument to set a specific one instead of the shared default.
Same command works for a forgotten password — it always forces a change on next login.

## Test

```bash
npm test
```

Runs the filter/sort/update translation self-check (`src/queryBuilder.test.js`) — pure logic, no
DB needed. There's no live-DB test yet; see `../../task.md` for that open item.

## Migrate existing Base44 data

`scripts/migrate-from-base44.js` — one-off, needs `BASE44_APP_ID`, `BASE44_APP_BASE_URL`,
`BASE44_TOKEN` (from the Base44 dashboard) in addition to `DATABASE_URL`. Not run yet.

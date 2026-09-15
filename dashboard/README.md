# Beinabein Dashboard

Admin panel, React/Vite. Talks to `../api` (the Express/Postgres backend in this same monorepo),
not to Base44 — this app no longer depends on Base44 for hosting or data.

## Run locally

Start the backend first (`../api`, see its own README), then:

```bash
npm install
npm run dev
```

Vite's dev server proxies `/api` requests to `http://localhost:3000` (see `vite.config.js`) so the
app can talk to `../api` running locally without a separate env var.

## Build

```bash
npm run build
```

Outputs to `dist/`, served at the `/dashboard/` path in production (see `vite.config.js`'s
`base`). Sign-in is `/login` — no signup, an admin account must already exist (see below).

## Admins

No signup — an admin account is created or reset one at a time by running `scripts/upsert-admin.js`
in `../api` (same command for a new admin or a forgotten password; always forces a password change
on next login).

**Locally:**
```bash
DATABASE_URL=... node scripts/upsert-admin.js <username>
# admin '<username>' ready. Temporary password: password
```
(`DATABASE_URL` must point at the target Postgres — for the live one on Hamravesh, temporarily
enable its "آدرس خارجی" to get a connection string reachable from outside.)

**On Hamravesh:** open a Terminal on the **`beinabein`** app itself (not the Postgres app) — it
already has the right `DATABASE_URL` set:
```bash
cd /app
node scripts/upsert-admin.js <username>
```

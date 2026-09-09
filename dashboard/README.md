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
`base`). Admin auth is HTTP Basic Auth, handled by `../api` — the browser prompts for credentials
on first admin-only request.

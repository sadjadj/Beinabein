# Beinabein

Monorepo, two independent apps:

- `dashboard/` — the admin panel (React/Vite), formerly hosted on Base44. See `dashboard/README.md`
  for its own local-dev notes (some of which are now stale leftovers from the Base44 workflow).
- `api/` — Express + Postgres backend replacing Base44's hosted backend. Generic entity CRUD for
  the 36 entity types in `api/base44-entities/` (vendored from `dashboard/base44/entities/` — keep
  both in sync if entities change).

Each app has its own `package.json`/`node_modules`/Dockerfile and builds independently.

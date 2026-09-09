# Beinabein

Monorepo, three independent apps:

- `dashboard/` — the admin panel (React/Vite), formerly hosted on Base44. See `dashboard/README.md`
  for its own local-dev notes (some of which are now stale leftovers from the Base44 workflow).
- `api/` — Express + Postgres backend replacing Base44's hosted backend. Generic entity CRUD for
  the 36 entity types in `api/base44-entities/` (vendored from `dashboard/base44/entities/` — keep
  both in sync if entities change). Shared by `dashboard/` (admin-only routes) and `client/`
  (the few public routes).
- `client/` — the public signup flow, anonymous, no login. See `client/README.md` for what's
  built vs. still blocked on design/backend decisions.

Each app has its own `package.json`/`node_modules`/Dockerfile and builds independently.

# Beinabein Client

Public signup flow (workshop listing + registration), React/Vite. Fully anonymous — no login.
Converted from `Signup Flow CodeBase/SignupFlow.html` (a static Tailwind-CDN mockup).

## Status

- Workshops listing + detail sheet: done, wired to real data (`GET /api/entities/Workshop`).
- Registration step 1 (name/phone form): built, UI only — submit is disabled.
- Registration step 2 (phone verification) and step 3 (payment): not built. Step 2 has no backend
  (no OTP/SMS endpoint exists); step 3 has no design yet (the original mockup left it as "به‌زودی").
- Result page: not built (the original mockup's success/failed cards were empty placeholders).

## Run locally

Start `../api` first (see its README), then:

```bash
npm install
npm run dev
```

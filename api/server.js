'use strict';

// ── API Reference ─────────────────────────────────────────────────────────────
//
//  Generic entity CRUD, one route per action, entity name is the collection.
//  PUBLIC (no auth): GET Workshop (list/get), POST Person, POST WorkshopPurchase.
//  Everything else needs HTTP Basic Auth against the `admins` table
//  (bcrypt-hashed passwords — see scripts/upsert-admin.js to create/reset one).
//
//  GET    /api/entities/:name?sort=-created_date&limit=500
//  GET    /api/entities/:name/:id
//  POST   /api/entities/:name              body: record fields
//  POST   /api/entities/:name/bulk         body: array of records
//  POST   /api/entities/:name/filter       body: { field: value | { $in: [...] } }
//  PUT    /api/entities/:name/:id          body: partial patch (shallow merge)
//  PATCH  /api/entities/:name/many         body: { filter, set }
//  DELETE /api/entities/:name/:id
//  DELETE /api/entities/:name/many         body: filter
//  GET    /api/me                          admin only — { user, mustChangePassword }
//  PATCH  /api/admin/password              admin only — body: { currentPassword, newPassword }
//
//  Everything else serves the two static frontend builds the Dockerfile bakes
//  into public/ and public/dashboard/ (client and dashboard respectively) —
//  not present when running `api/` alone in local dev, where each frontend's
//  own Vite dev server handles that instead.
// ─────────────────────────────────────────────────────────────────────────────

const path = require('node:path');
const express = require('express');
const bcrypt = require('bcryptjs');
const { pool, initDb } = require('./src/db');
const { requireAdmin, MIN_PASSWORD_LENGTH } = require('./src/auth');
const entitiesRouter = require('./src/routes/entities');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// Default 100kb is too small for bulk-importing a few hundred records at
// once (hit this for real: Person/649 rows and WorkshopPurchase/611 rows
// both 500'd on the default limit during migration).
app.use(express.json({ limit: '10mb' }));

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.get('/api/me', requireAdmin, (req, res) => {
  res.json({ user: req.adminUser, mustChangePassword: req.adminMustChangePassword });
});

// Requires currentPassword explicitly, checked independently against the
// stored hash — not just trusting that requireAdmin already validated the
// Basic Auth header on this same request. That distinction matters: the
// stored credential in localStorage auto-attaches to every request, so on an
// already-unlocked/logged-in device, whoever's sitting there could otherwise
// change the password without ever knowing it. Re-checking it here closes
// that gap (the standard "re-enter your password" pattern for sensitive
// actions, even mid-session).
app.patch('/api/admin/password', requireAdmin, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ error: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} کاراکتر باشد` });
    }
    const { rows } = await pool.query('SELECT password_hash FROM admins WHERE username = $1', [req.adminUser]);
    const currentOk = rows[0] && (await bcrypt.compare(currentPassword || '', rows[0].password_hash));
    if (!currentOk) {
      return res.status(400).json({ error: 'رمز عبور فعلی اشتباه است' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admins SET password_hash = $1, must_change_password = false WHERE username = $2',
      [hash, req.adminUser]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

app.use('/api/entities', entitiesRouter);

// Anything else under /api is a bad route — 404 as JSON, not the client's
// index.html (would otherwise fall through to the catch-alls below).
app.use('/api', (req, res) => res.status(404).json({ error: 'not found' }));

// /dashboard's static files + SPA fallback MUST be registered before the root
// ones below, or root's catch-all would swallow every /dashboard/* request.
app.use('/dashboard', express.static(path.join(PUBLIC_DIR, 'dashboard')));
app.get('/dashboard/*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'dashboard', 'index.html')));

app.use(express.static(PUBLIC_DIR));
app.get('*', (req, res) => res.sendFile(path.join(PUBLIC_DIR, 'index.html')));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`beinabein-api listening on :${PORT}`)))
  .catch((err) => {
    console.error('failed to init db', err);
    process.exit(1);
  });

'use strict';

// ── API Reference ─────────────────────────────────────────────────────────────
//
//  Generic entity CRUD, one route per action, entity name is the collection.
//  PUBLIC (no auth): GET Workshop (list/get), POST Person, POST WorkshopPurchase, POST Application,
//  POST /api/files/resume. Anonymous writes are rate-limited per IP (src/rateLimit.js).
//  Everything else needs HTTP Basic Auth against the `admins` table
//  (bcrypt-hashed passwords — see scripts/upsert-admin.js to create/reset one).
//
//  GET    /api/entities/:name?sort=-created_date[&limit=N]   no limit = all rows
//  GET    /api/entities/:name/:id
//  POST   /api/entities/:name              body: record fields
//  POST   /api/entities/:name/bulk         body: array of records
//  POST   /api/entities/:name/filter       body: { field: value | { $in: [...] } | { $gte, $lte } }
//  PUT    /api/entities/:name/:id          body: partial patch (shallow merge)
//  PATCH  /api/entities/:name/many         body: { filter, set }
//  DELETE /api/entities/:name/:id
//  DELETE /api/entities/:name/many         body: filter
//  GET    /api/me                          admin only — { user, mustChangePassword }
//  GET    /api/stats/workshop-registrations  admin only — per-workshop count/totals
//  PATCH  /api/admin/password              admin only — body: { currentPassword, newPassword }
//  POST   /api/files/resume                 PUBLIC, rate-limited — raw PDF body (≤5MB), X-Filename header → { id, filename }
//  GET    /api/files/:id                    admin only — download an uploaded file (logged to admin_logs)
//  PUT    /api/files/:id                    admin only — restore a file under its id (raw PDF body, X-Filename)
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
const { saveResumePdf, restoreFile } = require('./src/files');
const { limitPublicSubmissions } = require('./src/rateLimit');

const app = express();
// Exactly one proxy (Hamravesh's ingress) sits in front of this app, so req.ip
// is the visitor's address from the last X-Forwarded-For hop — what the public
// rate limit keys on. Trusting more hops would let a client spoof its own IP.
app.set('trust proxy', 1);
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
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'رمز عبور جدید باید با رمز فعلی فرق داشته باشد' });
    }
    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admins SET password_hash = $1, must_change_password = false WHERE username = $2',
      [hash, req.adminUser]
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Per-workshop registration count and money totals, aggregated in SQL so the
// workshops list doesn't have to download every registration just to count.
// Amount = price * quantity + donation, same formula as the dashboard's
// computeWorkshopRevenue / WorkshopProfile totals. paid_amount = full amount
// of paid registrations + the paid instalments of instalment registrations
// still in progress — mirrors purchasePaidAmount in dashboard/src/lib/installments.js.
app.get('/api/stats/workshop-registrations', requireAdmin, async (req, res, next) => {
  try {
    const amount = `COALESCE((data->>'price')::numeric, 0) * COALESCE(NULLIF((data->>'quantity')::numeric, 0), 1) + COALESCE((data->>'donation')::numeric, 0)`;
    const paidInstallments = `(SELECT COALESCE(SUM((i->>'amount')::numeric), 0)
         FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'installments') = 'array' THEN data->'installments' ELSE '[]'::jsonb END) AS i
        WHERE COALESCE(i->>'paid_date', '') <> '')`;
    const { rows } = await pool.query(
      `SELECT data->>'workshop_id' AS workshop_id,
              COUNT(*)::int AS purchase_count,
              COALESCE(SUM(${amount}), 0)::float8 AS total_amount,
              COALESCE(SUM(CASE WHEN (data->>'is_paid')::boolean THEN ${amount} ELSE ${paidInstallments} END), 0)::float8 AS paid_amount
         FROM entities WHERE collection = 'WorkshopPurchase'
        GROUP BY 1`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// Resume PDFs: raw PDF body, original name in X-Filename (URI-encoded). 6mb lets
// files.js answer an oversize upload with its own Persian message; past that
// the body parser's 413 kicks in.
const pdfBody = express.raw({ type: 'application/pdf', limit: '6mb' });
const headerFilename = (req) => {
  try { return decodeURIComponent(req.get('X-Filename') || ''); } catch { return ''; }
};

// Public: the club-owner-call form uploads the resume as soon as it's picked,
// then submits the application with the returned id.
app.post('/api/files/resume', limitPublicSubmissions, pdfBody, async (req, res, next) => {
  try {
    res.status(201).json(await saveResumePdf(req.body, headerFilename(req)));
  } catch (err) { next(err); }
});

// Admin-only download of an uploaded file. Every download is written to
// admin_logs (resumes are personal data — who opened which one is worth knowing).
app.get('/api/files/:id', requireAdmin, async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT filename, content_type, data FROM files WHERE id = $1', [req.params.id]);
    pool.query(
      `INSERT INTO admin_logs (admin_username, method, entity, entity_id, status_code) VALUES ($1, 'GET', 'File', $2, $3)`,
      [req.adminUser, req.params.id, rows[0] ? 200 : 404]
    ).catch((err) => console.error('admin_logs insert failed', err));
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.set('Content-Type', rows[0].content_type);
    res.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rows[0].filename)}`);
    res.set('X-Content-Type-Options', 'nosniff'); // never let a browser second-guess it as HTML/script
    res.send(rows[0].data);
  } catch (err) { next(err); }
});

// Admin-only: put a backed-up file back under its original id (scripts/restore-from-backup.js).
app.put('/api/files/:id', requireAdmin, pdfBody, async (req, res, next) => {
  try {
    await restoreFile(req.params.id, req.body, headerFilename(req));
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
  // err.status = a deliberate client error (e.g. queryBuilder's bad field name)
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'internal error' });
});

initDb()
  .then(() => app.listen(PORT, () => console.log(`beinabein-api listening on :${PORT}`)))
  .catch((err) => {
    console.error('failed to init db', err);
    process.exit(1);
  });

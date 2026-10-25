'use strict';

const express = require('express');
const crypto = require('node:crypto');
const { pool } = require('../db');
const { requireAdmin } = require('../auth');
const { ENTITY_NAMES } = require('../schemas');
const { buildWhere, buildSetParam, parseSort } = require('../queryBuilder');
const { limitPublicSubmissions } = require('../rateLimit');

const router = express.Router();

// Signup flow is fully anonymous — these are the only reads/writes it's allowed.
// Everything else on every other entity needs an admin. Scoped to the exact
// action, not just method+entity, so e.g. POST Person/bulk still needs admin.
const PUBLIC_ACTIONS = new Set(['list:Workshop', 'get:Workshop', 'create:Person', 'create:WorkshopPurchase', 'create:Application']);

function publicOr(action) {
  return (req, res, next) => {
    if (!PUBLIC_ACTIONS.has(`${action}:${req.params.name}`)) return requireAdmin(req, res, next);
    // The dashboard sends its admin credential on public actions too (e.g. adding a
    // Person) — verify it, so admin writes are audit-logged and never rate-limited.
    if (req.headers.authorization) return requireAdmin(req, res, next);
    if (action === 'create') return limitPublicSubmissions(req, res, next);
    next();
  };
}

// Reject unknown entity names before anything else touches the DB.
router.param('name', (req, res, next, name) => {
  if (!ENTITY_NAMES.includes(name)) return res.status(404).json({ error: `unknown entity: ${name}` });
  next();
});

// Audit log for admin-triggered requests — skips the public signup actions
// (no adminUser set for those). Captures the request body (what the admin
// actually sent) and, on error (>=400), the response body too, so this stays
// useful for "what did they send and why did it fail" debugging. Query
// admin_logs directly (see scripts/view-logs.js) — no route exposes this.
router.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    res.locals.responseBody = body;
    return originalJson(body);
  };
  res.on('finish', () => {
    if (!req.adminUser) return;
    const hasBody = req.body && Object.keys(req.body).length > 0;
    const errorMessage = res.statusCode >= 400 ? JSON.stringify(res.locals.responseBody) : null;
    pool.query(
      `INSERT INTO admin_logs (admin_username, method, entity, entity_id, status_code, request_body, error_message)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.adminUser, req.method, req.params.name || null, req.params.id || null, res.statusCode, hasBody ? JSON.stringify(req.body) : null, errorMessage]
    ).catch((err) => console.error('admin_logs insert failed', err));
  });
  next();
});

function toRecord(row) {
  return { id: row.id, ...row.data };
}

// GET /api/entities/:name?sort=-created_date[&limit=N]
// No limit = every row. A default cap here silently truncated whole-table
// reads (dashboard counts/totals came out low once a collection passed 500
// rows), so a limit only applies when a caller explicitly asks for one.
router.get('/:name', publicOr('list'), async (req, res, next) => {
  try {
    const { column, direction } = parseSort(req.query.sort);
    const limit = Number(req.query.limit) || null; // LIMIT NULL = no limit
    const { rows } = await pool.query(
      `SELECT id, data FROM entities WHERE collection = $1 ORDER BY ${column} ${direction} LIMIT $2`,
      [req.params.name, limit]
    );
    res.json(rows.map(toRecord));
  } catch (err) { next(err); }
});

// POST /api/entities/:name/filter  body: mongo-style equality/$in/$gte/$lte filter object
router.post('/:name/filter', publicOr('filter'), async (req, res, next) => {
  try {
    // startIndex 2: $1 is already taken by collection = $1 below.
    const { clause, params } = buildWhere(req.body, 2);
    const { rows } = await pool.query(
      `SELECT id, data FROM entities WHERE collection = $1 AND (${clause})`,
      [req.params.name, ...params]
    );
    res.json(rows.map(toRecord));
  } catch (err) { next(err); }
});

// POST /api/entities/:name/bulk  body: array of records
router.post('/:name/bulk', publicOr('bulkCreate'), async (req, res, next) => {
  try {
    const now = new Date().toISOString();
    // id is normally omitted (fresh record, server assigns one) — the
    // migration script passes it explicitly to keep cross-entity references
    // (workshop_id, facilitator_ids, ...) pointing at the right rows.
    const records = req.body.map(({ id, ...r }) => ({ id: id || crypto.randomUUID(), data: { created_date: now, ...r } }));
    for (const r of records) {
      await pool.query(
        `INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3)
         ON CONFLICT (collection, id) DO UPDATE SET data = EXCLUDED.data`,
        [req.params.name, r.id, r.data]
      );
    }
    res.status(201).json(records.map((r) => toRecord({ id: r.id, data: r.data })));
  } catch (err) { next(err); }
});

// PATCH /api/entities/:name/many  body: { filter, set }
router.patch('/:name/many', publicOr('updateMany'), async (req, res, next) => {
  try {
    // startIndex 2: $1 is collection, and the SET value goes after params
    // (params.length + 2 below already assumed this offset — only buildWhere
    // itself was still defaulting to 1).
    const { clause, params } = buildWhere(req.body.filter, 2);
    const setParam = buildSetParam(req.body.set);
    const { rowCount } = await pool.query(
      `UPDATE entities SET data = data || $${params.length + 2}::jsonb WHERE collection = $1 AND (${clause})`,
      [req.params.name, ...params, setParam]
    );
    res.json({ updated: rowCount });
  } catch (err) { next(err); }
});

// DELETE /api/entities/:name/many  body: filter
router.delete('/:name/many', publicOr('deleteMany'), async (req, res, next) => {
  try {
    // Bulk delete would skip the in-use check below; nothing needs it for categories.
    if (req.params.name === 'ExpenseCategory') return res.status(400).json({ error: 'delete expense categories one at a time' });
    // startIndex 2: $1 is already taken by collection = $1 below.
    const { clause, params } = buildWhere(req.body, 2);
    const { rowCount } = await pool.query(
      `DELETE FROM entities WHERE collection = $1 AND (${clause})`,
      [req.params.name, ...params]
    );
    res.json({ deleted: rowCount });
  } catch (err) { next(err); }
});

// GET /api/entities/:name/:id
router.get('/:name/:id', publicOr('get'), async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT id, data FROM entities WHERE collection = $1 AND id = $2', [req.params.name, req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(toRecord(rows[0]));
  } catch (err) { next(err); }
});

// POST /api/entities/:name  body: record fields (no id)
router.post('/:name', publicOr('create'), async (req, res, next) => {
  try {
    const id = crypto.randomUUID();
    const data = { created_date: new Date().toISOString(), ...req.body };
    if (req.params.name === 'Application' && !req.adminUser) {
      // Honeypot: `website` is a field real visitors never see. Bots fill it —
      // answer as if it worked so they don't retry, and store nothing.
      if (data.website) return res.status(201).json({});
      delete data.website;
      // Public club-owner-call submissions always start unreviewed — the sender
      // can't pre-set their own status; only admins move it on from there.
      data.status = 'submitted';
      // The resume PDF was uploaded beforehand (POST /api/files/resume); keep its id
      // only if that file really exists, and take its name from the stored row.
      delete data.resume_file_name;
      if (data.resume_file_id) {
        const { rows } = await pool.query('SELECT filename FROM files WHERE id = $1', [String(data.resume_file_id)]);
        if (rows[0]) data.resume_file_name = rows[0].filename;
        else delete data.resume_file_id;
      }
    }
    await pool.query('INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3)', [req.params.name, id, data]);
    res.status(201).json(toRecord({ id, data }));
  } catch (err) { next(err); }
});

// PUT /api/entities/:name/:id  body: partial patch, shallow-merged
router.put('/:name/:id', publicOr('update'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'UPDATE entities SET data = data || $3::jsonb WHERE collection = $1 AND id = $2 RETURNING id, data',
      [req.params.name, req.params.id, buildSetParam(req.body)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'not found' });
    res.json(toRecord(rows[0]));
  } catch (err) { next(err); }
});

// DELETE /api/entities/:name/:id
router.delete('/:name/:id', publicOr('delete'), async (req, res, next) => {
  try {
    if (req.params.name === 'ExpenseCategory') {
      // facilitator_payment drives the facilitator picker on the expense form.
      if (req.params.id === 'facilitator_payment') return res.status(409).json({ error: 'this category is built-in and cannot be deleted' });
      const { rows } = await pool.query(
        `SELECT count(*)::int AS n FROM entities WHERE collection = 'Expense' AND data->>'category' = $1`,
        [req.params.id]
      );
      if (rows[0].n) return res.status(409).json({ error: `category is used by ${rows[0].n} expenses` });
    }
    if (req.params.name === 'Application') {
      // The resume PDF belongs to the application — remove it along with it.
      await pool.query(
        `DELETE FROM files WHERE id = (SELECT data->>'resume_file_id' FROM entities WHERE collection = 'Application' AND id = $1)`,
        [req.params.id]
      );
    }
    const { rowCount } = await pool.query('DELETE FROM entities WHERE collection = $1 AND id = $2', [req.params.name, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;

'use strict';

const express = require('express');
const crypto = require('node:crypto');
const { pool } = require('../db');
const { requireAdmin } = require('../auth');
const { ENTITY_NAMES } = require('../schemas');
const { buildWhere, buildSetParam, parseSort } = require('../queryBuilder');

const router = express.Router();

// Signup flow is fully anonymous — these are the only reads/writes it's allowed.
// Everything else on every other entity needs an admin. Scoped to the exact
// action, not just method+entity, so e.g. POST Person/bulk still needs admin.
const PUBLIC_ACTIONS = new Set(['list:Workshop', 'get:Workshop', 'create:Person', 'create:WorkshopPurchase']);

function publicOr(action) {
  return (req, res, next) => {
    if (PUBLIC_ACTIONS.has(`${action}:${req.params.name}`)) return next();
    return requireAdmin(req, res, next);
  };
}

// Reject unknown entity names before anything else touches the DB.
router.param('name', (req, res, next, name) => {
  if (!ENTITY_NAMES.includes(name)) return res.status(404).json({ error: `unknown entity: ${name}` });
  next();
});

function toRecord(row) {
  return { id: row.id, ...row.data };
}

// GET /api/entities/:name?sort=-created_date&limit=500
router.get('/:name', publicOr('list'), async (req, res, next) => {
  try {
    const { column, direction } = parseSort(req.query.sort);
    const limit = Math.min(Number(req.query.limit) || 500, 5000);
    const { rows } = await pool.query(
      `SELECT id, data FROM entities WHERE collection = $1 ORDER BY ${column} ${direction} LIMIT $2`,
      [req.params.name, limit]
    );
    res.json(rows.map(toRecord));
  } catch (err) { next(err); }
});

// POST /api/entities/:name/filter  body: mongo-style equality/$in filter object
router.post('/:name/filter', publicOr('filter'), async (req, res, next) => {
  try {
    const { clause, params } = buildWhere(req.body);
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
    const { clause, params } = buildWhere(req.body.filter);
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
    const { clause, params } = buildWhere(req.body);
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
    const { rowCount } = await pool.query('DELETE FROM entities WHERE collection = $1 AND id = $2', [req.params.name, req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'not found' });
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;

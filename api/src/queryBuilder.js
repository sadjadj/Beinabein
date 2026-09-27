// Translates the Mongo-shaped filter/update objects the frontend already sends
// (leftover from Base44's SDK) into Postgres JSONB WHERE/SET clauses, so the
// route handlers stay a couple lines of SQL each. Pure functions, no DB access —
// keeps the actual query-shape logic unit-testable without a live Postgres.
'use strict';

// Field names get interpolated into SQL (they can't be bound params), so only
// plain identifiers get through — anything else is a 400, never SQL. The sort
// param on Workshop list is public, so this is the anonymous-facing boundary.
function columnFor(field) {
  if (field === 'id') return 'id';
  if (!/^[A-Za-z0-9_]+$/.test(field)) {
    const err = new Error(`invalid field name: ${field}`);
    err.status = 400;
    throw err;
  }
  return `data->>'${field}'`;
}

// COLLATE "C" = plain byte order, so ISO date strings compare the same way
// the dashboard's JS string comparisons do (locale collations can reorder).
const RANGE_OPS = { $gte: '>=', $lte: '<=' };

// filter: { field: value } for equality, { field: { $in: [...] } } for IN,
// { field: { $gte, $lte } } for string ranges (dates).
// AND across all keys — that's the only combinator any caller currently sends.
function buildWhere(filter, startIndex = 1) {
  const keys = Object.keys(filter || {});
  if (keys.length === 0) return { clause: 'TRUE', params: [] };

  const parts = [];
  const params = [];
  let i = startIndex;

  for (const key of keys) {
    const value = filter[key];
    const column = columnFor(key);
    if (value && typeof value === 'object' && Array.isArray(value.$in)) {
      parts.push(`${column} = ANY($${i}::text[])`);
      params.push(value.$in.map(String));
    } else if (value && typeof value === 'object' && Object.keys(value).some((op) => RANGE_OPS[op])) {
      for (const [op, bound] of Object.entries(value)) {
        if (!RANGE_OPS[op]) continue;
        parts.push(`${column} COLLATE "C" ${RANGE_OPS[op]} $${i}`);
        params.push(String(bound));
        i += 1;
      }
      continue;
    } else {
      parts.push(`${column} = $${i}`);
      params.push(String(value));
    }
    i += 1;
  }

  return { clause: parts.join(' AND '), params };
}

// patch: { field: newValue, ... } — shallow-merged into the existing JSONB blob.
function buildSetParam(patch) {
  return JSON.stringify(patch);
}

// sort like '-created_date' or 'name' -> { column, direction }
function parseSort(sort) {
  if (!sort) return { column: `data->>'created_date'`, direction: 'DESC' };
  const desc = sort.startsWith('-');
  const field = desc ? sort.slice(1) : sort;
  return { column: columnFor(field), direction: desc ? 'DESC' : 'ASC' };
}

module.exports = { buildWhere, columnFor, buildSetParam, parseSort };

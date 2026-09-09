// Translates the Mongo-shaped filter/update objects the frontend already sends
// (leftover from Base44's SDK) into Postgres JSONB WHERE/SET clauses, so the
// route handlers stay a couple lines of SQL each. Pure functions, no DB access —
// keeps the actual query-shape logic unit-testable without a live Postgres.
'use strict';

// filter: { field: value } for equality, { field: { $in: [...] } } for IN.
// AND across all keys — that's the only combinator any caller currently sends.
function buildWhere(filter, startIndex = 1) {
  const keys = Object.keys(filter || {});
  if (keys.length === 0) return { clause: 'TRUE', params: [] };

  const parts = [];
  const params = [];
  let i = startIndex;

  for (const key of keys) {
    const value = filter[key];
    const column = key === 'id' ? 'id' : `data->>'${key}'`;
    if (value && typeof value === 'object' && Array.isArray(value.$in)) {
      parts.push(`${column} = ANY($${i}::text[])`);
      params.push(value.$in.map(String));
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
  const column = field === 'id' ? 'id' : `data->>'${field}'`;
  return { column, direction: desc ? 'DESC' : 'ASC' };
}

module.exports = { buildWhere, buildSetParam, parseSort };

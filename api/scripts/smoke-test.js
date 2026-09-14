// Exercises the full CRUD/filter/bulk lifecycle for every one of the 36
// entities against a REAL running api instance — the same class of check
// that caught the filter-route 500 bug, just made repeatable instead of
// clicking through 34 dashboard pages by hand.
//
// Run against local Docker only — never against the live production URL,
// even though every record it creates gets deleted again. See ../README.md.
//
// Usage:
//   API_BASE_URL=http://localhost:3000 ADMIN_USER=... ADMIN_PASSWORD=... \
//     node scripts/smoke-test.js
'use strict';

const { ENTITY_SCHEMAS } = require('../src/schemas');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const AUTH = 'Basic ' + Buffer.from(`${process.env.ADMIN_USER}:${process.env.ADMIN_PASSWORD}`).toString('base64');

async function api(method, path, body) {
  const res = await fetch(`${API_BASE_URL}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: AUTH },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(payload)}`);
  return payload;
}

// One representative value per JSON-schema type/enum — real values don't
// matter, just need something typed correctly to exercise the route (the
// backend doesn't currently validate against the schema, only the shape of
// the generic route logic itself, which is what this is actually testing).
function sampleValue(prop) {
  if (prop.enum) return prop.enum[0];
  if (prop.type === 'array') return [];
  if (prop.type === 'number') return 1;
  if (prop.type === 'boolean') return true;
  if (prop.format === 'date') return new Date().toISOString().slice(0, 10);
  return 'smoke-test';
}

function sampleRecord(schema) {
  const record = {};
  for (const field of schema.required || []) {
    record[field] = sampleValue(schema.properties[field] || {});
  }
  return record;
}

async function testEntity(schema) {
  const { name } = schema;
  const record = sampleRecord(schema);

  const created = await api('POST', `/entities/${name}`, record);
  const id = created.id;

  await api('GET', `/entities/${name}/${id}`);
  await api('GET', `/entities/${name}?limit=5`);

  const filtered = await api('POST', `/entities/${name}/filter`, { id });
  if (filtered.length !== 1) throw new Error(`filter by id returned ${filtered.length} rows, expected 1`);

  await api('PUT', `/entities/${name}/${id}`, { smoke_test_field: 'updated' });

  const { updated } = await api('PATCH', `/entities/${name}/many`, { filter: { id }, set: { smoke_test_field: 'updated-many' } });
  if (updated !== 1) throw new Error(`updateMany matched ${updated} rows, expected 1`);

  const bulk = await api('POST', `/entities/${name}/bulk`, [record]);
  const bulkId = bulk[0].id;

  const { deleted } = await api('DELETE', `/entities/${name}/many`, { id: bulkId });
  if (deleted !== 1) throw new Error(`deleteMany matched ${deleted} rows, expected 1`);

  await api('DELETE', `/entities/${name}/${id}`);
}

// Confirms the public/admin split itself is actually enforced — a misplaced
// entity here would silently expose financial data (too open) or break the
// signup flow (too locked down), neither of which the per-entity CRUD test
// above would catch since that always sends valid auth.
async function testAuthBoundaries() {
  const noAuth = (method, path, body) =>
    fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  const checks = [
    ['Workshop list is public', async () => (await noAuth('GET', '/entities/Workshop')).status === 200],
    ['Workshop create requires admin', async () => (await noAuth('POST', '/entities/Workshop', { title: 'x' })).status === 401],
    ['Expense (admin-only entity) requires admin', async () => (await noAuth('POST', '/entities/Expense', { title: 'x', amount: 1, date: '2026-01-01' })).status === 401],
  ];

  const results = [];
  for (const [label, check] of checks) {
    try {
      results.push({ name: label, ok: await check() });
    } catch (err) {
      results.push({ name: label, ok: false, error: err.message });
    }
  }

  // Person/WorkshopPurchase create are public too — verified via a real
  // write+cleanup instead of just a status code, since that's the actual
  // path the signup flow depends on.
  try {
    const res = await noAuth('POST', '/entities/Person', { full_name: 'smoke-test', phone: '0000000000' });
    const created = await res.json();
    await api('DELETE', `/entities/Person/${created.id}`);
    results.push({ name: 'Person create is public', ok: res.status === 201 });
  } catch (err) {
    results.push({ name: 'Person create is public', ok: false, error: err.message });
  }

  return results;
}

async function main() {
  const results = [];
  for (const schema of ENTITY_SCHEMAS) {
    try {
      await testEntity(schema);
      results.push({ name: schema.name, ok: true });
    } catch (err) {
      results.push({ name: schema.name, ok: false, error: err.message });
    }
  }
  results.push(...(await testAuthBoundaries()));

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    console.log(`${r.ok ? '✓' : '✗'} ${r.name}${r.ok ? '' : ` — ${r.error}`}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

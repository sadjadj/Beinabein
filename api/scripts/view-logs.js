// Print recent admin_logs rows — debugging aid, not exposed via any route.
//
// Usage:
//   DATABASE_URL=... node scripts/view-logs.js [--admin=username] [--errors] [--limit=50]
'use strict';

const { pool, initDb } = require('../src/db');

async function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).map((a) => {
      const [k, v] = a.replace(/^--/, '').split('=');
      return [k, v ?? true];
    })
  );

  await initDb();

  const where = [];
  const params = [];
  if (args.admin) { params.push(args.admin); where.push(`admin_username = $${params.length}`); }
  if (args.errors) where.push('status_code >= 400');
  const limit = Math.min(Number(args.limit) || 50, 1000);

  const { rows } = await pool.query(
    `SELECT created_at, admin_username, method, entity, entity_id, status_code, request_body, error_message
     FROM admin_logs
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY created_at DESC
     LIMIT ${limit}`,
    params
  );
  await pool.end();

  for (const r of rows) {
    const target = [r.entity, r.entity_id].filter(Boolean).join('/');
    const err = r.error_message ? ` — ${r.error_message}` : '';
    console.log(`${r.created_at.toISOString()}  ${r.admin_username.padEnd(12)} ${r.method.padEnd(6)} ${target.padEnd(40)} ${r.status_code}${err}`);
    if (r.request_body) console.log(`  body: ${JSON.stringify(r.request_body)}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

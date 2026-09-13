// Create a new admin, or reset an existing one's password (e.g. they forgot
// it) — same operation either way: upsert a row into `admins`. Always forces
// a password change on next login, since this script's whole purpose is
// handing someone a password you (the operator) now know — they shouldn't
// keep using it.
//
// Usage:
//   DATABASE_URL=... node scripts/upsert-admin.js <username> [password]
//
// If password is omitted, defaults to DEFAULT_ADMIN_PASSWORD (a shared,
// known temp password — fine because must_change_password locks them out of
// everything else until they set their own, see App.jsx's guard).
'use strict';

const bcrypt = require('bcryptjs');
const { pool, initDb } = require('../src/db');
const { MIN_PASSWORD_LENGTH } = require('../src/auth');

const DEFAULT_ADMIN_PASSWORD = process.env.DEFAULT_ADMIN_PASSWORD || 'password';

async function main() {
  const [username, passwordArg] = process.argv.slice(2);
  if (!username) {
    console.error('usage: node scripts/upsert-admin.js <username> [password]');
    process.exit(1);
  }
  const password = passwordArg || DEFAULT_ADMIN_PASSWORD;
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    process.exit(1);
  }

  await initDb();
  const hash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO admins (username, password_hash, must_change_password)
     VALUES ($1, $2, true)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, must_change_password = true`,
    [username, hash]
  );
  await pool.end();

  console.log(`admin '${username}' ready.${passwordArg ? '' : ` Temporary password: ${password}`}`);
  console.log('They will be required to set their own password on first login.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

'use strict';

const bcrypt = require('bcryptjs');
const { pool } = require('./db');

// ponytail: in-memory, per-process — resets on restart, doesn't share across
// replicas. Fine at our current scale (single instance); move to a
// DB-backed/Redis counter if this ever runs horizontally scaled.
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const failedAttempts = new Map(); // username -> { count, lockedUntil }

function recordFailure(username) {
  const entry = failedAttempts.get(username) || { count: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) entry.lockedUntil = Date.now() + LOCKOUT_MS;
  failedAttempts.set(username, entry);
}

// Sets req.adminUser + req.adminMustChangePassword on success, else 401s (or
// 429 if locked out from too many recent failures). Auth is HTTP Basic
// (Authorization: Basic <base64(user:pass)>) — the dashboard's Login page
// collects credentials and attaches this header itself; credentials are
// checked against the `admins` table (bcrypt hash), not an env var.
async function requireAdmin(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    const [username, password] = Buffer.from(encoded, 'base64').toString('utf8').split(':');

    const entry = failedAttempts.get(username);
    if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
      return res.status(429).json({ error: 'تلاش‌های ناموفق زیاد — چند دقیقه دیگر امتحان کنید' });
    }

    const { rows } = await pool.query('SELECT password_hash, must_change_password FROM admins WHERE username = $1', [username]);
    const admin = rows[0];
    const ok = admin && (await bcrypt.compare(password || '', admin.password_hash));

    if (!ok) {
      recordFailure(username);
      return res.status(401).json({ error: 'unauthorized' });
    }

    failedAttempts.delete(username);
    req.adminUser = username;
    req.adminMustChangePassword = admin.must_change_password;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin, MIN_PASSWORD_LENGTH: 8 };

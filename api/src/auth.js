'use strict';

const crypto = require('node:crypto');
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

// bcrypt is deliberately slow (~0.25s CPU on our server) and every dashboard
// request carries the password, so a page firing 12 requests queued ~5s of
// bcrypt. Remember which hash a credential already matched: a password change
// gives a new hash, so stale entries simply stop matching.
const verified = new Map(); // sha256(user:pass) -> password_hash it matched
async function passwordMatches(username, password, hash) {
  const key = crypto.createHash('sha256').update(`${username}:${password}`).digest('hex');
  if (verified.get(key) === hash) return true;
  if (!(await bcrypt.compare(password, hash))) return false;
  if (verified.size >= 100) verified.clear(); // ponytail: crude bound, a handful of admins
  verified.set(key, hash);
  return true;
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
    const ok = admin && (await passwordMatches(username, password || '', admin.password_hash));

    if (!ok) {
      recordFailure(username);
      return res.status(401).json({ error: 'unauthorized' });
    }

    failedAttempts.delete(username);
    req.adminUser = username;
    req.adminMustChangePassword = admin.must_change_password;
    // A temporary password only unlocks changing it — enforced here, not just in the dashboard.
    const path = req.originalUrl.split('?')[0];
    if (admin.must_change_password && path !== '/api/me' && path !== '/api/admin/password') {
      return res.status(403).json({ error: 'ابتدا رمز عبور را تغییر دهید' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireAdmin, MIN_PASSWORD_LENGTH: 8 };

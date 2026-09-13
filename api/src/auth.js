'use strict';

const crypto = require('node:crypto');

// ADMIN_USERS="sadjad:somepassword,mojde:anotherpassword" — a fixed, small
// admin list, no signup/reset flows. Add someone by editing this env var and
// redeploying; move to a real `admins` table if that becomes frequent enough
// to be annoying.
function loadAdmins() {
  const raw = process.env.ADMIN_USERS || '';
  const admins = new Map();
  for (const pair of raw.split(',').filter(Boolean)) {
    const i = pair.indexOf(':');
    if (i === -1) continue;
    admins.set(pair.slice(0, i), pair.slice(i + 1));
  }
  return admins;
}

const ADMINS = loadAdmins();

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// Sets req.adminUser on success, else 401s. Auth mechanism is still HTTP
// Basic (send an Authorization: Basic <base64(user:pass)> header) — the
// dashboard's own Login page collects credentials and attaches this header
// itself now, rather than relying on the browser's native Basic Auth popup.
// Deliberately does NOT send a WWW-Authenticate challenge header: that header
// is what makes browsers show their native login dialog on any 401 — since
// the dashboard has its own login page instead, that popup would just be
// confusing and would fire on every background auth check, not just real
// logins.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme === 'Basic' && encoded) {
    const [user, pass] = Buffer.from(encoded, 'base64').toString('utf8').split(':');
    const expected = ADMINS.get(user);
    if (expected && timingSafeEqual(pass || '', expected)) {
      req.adminUser = user;
      return next();
    }
  }
  return res.status(401).json({ error: 'unauthorized' });
}

module.exports = { requireAdmin };

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

// Sets req.adminUser on success, else 401s with a Basic-Auth challenge (browser
// shows its native login prompt — no login page needed).
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
  res.set('WWW-Authenticate', 'Basic realm="Beinabein Admin"');
  return res.status(401).json({ error: 'unauthorized' });
}

module.exports = { requireAdmin };

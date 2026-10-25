'use strict';

// Caps anonymous form submissions per visitor IP (req.ip — real client address
// because server.js trusts the one Hamravesh ingress hop in front of it).
// Shared by every public write: workshop signup (Person + WorkshopPurchase),
// club-owner-call applications and resume uploads all draw from one budget.
// ponytail: in-memory, per-process — resets on restart and isn't shared across
// replicas, same trade-off as auth.js's lockout. Move to Postgres/Redis if the
// API ever runs more than one instance.

const MAX_PER_WINDOW = 20; // ~10 applications (upload + submit) or signups per hour per address
const WINDOW_MS = 60 * 60 * 1000;
const hits = new Map(); // ip -> { count, resetAt }

// Forget expired windows so the map doesn't grow with every visitor ever seen.
setInterval(() => {
  const now = Date.now();
  for (const [ip, h] of hits) if (h.resetAt <= now) hits.delete(ip);
}, 10 * 60 * 1000).unref();

function limitPublicSubmissions(req, res, next) {
  const now = Date.now();
  let h = hits.get(req.ip);
  if (!h || h.resetAt <= now) {
    h = { count: 0, resetAt: now + WINDOW_MS };
    hits.set(req.ip, h);
  }
  h.count += 1;
  if (h.count > MAX_PER_WINDOW) {
    res.set('Retry-After', String(Math.ceil((h.resetAt - now) / 1000)));
    return res.status(429).json({ error: 'تعداد ارسال‌ها از این دستگاه زیاد بوده — لطفاً کمی بعد دوباره تلاش کنید' });
  }
  next();
}

module.exports = { limitPublicSubmissions, MAX_PER_WINDOW };

'use strict';

// Public workshop join flow: phone → SMS code → name → pay → GroupPurchase.
// A registration only reaches the dashboard's groups once the payment is
// verified; until then it waits in the `payments` table (src/db.js).
//
// Env:
//   ZARINPAL_MERCHANT_ID   real gateway (ZARINPAL_SANDBOX=1 for sandbox.zarinpal.com)
//   SMS_API_KEY            real SMS — sendSms() below still has to be written for the provider
//   JOIN_FAKE=1            local testing: codes are logged and shown on the page,
//                          payment goes to a fake gateway page with success/fail buttons
// Without JOIN_FAKE, both SMS and Zarinpal must be configured or the flow stays closed.

const express = require('express');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pool } = require('./db');
const { limitPublicSubmissions } = require('./rateLimit');

const FAKE = process.env.JOIN_FAKE === '1';
const MERCHANT = process.env.ZARINPAL_MERCHANT_ID;
const ZP = process.env.ZARINPAL_SANDBOX === '1' ? 'https://sandbox.zarinpal.com' : 'https://payment.zarinpal.com';
const SMS_READY = !!process.env.SMS_API_KEY;
const OPEN = FAKE || (SMS_READY && !!MERCHANT);

const CODE_LENGTH = 5; // keep in sync with client/src/pages/JoinPage.jsx
const CODE_TTL = 5 * 60 * 1000;
const VERIFIED_TTL = 30 * 60 * 1000; // time to finish name + payment (and a retry) after the code
const RESEND_MS = 90 * 1000;
const MAX_TRIES = 5;

// ponytail: in-memory, per-process (same trade-off as rateLimit.js) — a restart
// mid-signup just means asking for a new code.
const codes = new Map(); // phone -> { code, expires, tries, sentAt, verifiedUntil }

async function sendSms(phone, text) {
  if (FAKE) return console.log(`[join] SMS to ${phone}: ${text}`);
  // ponytail: provider not chosen yet — call its API here with process.env.SMS_API_KEY.
  throw new Error('SMS provider not wired');
}

// The site's clubs live in clubs.json (copied next to the API by the Dockerfile;
// read from the client folder when the API runs from the repo). Read per request
// so the price always comes from the server, never from the browser.
function findClub(id) {
  for (const p of [path.join(__dirname, '..', 'clubs.json'), path.join(__dirname, '..', '..', 'client', 'src', 'data', 'clubs.json')]) {
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8')).find((c) => c.id === id);
  }
  throw new Error('clubs.json not found');
}

const jalaliMonth = (d) => {
  const parts = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Tehran' }).formatToParts(d);
  return `${parts.find((p) => p.type === 'year').value}-${parts.find((p) => p.type === 'month').value}`;
};
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Tehran' }); // YYYY-MM-DD

const insertEntity = async (collection, data) => {
  const id = crypto.randomUUID();
  await pool.query('INSERT INTO entities (collection, id, data) VALUES ($1, $2, $3)', [collection, id, { created_date: new Date().toISOString(), ...data }]);
  return { id, ...data };
};

// The club's dashboard group: clubs.json `group_id` if set, else a group with the
// same title, else a new one — so the first registration creates it in the dashboard.
async function groupFor(club) {
  const { rows } = club.group_id
    ? await pool.query(`SELECT id, data FROM entities WHERE collection = 'Group' AND id = $1`, [club.group_id])
    : await pool.query(`SELECT id, data FROM entities WHERE collection = 'Group' AND data->>'title' = $1 LIMIT 1`, [club.title]);
  if (rows[0]) return { id: rows[0].id, ...rows[0].data };
  return insertEntity('Group', { title: club.title, description: club.about || '', capacity: club.capacity || undefined, facilitator_ids: [] });
}

const isPhone = (p) => typeof p === 'string' && /^09\d{9}$/.test(p);
const bad = (res, error, status = 400) => res.status(status).json({ error });

const router = express.Router();

router.get('/config', (req, res) => res.json({ open: OPEN, fake: FAKE, codeLength: CODE_LENGTH }));

router.use((req, res, next) => (OPEN ? next() : bad(res, 'ثبت‌نام در حال حاضر امکان‌پذیر نیست.', 503)));

router.post('/code', limitPublicSubmissions, async (req, res, next) => {
  try {
    const { phone } = req.body || {};
    if (!isPhone(phone)) return bad(res, 'شماره موبایل درست نیست.');
    const prev = codes.get(phone);
    if (prev && Date.now() - prev.sentAt < RESEND_MS) return bad(res, 'کد قبلاً ارسال شده؛ کمی صبر کنید.', 429);
    const code = String(crypto.randomInt(10 ** (CODE_LENGTH - 1), 10 ** CODE_LENGTH));
    codes.set(phone, { code, expires: Date.now() + CODE_TTL, tries: 0, sentAt: Date.now() });
    await sendSms(phone, `کد ورود بینابین: ${code}`);
    res.json(FAKE ? { ok: true, devCode: code } : { ok: true });
  } catch (err) { next(err); }
});

router.post('/verify', async (req, res, next) => {
  try {
    const { phone, code } = req.body || {};
    const e = codes.get(phone);
    if (!e || e.expires < Date.now() || e.tries >= MAX_TRIES) return bad(res, 'کد منقضی شده؛ دوباره درخواست کنید.');
    if (String(code) !== e.code) { e.tries += 1; return bad(res, 'کد اشتباه است.'); }
    e.verifiedUntil = Date.now() + VERIFIED_TTL;
    e.expires = e.verifiedUntil;
    const { rows } = await pool.query(`SELECT data->>'full_name' AS name FROM entities WHERE collection = 'Person' AND data->>'phone' = $1 LIMIT 1`, [phone]);
    res.json({ ok: true, name: rows[0]?.name || '' });
  } catch (err) { next(err); }
});

// Creates a pending payment and returns where to send the browser.
router.post('/register', limitPublicSubmissions, async (req, res, next) => {
  try {
    const { phone, name, club_id } = req.body || {};
    const e = codes.get(phone);
    if (!e?.verifiedUntil || e.verifiedUntil < Date.now()) return bad(res, 'لطفاً دوباره شماره موبایل را تایید کنید.', 401);
    const club = findClub(String(club_id || ''));
    if (!club || !club.price) return bad(res, 'این کارگاه پیدا نشد.');
    const fullName = String(name || '').trim().slice(0, 100);
    if (!fullName) return bad(res, 'نام را وارد کنید.');

    const id = crypto.randomUUID();
    const amount = club.price; // toman
    let authority = `FAKE-${id}`;
    let payUrl = `/api/join/fake-gateway/${id}`;
    if (!FAKE) {
      const r = await fetch(`${ZP}/pg/v4/payment/request.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          merchant_id: MERCHANT, amount: amount * 10, // rial
          callback_url: `${req.protocol}://${req.get('host')}/api/join/callback?p=${id}`,
          description: `عضویت در ${club.title}`, metadata: { mobile: phone },
        }),
      }).then((x) => x.json());
      if (r?.data?.code !== 100) { console.error('[join] zarinpal request failed', r); return bad(res, 'اتصال به درگاه پرداخت ناموفق بود.', 502); }
      authority = r.data.authority;
      payUrl = `${ZP}/pg/StartPay/${authority}`;
    }
    await pool.query(
      `INSERT INTO payments (id, authority, amount, data) VALUES ($1, $2, $3, $4)`,
      [id, authority, amount, { phone, name: fullName, club_id: club.id }]
    );
    res.json({ payUrl });
  } catch (err) { next(err); }
});

// Zarinpal sends the browser back here (?p=…&Authority=…&Status=OK|NOK).
router.get('/callback', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM payments WHERE id = $1', [String(req.query.p || '')]);
    const pay = rows[0];
    if (!pay || pay.authority !== req.query.Authority) return res.redirect('/result/failed');
    const done = (ok) => res.redirect(`/result/${ok ? 'success' : 'failed'}?p=${pay.id}`);
    if (pay.status !== 'pending') return done(pay.status === 'paid');
    if (req.query.Status !== 'OK') {
      await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [pay.id]);
      return done(false);
    }

    let refId = `FAKE-${crypto.randomInt(1e9, 1e10)}`;
    if (!FAKE) {
      const r = await fetch(`${ZP}/pg/v4/payment/verify.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ merchant_id: MERCHANT, amount: pay.amount * 10, authority: pay.authority }),
      }).then((x) => x.json());
      if (![100, 101].includes(r?.data?.code)) {
        console.error('[join] zarinpal verify failed', r);
        await pool.query(`UPDATE payments SET status = 'failed' WHERE id = $1`, [pay.id]);
        return done(false);
      }
      refId = String(r.data.ref_id);
    }

    // Claim the row first, so a double callback can't register twice.
    const claimed = await pool.query(`UPDATE payments SET status = 'paid', ref_id = $2 WHERE id = $1 AND status = 'pending'`, [pay.id, refId]);
    if (!claimed.rowCount) return done(true);

    const { phone, name, club_id } = pay.data;
    const club = findClub(club_id);
    const group = await groupFor(club);
    const person = await pool.query(`SELECT id, data FROM entities WHERE collection = 'Person' AND data->>'phone' = $1 LIMIT 1`, [phone]);
    if (!person.rows[0]) await insertEntity('Person', { phone, full_name: name, first_usage: today() });
    else if (!person.rows[0].data.full_name) await pool.query(`UPDATE entities SET data = data || $2 WHERE collection = 'Person' AND id = $1`, [person.rows[0].id, { full_name: name }]);

    // Same month rule as the dashboard's registrationMonthKey: registering before
    // the group starts counts for its first month.
    const now = jalaliMonth(new Date());
    const start = group.start_date ? jalaliMonth(new Date(group.start_date)) : '';
    const purchase = await insertEntity('GroupPurchase', {
      group_id: group.id, group_title: group.title, month: start && now < start ? start : now,
      price: pay.amount, quantity: 1, purchase_date: today(), payment_method: 'online', is_paid: true,
      person_name: name, person_phone: phone, description: `ثبت‌نام از سایت — کد پیگیری ${refId}`,
    });
    await pool.query('UPDATE payments SET purchase_id = $2 WHERE id = $1', [pay.id, purchase.id]);
    done(true);
  } catch (err) { next(err); }
});

// What the result page shows. The id is an unguessable UUID from the redirect.
router.get('/payment/:id', async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT status, amount, ref_id, data FROM payments WHERE id = $1', [req.params.id]);
    if (!rows[0]) return bad(res, 'not found', 404);
    const { status, amount, ref_id, data } = rows[0];
    res.json({ status, amount, ref_id, club_id: data.club_id, name: data.name, phone: data.phone });
  } catch (err) { next(err); }
});

// Local stand-in for Zarinpal's page (JOIN_FAKE=1 only).
router.get('/fake-gateway/:id', (req, res) => {
  if (!FAKE) return bad(res, 'not found', 404);
  const back = (s) => `/api/join/callback?p=${encodeURIComponent(req.params.id)}&Authority=FAKE-${encodeURIComponent(req.params.id)}&Status=${s}`;
  res.send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<body dir="rtl" style="font-family:sans-serif;max-width:360px;margin:80px auto;text-align:center">
<h2>درگاه آزمایشی</h2><p>این صفحه فقط روی نسخه‌ی محلی است.</p>
<p><a href="${back('OK')}" style="display:block;padding:14px;background:#000;color:#fff;text-decoration:none">پرداخت موفق</a></p>
<p><a href="${back('NOK')}" style="display:block;padding:14px;border:1px solid #000;color:#000;text-decoration:none">انصراف / ناموفق</a></p></body>`);
});

module.exports = router;

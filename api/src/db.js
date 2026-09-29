'use strict';

const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  // One generic table for all 19 entity types — collection name = entity name
  // (Person, Workshop, ...), custom fields live in `data` as JSONB. Avoids a
  // hand-written table per entity; add a new entity later by dropping in a new
  // .jsonc schema + allowlist entry, no migration needed here.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS entities (
      collection TEXT NOT NULL,
      id         TEXT NOT NULL,
      data       JSONB NOT NULL,
      PRIMARY KEY (collection, id)
    )
  `);

  // Separate from `entities` on purpose — this is auth infrastructure, not
  // business data. Replaces the old ADMIN_USERS env var (plaintext passwords
  // in Hamravesh's UI); passwords here are bcrypt hashes. Rows are only ever
  // written by scripts/upsert-admin.js or the change-password route, never
  // through the generic entity API.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admins (
      username              TEXT PRIMARY KEY,
      password_hash         TEXT NOT NULL,
      must_change_password  BOOLEAN NOT NULL DEFAULT true,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  // Audit trail for admin-triggered writes — debugging aid, not user-facing
  // (no route reads this; query it directly, see scripts/view-logs.js).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id              BIGSERIAL PRIMARY KEY,
      admin_username  TEXT NOT NULL,
      method          TEXT NOT NULL,
      entity          TEXT,
      entity_id       TEXT,
      status_code     INTEGER NOT NULL,
      error_message   TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Added after admin_logs already existed in prod — CREATE TABLE IF NOT
  // EXISTS above is a no-op there, so the column needs its own backfill.
  await pool.query(`ALTER TABLE admin_logs ADD COLUMN IF NOT EXISTS request_body JSONB`);

  // Expense categories used to be a hardcoded enum; existing Expense rows
  // store these keys in `category`, so the seed reuses them as ids. Only runs
  // on an empty collection — otherwise a category an admin deleted would come
  // back on every boot.
  const { rowCount } = await pool.query(`SELECT 1 FROM entities WHERE collection = 'ExpenseCategory' LIMIT 1`);
  if (!rowCount) {
    const seed = [
      ['repairs', 'تعمیرات'],
      ['daily', 'هزینه روزمره'],
      ['facilitator_payment', 'پرداختی به تسهیلگر'],
      ['cafe_purchase', 'خرید برای کافه'],
      ['kitchen_purchase', 'خرید برای آشپزخانه'],
      ['leisure', 'هزینه تفریح'],
    ];
    const base = Date.now();
    for (const [i, [id, name]] of seed.entries()) {
      // staggered created_date keeps the old display order when sorted by it
      const data = { name, created_date: new Date(base + i * 1000).toISOString() };
      await pool.query(`INSERT INTO entities (collection, id, data) VALUES ('ExpenseCategory', $1, $2) ON CONFLICT DO NOTHING`, [id, data]);
    }
  }
}

module.exports = { pool, initDb };

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
}

module.exports = { pool, initDb };

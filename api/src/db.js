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
}

module.exports = { pool, initDb };

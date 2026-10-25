'use strict';

// Uploaded files live in Postgres (`files` table, see db.js) — Hamravesh wipes
// the container's own disk on every deploy, and the volumes involved (a few
// hundred club-owner-call resumes) don't justify a separate object store.
// ponytail: bytes in Postgres; move to object storage if uploads grow past a
// few GB or need to be served publicly.

const crypto = require('node:crypto');
const { pool } = require('./db');

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function badFile() {
  const err = new Error('فایل رزومه باید PDF و حداکثر ۵ مگابایت باشد');
  err.status = 400;
  return err;
}

// Checks the real bytes (size + %PDF- header), not the claimed name or type.
function assertPdf(bytes) {
  if (!Buffer.isBuffer(bytes) || !bytes.length || bytes.length > MAX_RESUME_BYTES) throw badFile();
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw badFile();
}

const cleanName = (name) => String(name || 'resume.pdf').slice(0, 200);

// Public upload from the form, before the application itself is submitted.
async function saveResumePdf(bytes, filename) {
  assertPdf(bytes);
  // Uploads whose form was never submitted are left behind with no application
  // pointing at them — sweep the day-old ones here rather than run a cron.
  await pool.query(
    `DELETE FROM files f WHERE f.created_at < now() - interval '1 day'
       AND NOT EXISTS (SELECT 1 FROM entities e WHERE e.collection = 'Application' AND e.data->>'resume_file_id' = f.id)`
  );
  const id = crypto.randomUUID();
  await pool.query(
    'INSERT INTO files (id, filename, content_type, data) VALUES ($1, $2, $3, $4)',
    [id, cleanName(filename), 'application/pdf', bytes]
  );
  return { id, filename: cleanName(filename) };
}

// Admin restore (scripts/restore-from-backup.js): put a file back under its original id.
async function restoreFile(id, bytes, filename) {
  assertPdf(bytes);
  await pool.query(
    `INSERT INTO files (id, filename, content_type, data) VALUES ($1, $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET filename = EXCLUDED.filename, data = EXCLUDED.data`,
    [id, cleanName(filename), 'application/pdf', bytes]
  );
}

module.exports = { saveResumePdf, restoreFile, MAX_RESUME_BYTES };

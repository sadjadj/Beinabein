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

// `file` is { name, data } from the public form, data = base64 of the PDF.
// Checks the real bytes (size + %PDF- header), not the claimed name or type.
async function saveResumePdf(file) {
  const bytes = Buffer.from(String(file?.data || ''), 'base64');
  if (!bytes.length || bytes.length > MAX_RESUME_BYTES) throw badFile();
  if (bytes.subarray(0, 5).toString('latin1') !== '%PDF-') throw badFile();
  const id = crypto.randomUUID();
  const filename = String(file.name || 'resume.pdf').slice(0, 200);
  await pool.query(
    'INSERT INTO files (id, filename, content_type, data) VALUES ($1, $2, $3, $4)',
    [id, filename, 'application/pdf', bytes]
  );
  return { id, filename };
}

module.exports = { saveResumePdf, MAX_RESUME_BYTES };

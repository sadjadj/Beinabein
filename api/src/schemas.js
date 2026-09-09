// Allowlist of entity names, sourced from the Base44 schema files — vendored
// into this repo (base44-entities/) rather than read cross-repo from the
// dashboard folder: the Dockerfile only COPYs beinabein-api/, so a path
// reaching into a sibling repo would 404 at container boot. Re-sync this
// folder (and base44Client.js's ENTITY_NAMES) if entities are added/removed.
'use strict';

const fs = require('fs');
const path = require('path');

const ENTITIES_DIR = path.join(__dirname, '..', 'base44-entities');

// ponytail: strips only `//` line comments, no block-comment/string-escape handling —
// fine because the current .jsonc files don't use either; upgrade to a real jsonc
// parser if that stops being true.
function parseJsonc(text) {
  const stripped = text
    .split('\n')
    .map((line) => (line.trim().startsWith('//') ? '' : line))
    .join('\n');
  return JSON.parse(stripped);
}

function loadEntityNames() {
  return fs
    .readdirSync(ENTITIES_DIR)
    .filter((f) => f.endsWith('.jsonc'))
    .map((f) => parseJsonc(fs.readFileSync(path.join(ENTITIES_DIR, f), 'utf8')).name);
}

const ENTITY_NAMES = loadEntityNames();

module.exports = { ENTITY_NAMES };

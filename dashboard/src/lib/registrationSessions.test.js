// Self-check for registrationSessions.js — run: node src/lib/registrationSessions.test.js
import assert from 'node:assert/strict';
import { purchaseSessions, heldSessions, planLimit, toggleSession, firstRegistrationIds } from './registrationSessions.js';

const single = { id: 'a', person_phone: '0912', registration_type: 'single', selected_sessions: [1], purchase_date: '2026-10-10' };
const second = { id: 'b', person_phone: '0912', registration_type: 'single', selected_sessions: [3, 4], purchase_date: '2026-10-12' };
const full = { id: 'c', person_phone: '0935', registration_type: 'full', selected_sessions: [], purchase_date: '2026-10-01' };
const legacy = { id: 'd', person_phone: '0936', purchase_date: '2026-09-01' }; // no type: counts as every session
const all = [second, single, full, legacy];

assert.deepEqual(purchaseSessions(single, 6), [1]);
assert.deepEqual(purchaseSessions(full, 3), [1, 2, 3]);
assert.deepEqual(purchaseSessions(legacy, 2), [1, 2]);

assert.deepEqual([...heldSessions(all, '0912', 6)].sort(), [1, 3, 4]);
assert.equal(heldSessions(all, '0935', 6).size, 6);
assert.equal(heldSessions(all, '0999', 6).size, 0);
assert.equal(heldSessions(all, '', 6).size, 0);

assert.equal(planLimit({ session_count: 4 }), 4);
assert.equal(planLimit({ session_count: '' }), 0);
assert.equal(planLimit(undefined), 0);

assert.deepEqual(toggleSession([2], 3), [2, 3]); // no cap
assert.deepEqual(toggleSession([2, 3], 3), [2]); // unpick
assert.deepEqual(toggleSession([2], 5, 1), [5]); // one-session plan swaps
assert.deepEqual(toggleSession([1, 2, 3, 4], 5, 4), [1, 2, 3, 4]); // cap reached
assert.deepEqual(toggleSession([1, 2, 3, 4], 4, 4), [1, 2, 3]); // can still unpick at the cap

assert.deepEqual([...firstRegistrationIds(all)].sort(), ['a', 'c', 'd']);

console.log('registrationSessions ok');

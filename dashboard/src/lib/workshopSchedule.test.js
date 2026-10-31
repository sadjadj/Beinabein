// Self-check for workshopSchedule.js — run: node src/lib/workshopSchedule.test.js
import assert from 'node:assert/strict';
import { sessionDayLabel, workshopTimeOn, normalizeSchedule, workshopTimeLabel } from './workshopSchedule.js';

// 2026-10-12 and 2026-10-19 are Mondays (20 and 27 Mehr)
const w = { start_time: '17:00', end_time: '19:00', session_dates: ['2026-10-19', '2026-10-12', '2026-10-20'] };
assert.equal(sessionDayLabel('2026-10-12'), 'دوشنبه 20 مهر');
assert.deepEqual(normalizeSchedule(w), []); // nothing differs
assert.equal(workshopTimeLabel(w), '17:00 - 19:00');
assert.deepEqual(workshopTimeOn(w, '2026-10-12'), { start_time: '17:00', end_time: '19:00' });

// one Monday differs from the other; a slot for a removed date is dropped
const custom = { ...w, schedule: [{ date: '2026-10-19', start_time: '10:00', end_time: '12:00' }, { date: '2026-01-01', start_time: '08:00', end_time: '09:00' }] };
const saved = normalizeSchedule(custom);
assert.deepEqual(saved, [
  { date: '2026-10-12', start_time: '17:00', end_time: '19:00' },
  { date: '2026-10-19', start_time: '10:00', end_time: '12:00' },
  { date: '2026-10-20', start_time: '17:00', end_time: '19:00' },
]);
assert.deepEqual(workshopTimeOn({ ...w, schedule: saved }, '2026-10-19'), { start_time: '10:00', end_time: '12:00' });
assert.deepEqual(workshopTimeOn({ ...w, schedule: saved }, '2026-10-12'), { start_time: '17:00', end_time: '19:00' });
assert.equal(workshopTimeLabel({ ...w, schedule: saved }, ' تا '), '17:00 تا 19:00، 27 مهر 10:00 تا 12:00');
console.log('workshopSchedule: ok');

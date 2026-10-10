// Per-session times for workshops. Workshop.start_time / end_time stay the
// default; Workshop.schedule = [{ date, start_time, end_time }] lists every
// session date, and is only filled when at least one session differs from the default.
import { dayLabels } from './labels.js';
import { formatJalaliShort } from './jalali.js';

const jsDayToKey = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
// "دوشنبه 20 مهر"
export const sessionDayLabel = (date) => `${dayLabels[jsDayToKey[new Date(date + 'T00:00:00').getDay()]]} ${formatJalaliShort(date)}`;

// Start/end time of the session on one date
export function workshopTimeOn(w, date) {
  const slot = (w.schedule || []).find(s => s.date === date);
  return { start_time: slot?.start_time || w.start_time || '', end_time: slot?.end_time || w.end_time || '' };
}

const isDefault = (w, t) => t.start_time === (w.start_time || '') && t.end_time === (w.end_time || '');

// What the form saves: [] unless some session's time differs from the default
export function normalizeSchedule(w) {
  const slots = [...(w.session_dates || [])].sort().map(date => ({ date, ...workshopTimeOn(w, date) }));
  return slots.some(s => !isDefault(w, s)) ? slots : [];
}

// "17:00 - 19:00", followed by each session whose time differs: "• 28 مهر 10:00 - 12:30"
export function workshopTimeLabel(w, sep = ' - ') {
  const range = (t) => (t.start_time || t.end_time ? `${t.start_time}${t.end_time ? sep + t.end_time : ''}` : '');
  const others = (w.schedule || []).filter(s => !isDefault(w, s)).map(s => `${formatJalaliShort(s.date)} ${range(s)}`);
  return [range({ start_time: w.start_time || '', end_time: w.end_time || '' }), ...others].filter(Boolean).join(' • ');
}

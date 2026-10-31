import { dayOrder } from '@/lib/labels';
import { todayGregorian, getJalaliParts } from '@/lib/jalali';

// JS getDay: 0=Sunday..6=Saturday → Persian week key (Saturday=0..Friday=6)
const jsDayToKey = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Compute all session dates for a group from start_date up to endDate (inclusive).
// Group repeats weekly on the days defined in its schedule.
export function computeGroupSessions(group, endDate) {
  const schedule = group.schedule || [];
  if (!group.start_date || schedule.length === 0) return [];
  const scheduledDays = new Set(schedule.map(s => s.day));
  const end = endDate || (group.is_ended ? (group.ended_at || todayGregorian()) : todayGregorian());
  const sessions = [];
  const cursor = new Date(group.start_date + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  let num = 0;
  while (cursor <= endD) {
    const key = jsDayToKey[cursor.getDay()];
    if (scheduledDays.has(key)) {
      num++;
      const slot = schedule.find(s => s.day === key);
      sessions.push({
        date: fmt(cursor),
        day: key,
        start_time: slot?.start_time || '',
        end_time: slot?.end_time || '',
        session_number: num
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return sessions;
}

// Tehran wall-clock time "HH:MM", to compare with schedule times.
const nowTehranTime = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Tehran', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
const padTime = (t) => t.split(':').map(x => x.padStart(2, '0')).join(':');

// Total sessions held (from start up to today or ended_at). Today's session
// counts only once its end time (or start time, if no end) has passed.
export function computeGroupTotalSessions(group) {
  const today = todayGregorian();
  const now = nowTehranTime();
  return computeGroupSessions(group).filter(s => {
    if (s.date < today) return true;
    const t = s.end_time || s.start_time;
    return s.date === today && !!t && padTime(t) <= now;
  }).length;
}

// Sessions held within a given Jalali month key "jy-jm"
export function computeGroupSessionsInMonth(group, monthKey) {
  if (!monthKey) return [];
  return computeGroupSessions(group).filter(s => {
    const p = getJalaliParts(s.date);
    if (!p) return false;
    return `${p.jy}-${String(p.jm).padStart(2, '0')}` === monthKey;
  });
}

// Convert a Gregorian date string to a Jalali month key "jy-jm"
export function gregorianToMonthKey(gregorianStr) {
  const p = getJalaliParts(gregorianStr);
  if (!p) return '';
  return `${p.jy}-${String(p.jm).padStart(2, '0')}`;
}

// Current Jalali month key "jy-jm"
export function currentJalaliMonthKey() {
  return gregorianToMonthKey(todayGregorian());
}

// The month a registration belongs to. Registering before the group starts
// counts for its first month (older records were stamped with the month they
// were entered, e.g. Mehr for a group starting in Aban). Keys compare as strings.
export function registrationMonthKey(group, month = currentJalaliMonthKey()) {
  const start = gregorianToMonthKey(group?.start_date);
  return start && month < start ? start : month;
}

// Current week range (Saturday → Friday) as Gregorian strings
export function getCurrentWeekRange() {
  const today = new Date();
  const jsDay = today.getDay();
  const persianDay = (jsDay + 1) % 7; // Saturday=0
  const start = new Date(today);
  start.setDate(start.getDate() - persianDay);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: fmt(start), end: fmt(end) };
}

export { dayOrder };
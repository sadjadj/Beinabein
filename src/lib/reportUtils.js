import { todayGregorian, getJalaliParts, jalaliToGregorianStr, toPersianDigits } from '@/lib/jalali';

export const RANGE_PRESETS = [
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'custom', label: 'بازه دلخواه' },
];

export function getRangeStart(preset) {
  const today = todayGregorian();
  const parts = getJalaliParts(today);
  if (preset === 'week') {
    const d = new Date();
    const persianDay = (d.getDay() + 1) % 7; // Saturday=0 ... Friday=6
    d.setDate(d.getDate() - persianDay);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  if (preset === 'month') return jalaliToGregorianStr(parts.jy, parts.jm, 1);
  return today;
}

export function buildDateRange(start, end) {
  const dates = [];
  if (!start || !end) return dates;
  const cursor = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (cursor <= endD) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, '0');
    const d = String(cursor.getDate()).padStart(2, '0');
    dates.push(`${y}-${m}-${d}`);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export function makeTickFormatter(chartData) {
  const allParts = chartData.map(d => getJalaliParts(d.date)).filter(Boolean);
  const sameMonth = allParts.length > 0 && allParts.every(p => p.jy === allParts[0].jy && p.jm === allParts[0].jm);
  const sameYear = allParts.length > 0 && allParts.every(p => p.jy === allParts[0].jy);
  return (dateStr) => {
    const p = getJalaliParts(dateStr);
    if (!p) return '';
    if (sameMonth) return toPersianDigits(p.jd);
    if (sameYear) return `${toPersianDigits(p.jd)}/${toPersianDigits(p.jm)}`;
    return `${toPersianDigits(p.jd)}/${toPersianDigits(p.jm)}/${toPersianDigits(p.jy)}`;
  };
}
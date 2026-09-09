import { todayGregorian } from '@/lib/jalali';

const DAY_MS = 24 * 60 * 60 * 1000;
const parseDate = (str) => new Date(`${str || ''}T00:00:00`).getTime();

/**
 * دسته‌بندی ایونت‌های فروش بر اساس تاریخ:
 * - جاری: بازه برگزاری آن شامل امروز باشد
 * - اخیر: از زمان پایان آن بیشتر از هفت روز نگذشته باشد
 * - آینده: هنوز شروع نشده باشد
 * - پیشین: تمام‌شده و بیشتر از هفت روز از پایان آن گذشته باشد
 */
export function classifySalesEvents(events) {
  const today = parseDate(todayGregorian());
  const current = [], recent = [], future = [], past = [];
  (events || []).forEach(e => {
    const start = parseDate(e.start_date);
    const end = parseDate(e.end_date);
    if (Number.isNaN(start) || Number.isNaN(end)) return;
    if (start <= today && end >= today) current.push(e);
    else if (end < today && (today - end) <= 7 * DAY_MS) recent.push(e);
    else if (start > today) future.push(e);
    else past.push(e);
  });
  return { current, recent, future, past };
}
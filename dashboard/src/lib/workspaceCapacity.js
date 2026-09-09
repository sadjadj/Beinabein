import { toJalaliStr } from '@/lib/jalali';

const MAIN_HALL_NAME = 'سالن اصلی';

// Total daily workspace capacity = normal_capacity of the "سالن اصلی" space
export function getMainHallCapacity(spaces) {
  if (!Array.isArray(spaces)) return 0;
  const hall = spaces.find(s => (s.name || '').trim() === MAIN_HALL_NAME);
  return Number(hall?.normal_capacity) || 0;
}

// Dates an order reserves seats on (multi-day array, fallback to single usage_date)
export function getOrderUsageDates(order) {
  if (!order) return [];
  if (Array.isArray(order.usage_dates) && order.usage_dates.length) return order.usage_dates;
  if (order.usage_date) return [order.usage_date];
  return [];
}

// Build a map dateStr -> total reserved seats, optionally excluding an order id
export function buildCapacityMap(orders, excludeOrderId = null) {
  const map = {};
  for (const o of orders) {
    if (excludeOrderId && o.id === excludeOrderId) continue;
    const qty = Number(o.quantity) || 0;
    if (qty <= 0) continue;
    for (const d of getOrderUsageDates(o)) {
      map[d] = (map[d] || 0) + qty;
    }
  }
  return map;
}

// Remaining capacity for a given date
export function getRemainingForDate(capacityMap, totalCapacity, date) {
  const reserved = capacityMap[date] || 0;
  return Math.max(0, totalCapacity - reserved);
}

// Compute N consecutive Gregorian date strings starting from startDate (inclusive)
export function computeUsageDates(startDate, days) {
  if (!startDate || !days || days < 1) return [];
  const [y, m, d] = startDate.split('-').map(Number);
  const result = [];
  for (let i = 0; i < days; i++) {
    const dt = new Date(y, m - 1, d + i);
    result.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`);
  }
  return result;
}

// Check capacity for a set of dates each requiring `qty` seats (excluding the edited order)
export function checkCapacityForDates(dates, qty, capacityMap, totalCapacity) {
  const insufficient = [];
  for (const d of dates) {
    const reserved = capacityMap[d] || 0;
    if (reserved + qty > totalCapacity) insufficient.push(d);
  }
  return { ok: insufficient.length === 0, insufficientDates: insufficient };
}

// Format insufficient dates list as Jalali for user-facing messages
export function formatInsufficientDates(dates) {
  return dates.map(d => toJalaliStr(d)).join('، ');
}
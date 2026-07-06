import { base44 } from '@/api/base44Client';

// ─── Date helpers ───
export function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export function getDateRange(preset, customStart, customEnd) {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { start: formatDate(today), end: formatDate(today) };
    case 'week': {
      const start = new Date(today);
      start.setDate(start.getDate() - 6);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'last_month': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { start: formatDate(start), end: formatDate(end) };
    }
    case 'quarter': {
      const qMonth = Math.floor(today.getMonth() / 3) * 3;
      const start = new Date(today.getFullYear(), qMonth, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { start: formatDate(start), end: formatDate(today) };
    }
    case 'all_time':
      return null;
    case 'specific_date':
      return { start: customStart, end: customStart };
    case 'custom':
      return { start: customStart, end: customEnd };
    default:
      return null;
  }
}

function inRange(date, range) {
  if (!range || !range.start || !range.end) return true;
  return date >= range.start && date <= range.end;
}

function filterByDate(records, field, range) {
  if (!range) return records;
  return records.filter(r => r[field] && inRange(r[field], range));
}

// ─── Number formatting ───
export function toPersianNum(n) {
  return Number(n || 0).toLocaleString('fa-IR');
}

export function formatCurrency(n) {
  return Number(Math.round(n || 0)).toLocaleString('fa-IR') + ' تومان';
}

export function formatPercent(n) {
  return Number(n || 0).toLocaleString('fa-IR', { maximumFractionDigits: 1 }) + '٪';
}

// ─── Person helper ───
export async function findOrCreatePerson(phone, name) {
  if (!phone) return null;
  const existing = await base44.entities.Person.filter({ phone });
  if (existing && existing.length > 0) {
    if (name && !existing[0].full_name) {
      await base44.entities.Person.update(existing[0].id, { full_name: name });
    }
    return existing[0];
  }
  return await base44.entities.Person.create({ phone, full_name: name || '' });
}

export async function bulkCreatePersons(phones) {
  if (!phones || phones.length === 0) return;
  const existing = await base44.entities.Person.list('-created_date', 500);
  const existingPhones = new Set(existing.map(p => p.phone));
  const newPhones = phones.filter(p => p && !existingPhones.has(p));
  if (newPhones.length > 0) {
    await base44.entities.Person.bulkCreate(newPhones.map(phone => ({ phone, full_name: '' })));
  }
}

// ─── Sync people from activity records ───
export async function syncPeopleFromActivities(workspaceVisits, cafePurchases, workshops, events, existingPeople) {
  const existingPhones = new Set(existingPeople.map(p => p.phone));
  const allPhones = new Set();
  workspaceVisits.forEach(v => { if (v.person_phone) allPhones.add(v.person_phone); });
  cafePurchases.forEach(p => { if (p.person_phone) allPhones.add(p.person_phone); });
  workshops.forEach(w => (w.participant_phones || []).forEach(p => allPhones.add(p)));
  events.forEach(e => (e.participant_phones || []).forEach(p => allPhones.add(p)));
  const newPhones = [...allPhones].filter(p => p && !existingPhones.has(p));
  if (newPhones.length > 0) {
    await base44.entities.Person.bulkCreate(newPhones.map(phone => ({ phone, full_name: '' })));
  }
  return newPhones.length;
}

// ─── Last non-cafe service for a person ───
export function computeLastNonCafeService(phone, workspaceVisits, workshops, events) {
  const activities = [];
  workspaceVisits.filter(v => v.person_phone === phone).forEach(v => {
    activities.push({ type: 'فضای کار', date: v.visit_date, label: v.visit_date });
  });
  workshops.filter(w => (w.participant_phones || []).includes(phone)).forEach(w => {
    activities.push({ type: 'کارگاه', date: w.date, label: w.title });
  });
  events.filter(e => (e.participant_phones || []).includes(phone)).forEach(e => {
    activities.push({ type: 'رویداد', date: e.date, label: e.title });
  });
  if (activities.length === 0) return null;
  activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return activities[0];
}

// ─── Time calculation ───
export function calcHours(entry, exit) {
  if (!entry || !exit) return 0;
  const [eh, em] = entry.split(':').map(Number);
  const [xh, xm] = exit.split(':').map(Number);
  let mins = (xh * 60 + xm) - (eh * 60 + em);
  if (mins < 0) mins += 24 * 60;
  return Math.round(mins / 60 * 10) / 10;
}

// ─── Overall Binabin metrics ───
export function computeOverallStats(workspaceVisits, cafePurchases, workshops, events, range) {
  const visits = filterByDate(workspaceVisits, 'visit_date', range);
  const purchases = filterByDate(cafePurchases, 'purchase_date', range);
  const ws = filterByDate(workshops, 'date', range);
  const ev = filterByDate(events, 'date', range);

  const sectionPhones = {
    workspace: new Set(visits.map(v => v.person_phone)),
    cafe: new Set(purchases.map(p => p.person_phone)),
    workshop: new Set(),
    event: new Set()
  };
  ws.forEach(w => (w.participant_phones || []).forEach(p => sectionPhones.workshop.add(p)));
  ev.forEach(e => (e.participant_phones || []).forEach(p => sectionPhones.event.add(p)));

  const allPhones = new Set();
  Object.values(sectionPhones).forEach(s => s.forEach(p => allPhones.add(p)));
  const uniqueCount = allPhones.size;

  const personHours = visits.reduce((sum, v) => sum + (v.hours_spent || 0), 0);

  const phoneCounts = {};
  const addCount = (phone) => { if (phone) phoneCounts[phone] = (phoneCounts[phone] || 0) + 1; };
  visits.forEach(v => addCount(v.person_phone));
  purchases.forEach(p => addCount(p.person_phone));
  ws.forEach(w => (w.participant_phones || []).forEach(addCount));
  ev.forEach(e => (e.participant_phones || []).forEach(addCount));

  const totalPeople = Object.keys(phoneCounts).length;
  const returnCount = Object.values(phoneCounts).filter(c => c > 1).length;
  const returnRate = totalPeople > 0 ? (returnCount / totalPeople) * 100 : 0;

  let diversityCount = 0;
  allPhones.forEach(phone => {
    let sections = 0;
    if (sectionPhones.workspace.has(phone)) sections++;
    if (sectionPhones.cafe.has(phone)) sections++;
    if (sectionPhones.workshop.has(phone)) sections++;
    if (sectionPhones.event.has(phone)) sections++;
    if (sections > 1) diversityCount++;
  });
  const diversityRate = uniqueCount > 0 ? (diversityCount / uniqueCount) * 100 : 0;

  const eventPhones = sectionPhones.event;
  let conversionCount = 0;
  eventPhones.forEach(phone => {
    if (sectionPhones.workspace.has(phone) || sectionPhones.cafe.has(phone) || sectionPhones.workshop.has(phone)) {
      conversionCount++;
    }
  });
  const conversionRate = eventPhones.size > 0 ? (conversionCount / eventPhones.size) * 100 : 0;

  return { uniqueCount, personHours, returnRate, diversityRate, conversionRate, conversionCount, eventCount: eventPhones.size, totalPeople };
}

// ─── Daily unique visitors trend ───
export function computeDailyUniques(workspaceVisits, cafePurchases, workshops, events, range) {
  const days = {};
  const addEntry = (date, phone) => {
    if (!date || !phone || !inRange(date, range)) return;
    if (!days[date]) days[date] = new Set();
    days[date].add(phone);
  };
  workspaceVisits.forEach(v => addEntry(v.visit_date, v.person_phone));
  cafePurchases.forEach(p => addEntry(p.purchase_date, p.person_phone));
  workshops.forEach(w => (w.participant_phones || []).forEach(p => addEntry(w.date, p)));
  events.forEach(e => (e.participant_phones || []).forEach(p => addEntry(e.date, p)));
  return Object.entries(days)
    .map(([date, phones]) => ({ date, count: phones.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Section distribution ───
export function computeSectionDistribution(workspaceVisits, cafePurchases, workshops, events, range) {
  const visits = filterByDate(workspaceVisits, 'visit_date', range);
  const purchases = filterByDate(cafePurchases, 'purchase_date', range);
  const ws = filterByDate(workshops, 'date', range);
  const ev = filterByDate(events, 'date', range);
  const wsPhones = new Set(visits.map(v => v.person_phone));
  const cafePhones = new Set(purchases.map(p => p.person_phone));
  const workshopPhones = new Set();
  ws.forEach(w => (w.participant_phones || []).forEach(p => workshopPhones.add(p)));
  const eventPhones = new Set();
  ev.forEach(e => (e.participant_phones || []).forEach(p => eventPhones.add(p)));
  return [
    { name: 'فضای کار', value: wsPhones.size },
    { name: 'کافه', value: cafePhones.size },
    { name: 'کارگاه', value: workshopPhones.size },
    { name: 'رویداد', value: eventPhones.size },
  ];
}

// ─── Workspace section stats ───
export function computeWorkspaceStats(visits, range) {
  const filtered = filterByDate(visits, 'visit_date', range);
  const phones = filtered.map(v => v.person_phone);
  const uniquePhones = new Set(phones);
  const phoneCounts = {};
  phones.forEach(p => { phoneCounts[p] = (phoneCounts[p] || 0) + 1; });
  const repeatCount = Object.values(phoneCounts).filter(c => c > 1).length;
  const totalHours = filtered.reduce((sum, v) => sum + (v.hours_spent || 0), 0);
  return { totalVisits: filtered.length, uniqueCount: uniquePhones.size, repeatCount, totalHours };
}

// ─── Cafe section stats ───
export function computeCafeStats(purchases, visits, range) {
  const fp = filterByDate(purchases, 'purchase_date', range);
  const fv = filterByDate(visits, 'visit_date', range);
  const buyerPhones = fp.map(p => p.person_phone);
  const uniqueBuyers = new Set(buyerPhones);
  const buyerCounts = {};
  buyerPhones.forEach(p => { buyerCounts[p] = (buyerCounts[p] || 0) + 1; });
  const repeatBuyerPhones = Object.entries(buyerCounts).filter(([, c]) => c > 1).map(([p]) => p);
  let repeatSum = 0;
  repeatBuyerPhones.forEach(phone => {
    repeatSum += fp.filter(p => p.person_phone === phone).reduce((s, p) => s + (p.amount || 0), 0);
  });
  const repeatAvg = repeatBuyerPhones.length > 0 ? repeatSum / repeatBuyerPhones.length : 0;
  const visitorPhones = new Set(fv.map(v => v.person_phone));
  const buyersAmongVisitors = [...uniqueBuyers].filter(p => visitorPhones.has(p));
  const purchaseRate = visitorPhones.size > 0 ? (buyersAmongVisitors.length / visitorPhones.size) * 100 : 0;
  const reasonMap = {};
  fp.forEach(p => {
    const reason = p.entry_reason || 'independent';
    reasonMap[reason] = (reasonMap[reason] || 0) + (p.amount || 0);
  });
  const totalSales = fp.reduce((sum, p) => sum + (p.amount || 0), 0);
  return { totalPurchases: fp.length, uniqueBuyerCount: uniqueBuyers.size, repeatAvg, purchaseRate, totalSales, salesByReason: reasonMap };
}

// ─── Workshop section stats ───
export function computeWorkshopStats(workshops, range) {
  const filtered = filterByDate(workshops, 'date', range);
  const allPhones = [];
  filtered.forEach(w => (w.participant_phones || []).forEach(p => allPhones.push(p)));
  const uniquePhones = new Set(allPhones);
  const phoneCounts = {};
  allPhones.forEach(p => { phoneCounts[p] = (phoneCounts[p] || 0) + 1; });
  const repeatCount = Object.values(phoneCounts).filter(c => c > 1).length;
  return { totalWorkshops: filtered.length, totalParticipants: allPhones.length, uniqueCount: uniquePhones.size, repeatCount };
}

// ─── Big event section stats ───
export function computeEventStats(events, allRecords, range) {
  const filtered = filterByDate(events, 'date', range);
  const allPhones = new Set();
  let totalSales = 0;
  let totalParticipants = 0;
  filtered.forEach(e => {
    (e.participant_phones || []).forEach(p => allPhones.add(p));
    totalSales += e.total_sales || 0;
    totalParticipants += (e.participant_phones || []).length;
  });
  const avgPurchase = totalParticipants > 0 ? totalSales / totalParticipants : 0;
  const { workspaceVisits, cafePurchases, workshops } = allRecords;
  const wsPhones = new Set(workspaceVisits.map(v => v.person_phone));
  const cafePhones = new Set(cafePurchases.map(p => p.person_phone));
  const workshopPhones = new Set();
  workshops.forEach(w => (w.participant_phones || []).forEach(p => workshopPhones.add(p)));
  let conversionCount = 0;
  allPhones.forEach(phone => {
    if (wsPhones.has(phone) || cafePhones.has(phone) || workshopPhones.has(phone)) conversionCount++;
  });
  const conversionRate = allPhones.size > 0 ? (conversionCount / allPhones.size) * 100 : 0;
  return { totalEvents: filtered.length, totalParticipants, uniqueCount: allPhones.size, avgPurchase, conversionRate, conversionCount, totalSales };
}

// ─── Person activity summary ───
export function computePersonActivity(person, workspaceVisits, cafePurchases, workshops, events) {
  const phone = person.phone;
  const wsCount = workspaceVisits.filter(v => v.person_phone === phone).length;
  const cafeCount = cafePurchases.filter(p => p.person_phone === phone).length;
  const workshopCount = workshops.filter(w => (w.participant_phones || []).includes(phone)).length;
  const eventCount = events.filter(e => (e.participant_phones || []).includes(phone)).length;
  return { workspace: wsCount, cafe: cafeCount, workshop: workshopCount, event: eventCount, total: wsCount + cafeCount + workshopCount + eventCount };
}
import { base44 } from '@/api/base44Client';
import { getJalaliParts, jalaliToGregorianStr, jalaliDaysInMonth } from '@/lib/jalali';

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
      const todayStr = formatDate(today);
      const parts = getJalaliParts(todayStr);
      return { start: jalaliToGregorianStr(parts.jy, parts.jm, 1), end: jalaliToGregorianStr(parts.jy, parts.jm, jalaliDaysInMonth(parts.jy, parts.jm)) };
    }
    case 'last_month': {
      const todayStr = formatDate(today);
      const parts = getJalaliParts(todayStr);
      let lm = parts.jm - 1, ly = parts.jy;
      if (lm < 1) { lm = 12; ly -= 1; }
      return { start: jalaliToGregorianStr(ly, lm, 1), end: jalaliToGregorianStr(ly, lm, jalaliDaysInMonth(ly, lm)) };
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
      return { start: customStart, end: customEnd };
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

// Jalali month helpers (for monthly filters aligned with Shamsi calendar)
export function currentJalaliMonthKey() {
  const parts = getJalaliParts(formatDate(new Date()));
  if (!parts) return '';
  return `${parts.jy}-${String(parts.jm).padStart(2, '0')}`;
}
export function gregorianToJalaliMonthKey(gregorianStr) {
  const parts = getJalaliParts(gregorianStr);
  if (!parts) return '';
  return `${parts.jy}-${String(parts.jm).padStart(2, '0')}`;
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
export async function syncPeopleFromActivities(workspaceOrders, itemPurchases, workshopPurchases, existingPeople) {
  const existingPhones = new Set(existingPeople.map(p => p.phone));
  const allPhones = new Set();
  workspaceOrders.forEach(o => { if (o.person_phone) allPhones.add(o.person_phone); });
  itemPurchases.forEach(p => { if (p.person_phone) allPhones.add(p.person_phone); });
  workshopPurchases.forEach(w => { if (w.person_phone) allPhones.add(w.person_phone); });
  const newPhones = [...allPhones].filter(p => p && !existingPhones.has(p));
  if (newPhones.length > 0) {
    await base44.entities.Person.bulkCreate(newPhones.map(phone => ({ phone, full_name: '' })));
  }
  return newPhones.length;
}

// ─── Last non-cafe service for a person ───
export function computeLastNonCafeService(phone, workspaceOrders, workshopPurchases) {
  const activities = [];
  workspaceOrders.filter(o => o.person_phone === phone).forEach(o => {
    activities.push({ type: 'فضای کار', date: o.usage_date || o.purchase_date, label: o.usage_date || o.purchase_date });
  });
  workshopPurchases.filter(w => w.person_phone === phone).forEach(w => {
    activities.push({ type: 'کارگاه', date: w.purchase_date, label: w.workshop_title });
  });
  if (activities.length === 0) return null;
  activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return activities[0];
}

// ─── Overall Binabin metrics ───
export function computeOverallStats(workspaceOrders, itemPurchases, workshopPurchases, range) {
  const orders = filterByDate(workspaceOrders, 'purchase_date', range);
  const items = filterByDate(itemPurchases, 'purchase_date', range);
  const wp = filterByDate(workshopPurchases, 'purchase_date', range);

  const sectionPhones = {
    workspace: new Set(orders.map(o => o.person_phone)),
    cafe: new Set(items.map(p => p.person_phone)),
    workshop: new Set(wp.map(p => p.person_phone)),
  };

  const allPhones = new Set();
  Object.values(sectionPhones).forEach(s => s.forEach(p => allPhones.add(p)));
  const uniqueCount = allPhones.size;

  const phoneCounts = {};
  const addCount = (phone) => { if (phone) phoneCounts[phone] = (phoneCounts[phone] || 0) + 1; };
  orders.forEach(o => addCount(o.person_phone));
  items.forEach(p => addCount(p.person_phone));
  wp.forEach(w => addCount(w.person_phone));

  const totalPeople = Object.keys(phoneCounts).length;
  const returnCount = Object.values(phoneCounts).filter(c => c > 1).length;
  const returnRate = totalPeople > 0 ? (returnCount / totalPeople) * 100 : 0;

  let diversityCount = 0;
  allPhones.forEach(phone => {
    let sections = 0;
    if (sectionPhones.workspace.has(phone)) sections++;
    if (sectionPhones.cafe.has(phone)) sections++;
    if (sectionPhones.workshop.has(phone)) sections++;
    if (sections > 1) diversityCount++;
  });
  const diversityRate = uniqueCount > 0 ? (diversityCount / uniqueCount) * 100 : 0;

  const workspaceRevenue = orders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRevenue = items.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const workshopRevenue = wp.reduce((s, w) => s + (w.price || 0) * (w.quantity || 1) + (w.donation || 0), 0);
  const totalRevenue = workspaceRevenue + cafeRevenue + workshopRevenue;

  return { uniqueCount, returnRate, diversityRate, totalRevenue, workspaceRevenue, cafeRevenue, workshopRevenue, totalPeople };
}

// ─── Daily unique visitors trend ───
export function computeDailyUniques(workspaceOrders, itemPurchases, workshopPurchases, range) {
  const days = {};
  const addEntry = (date, phone) => {
    if (!date || !phone || !inRange(date, range)) return;
    if (!days[date]) days[date] = new Set();
    days[date].add(phone);
  };
  workspaceOrders.forEach(o => addEntry(o.purchase_date, o.person_phone));
  itemPurchases.forEach(p => addEntry(p.purchase_date, p.person_phone));
  workshopPurchases.forEach(w => addEntry(w.purchase_date, w.person_phone));

  // Fill in missing days within the range so the chart shows continuous data
  if (range && range.start && range.end) {
    let cursor = new Date(range.start);
    const end = new Date(range.end);
    while (cursor <= end) {
      const dateStr = formatDate(cursor);
      if (!days[dateStr]) days[dateStr] = new Set();
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return Object.entries(days)
    .map(([date, phones]) => ({ date, count: phones.size }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Section distribution ───
export function computeSectionDistribution(workspaceOrders, itemPurchases, workshopPurchases, range) {
  const orders = filterByDate(workspaceOrders, 'purchase_date', range);
  const items = filterByDate(itemPurchases, 'purchase_date', range);
  const wp = filterByDate(workshopPurchases, 'purchase_date', range);
  return [
    { name: 'فضای کار', value: new Set(orders.map(o => o.person_phone)).size },
    { name: 'کافه', value: new Set(items.map(p => p.person_phone)).size },
    { name: 'کارگاه', value: new Set(wp.map(p => p.person_phone)).size },
  ];
}

// ─── Workspace section stats ───
export function computeWorkspaceStats(orders, range) {
  const filtered = filterByDate(orders, 'purchase_date', range);
  const phones = filtered.map(o => o.person_phone);
  const uniquePhones = new Set(phones);
  const phoneCounts = {};
  phones.forEach(p => { phoneCounts[p] = (phoneCounts[p] || 0) + 1; });
  const repeatCount = Object.values(phoneCounts).filter(c => c > 1).length;
  const totalRevenue = filtered.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  return { totalOrders: filtered.length, uniqueCount: uniquePhones.size, repeatCount, totalRevenue };
}

// ─── Cafe (item purchase) stats ───
export function computeCafeStats(itemPurchases, range) {
  const filtered = filterByDate(itemPurchases, 'purchase_date', range);
  const buyerPhones = filtered.map(p => p.person_phone);
  const uniqueBuyers = new Set(buyerPhones);
  const totalSales = filtered.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const reasonMap = {};
  filtered.forEach(p => {
    const reason = p.purchase_reason || 'independent';
    reasonMap[reason] = (reasonMap[reason] || 0) + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100);
  });
  return { totalPurchases: filtered.length, uniqueBuyerCount: uniqueBuyers.size, totalSales, salesByReason: reasonMap };
}

// ─── Workshop stats ───
export function computeWorkshopStats(workshops, workshopPurchases, range) {
  const filtered = filterByDate(workshops, 'start_date', range);
  const purchasePhones = new Set();
  let totalParticipants = 0;
  let totalRevenue = 0;
  filtered.forEach(w => {
    const purchases = workshopPurchases.filter(p => p.workshop_id === w.id);
    purchases.forEach(p => {
      purchasePhones.add(p.person_phone);
      totalParticipants += (p.quantity || 1);
      totalRevenue += (p.price || 0) * (p.quantity || 1) + (p.donation || 0);
    });
  });
  return { totalWorkshops: filtered.length, totalParticipants, uniqueCount: purchasePhones.size, totalRevenue };
}

// ─── Workshop revenue (auto-calculated per workshop) ───
export function computeWorkshopRevenue(workshop, workshopPurchases) {
  const purchases = workshopPurchases.filter(p => p.workshop_id === workshop.id);
  const participantCount = purchases.reduce((s, p) => s + (p.quantity || 1), 0);
  const priceRevenue = purchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1), 0);
  const donationTotal = purchases.reduce((s, p) => s + (p.donation || 0), 0);
  const totalRevenue = priceRevenue + donationTotal;
  const percentage = workshop.facilitator_percentage || 0;
  const facilitatorRevenue = Math.round(priceRevenue * percentage / 100);
  const binabinRevenue = totalRevenue - facilitatorRevenue;
  return { participantCount, totalRevenue, binabinRevenue, facilitatorRevenue, purchaseCount: purchases.length };
}

// ─── Person activity summary ───
export function computePersonActivity(person, workspaceOrders, itemPurchases, workshopPurchases) {
  const phone = person.phone;
  const wsCount = workspaceOrders.filter(o => o.person_phone === phone).length;
  const cafeCount = itemPurchases.filter(p => p.person_phone === phone).length;
  const workshopCount = workshopPurchases.filter(w => w.person_phone === phone).length;
  return { workspace: wsCount, cafe: cafeCount, workshop: workshopCount, total: wsCount + cafeCount + workshopCount };
}

// ─── Count new people this month ───
export function countNewThisMonth(people) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  return people.filter(p => (p.created_date || '').substring(0, 7) === currentMonth).length;
}

// ─── Advanced CRM search: by name, phone, workshop title, or facilitator name ───
export function advancedPersonSearch(people, search, allData) {
  if (!search) return people;
  const s = search.toLowerCase().trim();
  
  // First check direct matches on person fields
  const directMatches = people.filter(p =>
    (p.full_name || '').toLowerCase().includes(s) ||
    (p.phone || '').includes(s)
  );
  if (directMatches.length > 0) return directMatches;

  // Check workshop title matches — find people who purchased those workshops
  const matchingWorkshops = allData.workshops.filter(w =>
    (w.title || '').toLowerCase().includes(s)
  );
  if (matchingWorkshops.length > 0) {
    const workshopIds = new Set(matchingWorkshops.map(w => w.id));
    const phonesInWorkshops = new Set(
      allData.workshopPurchases.filter(p => workshopIds.has(p.workshop_id)).map(p => p.person_phone)
    );
    // Also check sessions
    const sessionPhones = new Set();
    allData.sessions?.forEach(sess => {
      if (matchingWorkshops.some(w => w.id === sess.workshop_id)) {
        (sess.present_phones || []).forEach(ph => sessionPhones.add(ph));
      }
    });
    return people.filter(p => phonesInWorkshops.has(p.phone) || sessionPhones.has(p.phone));
  }

  // Check facilitator name matches — find workshops by those facilitators, then people in those workshops
  const matchingFacilitators = allData.facilitators.filter(f =>
    (f.full_name || '').toLowerCase().includes(s)
  );
  if (matchingFacilitators.length > 0) {
    const facIds = new Set(matchingFacilitators.map(f => f.id));
    const workshopsByFacs = allData.workshops.filter(w =>
      (w.facilitator_ids || []).some(fid => facIds.has(fid))
    );
    const workshopIds = new Set(workshopsByFacs.map(w => w.id));
    const phonesInWorkshops = new Set(
      allData.workshopPurchases.filter(p => workshopIds.has(p.workshop_id)).map(p => p.person_phone)
    );
    const sessionPhones = new Set();
    allData.sessions?.forEach(sess => {
      if (workshopsByFacs.some(w => w.id === sess.workshop_id)) {
        (sess.present_phones || []).forEach(ph => sessionPhones.add(ph));
      }
    });
    return people.filter(p => phonesInWorkshops.has(p.phone) || sessionPhones.has(p.phone));
  }

  return [];
}

// ─── Top N collaboration types ───
export function topCollaborationTypes(records, labels, n = 2) {
  const counts = {};
  records.forEach(r => {
    const ct = r.collaboration_type || 'other';
    counts[ct] = (counts[ct] || 0) + 1;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, label: labels[key] || key, count }));
}

// ─── Compute current stock for inventory item ───
export function computeCurrentStock(item, itemPurchases) {
  const sold = itemPurchases
    .filter(p => p.item_name === item.name)
    .reduce((sum, p) => sum + (p.quantity || 1), 0);
  return (item.initial_stock || 0) - sold;
}
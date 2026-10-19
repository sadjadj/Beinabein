// Rules for registering one person more than once in a workshop: each
// registration only takes sessions the person doesn't already hold, and a
// plan's session_count caps how many sessions one registration can take.

const allSessions = (total) => Array.from({ length: total }, (_, i) => i + 1);

// Sessions one registration covers — same reading as the per-session lists:
// only a 'single' registration is limited to its selected_sessions.
export const purchaseSessions = (p, total) =>
  p.registration_type === 'single' && p.selected_sessions ? p.selected_sessions : allSessions(total);

// Session numbers this phone already holds among one workshop's purchases.
export const heldSessions = (purchases, phone, total) =>
  new Set(purchases.filter(p => phone && p.person_phone === phone).flatMap(p => purchaseSessions(p, total)));

// 0 = no cap (whole course).
export const planLimit = (plan) => Number(plan?.session_count) || 0;

export const toggleSession = (selected, s, limit = 0) => {
  if (selected.includes(s)) return selected.filter(x => x !== s);
  if (limit === 1) return [s];
  if (limit && selected.length >= limit) return selected;
  return [...selected, s];
};

// Ids of each person's earliest registration; the rest are repeats.
export const firstRegistrationIds = (purchases) => {
  const first = {};
  [...purchases]
    .sort((a, b) => `${a.purchase_date || ''}${a.created_date || ''}`.localeCompare(`${b.purchase_date || ''}${b.created_date || ''}`))
    .forEach(p => { first[p.person_phone] ??= p.id; });
  return new Set(Object.values(first));
};

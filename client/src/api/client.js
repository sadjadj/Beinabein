// Thin client for the three public routes beinabein-api exposes to signup flow
// (see api/src/routes/entities.js's PUBLIC_ACTIONS) — no auth, this app never
// signs in. Mirrors dashboard/src/api/base44Client.js's request() shape.

const API_BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok) throw new Error(payload?.error || res.statusText);
  return payload;
}

export const api = {
  listWorkshops: () => request('GET', '/entities/Workshop?sort=-created_date'),
  getWorkshop: (id) => request('GET', `/entities/Workshop/${id}`),
  createPerson: (data) => request('POST', '/entities/Person', data),
  createWorkshopPurchase: (data) => request('POST', '/entities/WorkshopPurchase', data),
};

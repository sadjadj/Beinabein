// Thin client for the public routes beinabein-api exposes to the signup flow and the club-owner call
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
  createApplication: (data) => request('POST', '/entities/Application', data),
  // XHR rather than fetch: it reports upload progress for the progress bar.
  uploadResume: (file, onProgress) => new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/files/resume`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('X-Filename', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () => {
      let payload = null;
      try { payload = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
      else reject(new Error(payload?.error || 'بارگذاری ناموفق بود'));
    };
    xhr.onerror = () => reject(new Error('بارگذاری ناموفق بود — اتصال اینترنت را بررسی کنید'));
    xhr.send(file);
  }),
};

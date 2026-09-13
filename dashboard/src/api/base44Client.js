// Replaces the @base44/sdk client. Talks to beinabein-api instead of Base44's
// hosted backend, over the same call shape every page already uses
// (base44.entities.X.list/get/create/..., base44.auth.*) — so this file is the
// only thing that changed, no page needed to change with it.
//
// Admin auth is still HTTP Basic under the hood (same server-side check as
// before), but the dashboard now has its own Login page instead of relying on
// the browser's native Basic Auth popup — see auth.login() below. The
// credential lives in sessionStorage (cleared when the tab closes, same
// session-scoped feel as a login) and gets attached to every request.

const API_BASE = '/api';
const CREDENTIAL_KEY = 'beinabein_admin_credential'; // sessionStorage: base64("user:pass")

function getStoredCredential() {
  try { return sessionStorage.getItem(CREDENTIAL_KEY); } catch { return null; }
}

async function request(method, path, body) {
  const credential = getStoredCredential();
  const headers = body !== undefined ? { 'Content-Type': 'application/json' } : {};
  if (credential) headers.Authorization = `Basic ${credential}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const err = new Error(payload?.error || res.statusText);
    err.status = res.status;
    throw err;
  }
  return payload;
}

function makeEntityClient(name) {
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      const qs = params.toString();
      return request('GET', `/entities/${name}${qs ? `?${qs}` : ''}`);
    },
    get: (id) => request('GET', `/entities/${name}/${id}`),
    create: (data) => request('POST', `/entities/${name}`, data),
    bulkCreate: (records) => request('POST', `/entities/${name}/bulk`, records),
    filter: (query) => request('POST', `/entities/${name}/filter`, query),
    update: (id, patch) => request('PUT', `/entities/${name}/${id}`, patch),
    updateMany: (filter, update) => request('PATCH', `/entities/${name}/many`, { filter, set: update?.$set ?? update }),
    delete: (id) => request('DELETE', `/entities/${name}/${id}`),
    deleteMany: (filter) => request('DELETE', `/entities/${name}/many`, filter),
  };
}

// Mirrors base44/entities/*.jsonc (also the backend's allowlist) — kept as a
// plain list here since a browser bundle can't read the filesystem at
// runtime. Re-sync both lists if entities are added/removed.
const ENTITY_NAMES = [
  'Artist', 'Brand', 'CafeTag', 'Category', 'CustomIncome', 'Event',
  'EventPlan', 'EventPurchase', 'Expense', 'Facilitator', 'GreenhouseCategory',
  'GreenhouseItem', 'GreenhousePurchase', 'Group', 'GroupPlan', 'GroupPurchase',
  'GroupSession', 'InventoryItem', 'ItemPurchase', 'Person', 'Returns',
  'SalesEvent', 'SalesEventCategory', 'SalesEventItem', 'SalesEventPurchase',
  'Space', 'StoreCategory', 'StoreItem', 'StorePurchase', 'User', 'Workshop',
  'WorkshopPlan', 'WorkshopPurchase', 'WorkshopSession', 'WorkspaceOrder',
  'WorkspaceSubscription',
];

const entities = {};
for (const name of ENTITY_NAMES) entities[name] = makeEntityClient(name);

export const base44 = {
  entities,
  auth: {
    async me() {
      const { user } = await request('GET', '/me');
      return { role: 'admin', email: user };
    },
    async isAuthenticated() {
      try {
        await request('GET', '/me');
        return true;
      } catch {
        return false;
      }
    },
    // Tests a candidate username/password against the real backend (does NOT
    // use the stored credential — that's the point, there isn't one yet) and,
    // on success, stores it so every future request() call sends it. Ceiling:
    // no server-side session, so there's no "log out everywhere" — logout()
    // just forgets the credential on this device.
    async login(username, password) {
      const credential = btoa(`${username}:${password}`);
      const res = await fetch(`${API_BASE}/me`, { headers: { Authorization: `Basic ${credential}` } });
      if (!res.ok) {
        const err = new Error('نام کاربری یا رمز عبور اشتباه است');
        err.status = res.status;
        throw err;
      }
      sessionStorage.setItem(CREDENTIAL_KEY, credential);
      const { user } = await res.json();
      return { role: 'admin', email: user };
    },
    logout() {
      try { sessionStorage.removeItem(CREDENTIAL_KEY); } catch { /* ignore */ }
    },
    // Base44-template auth flows, not supported by this backend — nothing
    // calls these anymore now that Register/ForgotPassword/OAuthConsent pages
    // are gone, kept only so a stray call fails loudly instead of silently.
    loginViaEmailPassword() { throw new Error('unsupported: use auth.login(username, password)'); },
    loginWithProvider() { throw new Error('unsupported'); },
    register() { throw new Error('unsupported'); },
    resendOtp() { throw new Error('unsupported'); },
    resetPassword() { throw new Error('unsupported'); },
    resetPasswordRequest() { throw new Error('unsupported'); },
    verifyOtp() { throw new Error('unsupported'); },
    setToken() {},
    redirectToLogin() {},
  },
};

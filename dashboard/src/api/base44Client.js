// Replaces the @base44/sdk client. Talks to beinabein-api instead of Base44's
// hosted backend, over the same call shape every page already uses
// (base44.entities.X.list/get/create/..., base44.auth.*) — so this file is the
// only thing that changed, no page needed to change with it.
//
// Admin auth is HTTP Basic Auth, handled entirely by the browser: a 401 with
// WWW-Authenticate triggers the browser's native prompt and it caches the
// credential for this origin. Nothing here stores a token.

const API_BASE = '/api';

async function request(method, path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
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
    // Basic Auth has no client-side logout — the browser caches the credential
    // for this origin until the browser/tab is closed. This just clears local
    // app state; ceiling noted in implementation_plan.md risk #5.
    logout() {},
    // Base44-template auth flows, not supported by Basic Auth — nothing calls
    // these anymore now that Login/Register/ForgotPassword/OAuthConsent pages
    // are gone, kept only so a stray call fails loudly instead of silently.
    loginViaEmailPassword() { throw new Error('unsupported: sign in via the browser\'s Basic Auth prompt'); },
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

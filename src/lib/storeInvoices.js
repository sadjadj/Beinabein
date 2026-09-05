export const storeSourceLabels = { store: 'استور', salesEvent: 'ایونت', greenhouse: 'گلخانه' };

export const storeSourceFilters = [
  { key: 'all', label: 'همه' },
  { key: 'store', label: 'استور' },
  { key: 'salesEvent', label: 'ایونت' },
  { key: 'greenhouse', label: 'گلخانه' },
];

// گروه‌بندی خریدهای استور، گلخانه و ایونت به صورت فاکتور
export function buildStoreInvoiceGroups(storePurchases, greenhousePurchases, salesEventPurchases) {
  const groups = {};
  const add = (source, invoiceType, p) => {
    const key = `${source}-${p.invoice_id || `no-inv-${p.person_phone}-${p.purchase_date}`}`;
    if (!groups[key]) groups[key] = {
      key, source, invoiceType, invoiceId: p.invoice_id, items: [],
      person_name: p.person_name, person_phone: p.person_phone, purchase_date: p.purchase_date,
      payment_method: p.payment_method, purchase_reason: p.purchase_reason, is_paid: p.is_paid, event_title: p.event_title,
    };
    if (!p.is_paid) groups[key].is_paid = false;
    groups[key].items.push(p);
  };
  storePurchases.forEach(p => add('store', 'store', p));
  greenhousePurchases.forEach(p => add('greenhouse', 'greenhouse', p));
  salesEventPurchases.forEach(p => add('salesEvent', 'salesEvent', p));
  return Object.values(groups).map(g => ({
    ...g,
    totalAmount: g.items.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0),
    itemCount: g.items.reduce((s, i) => s + (i.quantity || 1), 0),
  })).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
}
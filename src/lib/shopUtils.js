import { base44 } from '@/api/base44Client';
import { findOrCreatePerson } from '@/lib/stats';

export function findInventoryItem(items, name, section, eventId) {
  return items.find(i => i.name === name && i.section === section && (!eventId || i.event_id === eventId));
}

// Add stock: if item exists in inventory, increase its quantity; otherwise create it.
export async function addStock(items, { name, quantity, cost_price, sale_price, section, event_id }) {
  const existing = items.find(i => i.name === name && i.section === section && (!event_id || i.event_id === event_id));
  const qty = Number(quantity) || 0;
  if (existing) {
    const newQty = (existing.quantity || 0) + qty;
    const updates = { quantity: newQty };
    if (sale_price !== '' && sale_price !== undefined && sale_price !== null) {
      updates.sale_price = Number(sale_price) || 0;
    }
    if (cost_price !== '' && cost_price !== undefined && cost_price !== null) {
      updates.cost_price = Number(cost_price) || 0;
    }
    await base44.entities.ShopItem.update(existing.id, updates);
    return { item: { ...existing, ...updates }, created: false };
  }
  const created = await base44.entities.ShopItem.create({
    name,
    quantity: qty,
    cost_price: Number(cost_price) || 0,
    sale_price: Number(sale_price) || 0,
    section,
    event_id: event_id || ''
  });
  return { item: created, created: true };
}

export function validateCartStock(cart, items) {
  const errors = [];
  cart.forEach(c => {
    const item = items.find(i => i.id === c.item_id);
    const available = item ? (item.quantity || 0) : 0;
    if (c.quantity > available) {
      errors.push(`${c.name} (موجودی: ${available})`);
    }
  });
  return errors;
}

// Process a sale: validate stock, create sale records, reduce inventory.
export async function processSale({ cart, checkout, discountPercent, section, event_id, event_title, items }) {
  const errors = validateCartStock(cart, items);
  if (errors.length) return { ok: false, errors };

  const person = await findOrCreatePerson(checkout.person_phone, checkout.person_name);
  const personName = (person && person.full_name) ? person.full_name : checkout.person_name;
  const invoiceId = `SHOP-${Date.now()}`;
  const disc = Number(discountPercent) || 0;

  const sales = cart.map(c => ({
    section,
    event_id: event_id || '',
    event_title: event_title || '',
    item_name: c.name,
    unit_price: c.unit_price,
    cost_price: c.cost_price || 0,
    quantity: c.quantity,
    discount: disc,
    sale_date: checkout.sale_date,
    buyer_name: personName,
    buyer_phone: checkout.person_phone,
    is_paid: checkout.payment_method === 'free',
    payment_method: checkout.payment_method,
    invoice_id: invoiceId
  }));
  await base44.entities.ShopSale.bulkCreate(sales);

  await Promise.all(cart.map(c => {
    const item = items.find(i => i.id === c.item_id);
    return base44.entities.ShopItem.update(item.id, { quantity: (item.quantity || 0) - c.quantity });
  }));

  return { ok: true, invoiceId };
}

export function groupSalesByInvoice(sales) {
  const groups = {};
  sales.forEach(s => {
    const key = s.invoice_id || `no-inv-${s.buyer_phone}-${s.sale_date}`;
    if (!groups[key]) groups[key] = {
      invoiceId: s.invoice_id,
      items: [],
      buyer_name: s.buyer_name,
      buyer_phone: s.buyer_phone,
      sale_date: s.sale_date,
      payment_method: s.payment_method,
      is_paid: s.is_paid,
      section: s.section,
      event_title: s.event_title
    };
    groups[key].items.push(s);
  });
  return Object.values(groups).map(g => ({
    ...g,
    totalAmount: g.items.reduce((sum, i) => sum + (i.unit_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0),
    itemCount: g.items.reduce((sum, i) => sum + (i.quantity || 1), 0)
  })).sort((a, b) => (b.sale_date || '').localeCompare(a.sale_date || ''));
}
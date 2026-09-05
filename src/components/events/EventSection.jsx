import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { findOrCreatePerson, toPersianNum } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { todayGregorian, toJalaliStr } from '@/lib/jalali';
import { Skeleton } from '@/components/SkeletonPatterns';
import EventSaleTab from '@/components/events/EventSaleTab';
import StoreInvoiceList from '@/components/store/StoreInvoiceList';
import ExportButton from '@/components/ExportButton';
import EventManagementTab from '@/components/events/EventManagementTab';

const DAY_MS = 24 * 60 * 60 * 1000;
const toDateMs = (s) => (s ? new Date(s + 'T00:00:00').getTime() : null);

const exportColumns = [
  { key: 'date', label: 'تاریخ' },
  { key: 'invoice', label: 'شماره فاکتور' },
  { key: 'name', label: 'نام' },
  { key: 'phone', label: 'شماره' },
  { key: 'items', label: 'آیتم‌ها' },
  { key: 'count', label: 'تعداد آیتم' },
  { key: 'method', label: 'مدل پرداخت' },
  { key: 'status', label: 'وضعیت' },
  { key: 'total', label: 'مبلغ کل' },
];

export default function EventSection() {
  const [events, setEvents] = useState([]);
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [brands, setBrands] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evs, its, purs, brs, sps] = await Promise.all([
        base44.entities.Event.list('-start_date', 500),
        base44.entities.EventItem.list('-created_date', 1000),
        base44.entities.EventItemPurchase.list('-purchase_date', 1000),
        base44.entities.Brand.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100)
      ]);
      setEvents(evs); setItems(its); setPurchases(purs); setBrands(brs); setSpaces(sps);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const today = todayGregorian();
  const todayMs = toDateMs(today);

  const currentEvents = events.filter(e => {
    if (e.is_ended) return false;
    const start = toDateMs(e.start_date);
    const end = toDateMs(e.end_date || e.start_date);
    if (start === null || end === null) return false;
    return start <= todayMs && todayMs <= end;
  });
  const recentEvents = events.filter(e => {
    const end = toDateMs(e.end_date || e.start_date);
    if (end === null) return false;
    return end < todayMs && (todayMs - end) < 7 * DAY_MS;
  });
  const saleEvents = [...currentEvents, ...recentEvents.filter(e => !currentEvents.some(c => c.id === e.id))];

  const invoiceGroups = (() => {
    const groups = {};
    purchases.forEach(p => {
      const key = p.invoice_id || `no-inv-${p.person_phone}-${p.purchase_date}`;
      if (!groups[key]) groups[key] = { invoiceId: p.invoice_id, items: [], person_name: p.person_name, person_phone: p.person_phone, purchase_date: p.purchase_date, payment_method: p.payment_method, purchase_reason: p.purchase_reason, is_paid: p.is_paid };
      groups[key].items.push(p);
    });
    return Object.values(groups).map(g => ({
      ...g,
      totalAmount: g.items.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0),
      itemCount: g.items.reduce((s, i) => s + (i.quantity || 1), 0)
    })).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
  })();

  const handleCheckout = async (event, cart, checkout, cartDiscount) => {
    const evItems = items.filter(i => i.event_id === event.id);
    const insufficient = [];
    cart.forEach(c => {
      const item = evItems.find(i => i.id === c.item_id);
      const stock = Number(item?.stock_quantity) || 0;
      if (c.quantity > stock) insufficient.push(`${c.name} (موجودی: ${toPersianNum(stock)})`);
    });
    if (insufficient.length) throw new Error(`موجودی کافی برای موارد زیر وجود ندارد: ${insufficient.join('، ')}`);

    const person = await findOrCreatePerson(checkout.person_phone, checkout.person_name);
    const personName = (person && person.full_name) ? person.full_name : checkout.person_name;
    const invoiceId = `EVT-${Date.now()}`;
    const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
    const discountAmount = Math.round(cartSubtotal * (cartDiscount || 0) / 100);
    const effectivePercent = cartSubtotal > 0 ? Math.round((discountAmount / cartSubtotal) * 10000) / 100 : 0;

    await base44.entities.EventItemPurchase.bulkCreate(cart.map(c => ({
      event_id: event.id,
      person_name: personName,
      person_phone: checkout.person_phone,
      brand: checkout.brand,
      item_id: c.item_id,
      item_name: c.name,
      item_price: c.price,
      quantity: c.quantity,
      discount: effectivePercent,
      purchase_date: checkout.purchase_date,
      payment_method: checkout.payment_method,
      purchase_reason: checkout.purchase_reason,
      is_paid: false,
      invoice_id: invoiceId
    })));

    await Promise.all(cart.map(c => {
      const item = evItems.find(i => i.id === c.item_id);
      const newStock = (Number(item?.stock_quantity) || 0) - c.quantity;
      return base44.entities.EventItem.update(c.item_id, { stock_quantity: newStock });
    }));

    const newPurchs = await base44.entities.EventItemPurchase.filter({ invoice_id: invoiceId });
    setPurchases(prev => [...newPurchs, ...prev]);
    setItems(prev => prev.map(i => {
      const line = cart.find(c => c.item_id === i.id);
      if (!line) return i;
      return { ...i, stock_quantity: (Number(i.stock_quantity) || 0) - line.quantity };
    }));
  };

  const toggleInvoicePaid = async (group) => {
    const newPaid = !group.is_paid;
    if (group.invoiceId) {
      await base44.entities.EventItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, is_paid: newPaid } : p));
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.EventItemPurchase.updateMany({ id: { $in: ids } }, { $set: { is_paid: newPaid } });
      setPurchases(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_paid: newPaid } : p));
    }
  };

  const saveEditInvoice = async (group, editForm) => {
    const payload = { payment_method: editForm.payment_method, purchase_reason: editForm.purchase_reason, is_paid: editForm.is_paid };
    if (group.invoiceId) {
      await base44.entities.EventItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: payload });
      setPurchases(prev => prev.map(p => p.invoice_id === group.invoiceId ? { ...p, ...payload } : p));
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.EventItemPurchase.updateMany({ id: { $in: ids } }, { $set: payload });
      setPurchases(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...payload } : p));
    }
  };

  const deleteInvoice = async (group) => {
    if (group.invoiceId) {
      await base44.entities.EventItemPurchase.deleteMany({ invoice_id: group.invoiceId });
      setPurchases(prev => prev.filter(p => p.invoice_id !== group.invoiceId));
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.EventItemPurchase.deleteMany({ id: { $in: ids } });
      setPurchases(prev => prev.filter(p => !ids.includes(p.id)));
    }
    await Promise.all(group.items.map(it => {
      const item = items.find(i => i.id === it.item_id);
      if (!item) return null;
      return base44.entities.EventItem.update(item.id, { stock_quantity: (Number(item.stock_quantity) || 0) + (it.quantity || 1) });
    }).filter(Boolean));
    setItems(prev => prev.map(i => {
      const line = group.items.find(it => it.item_id === i.id);
      if (!line) return i;
      return { ...i, stock_quantity: (Number(i.stock_quantity) || 0) + (line.quantity || 1) };
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  const todayInvoices = invoiceGroups.filter(g => g.purchase_date === today);
  const todayExportRows = todayInvoices.map(g => ({
    date: g.purchase_date ? toJalaliStr(g.purchase_date) : '',
    invoice: g.invoiceId || '',
    name: g.person_name || '',
    phone: g.person_phone || '',
    items: g.items.map(i => `${i.item_name} ×${i.quantity}`).join('، '),
    count: g.itemCount,
    method: paymentMethodLabels[g.payment_method] || g.payment_method || '',
    status: g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده',
    total: g.totalAmount,
  }));

  return (
    <div className="space-y-6">
      <EventSaleTab saleEvents={saleEvents} items={items} brands={brands} onCheckout={handleCheckout} />

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورهای امروز</h3>
          {todayInvoices.length > 0 && <ExportButton filename="فاکتورهای-امروز-ایونت" columns={exportColumns} rows={todayExportRows} />}
        </div>
        <StoreInvoiceList groups={todayInvoices} type="event_item" onTogglePaid={toggleInvoicePaid} onSaveEdit={saveEditInvoice} onDelete={deleteInvoice} emptyMessage="امروز فروشی ثبت نشده است" />
      </div>

      <div className="space-y-4">
        <h3 className="text-base font-bold">مدیریت ایونت‌ها</h3>
        <EventManagementTab spaces={spaces} groupByPeriod />
      </div>
    </div>
  );
}
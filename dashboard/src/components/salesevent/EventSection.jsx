import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { findOrCreatePerson, toPersianNum } from '@/lib/stats';
import { classifySalesEvents } from '@/lib/salesEvents';
import { paymentMethodLabels } from '@/lib/labels';
import { todayGregorian, toJalaliStr } from '@/lib/jalali';
import { Skeleton } from '@/components/SkeletonPatterns';
import { ShoppingCart, Pencil, CalendarRange } from 'lucide-react';
import EventSalePanel from '@/components/salesevent/EventSalePanel';
import EventManageTab from '@/components/salesevent/EventManageTab';
import StoreInvoiceList from '@/components/store/StoreInvoiceList';
import ExportButton from '@/components/ExportButton';

const exportColumns = [
  { key: 'date', label: 'تاریخ' },
  { key: 'event', label: 'ایونت' },
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
  const [purchases, setPurchases] = useState([]);
  const [itemsByEvent, setItemsByEvent] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');

  const fetchEvents = async () => {
    const evs = await base44.entities.SalesEvent.list('-start_date', 500);
    setEvents(evs);
    return evs;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evs, pur] = await Promise.all([
        base44.entities.SalesEvent.list('-start_date', 500),
        base44.entities.SalesEventPurchase.list('-purchase_date', 1000),
      ]);
      setEvents(evs);
      setPurchases(pur);
      const { current, recent } = classifySalesEvents(evs);
      const saleableIds = [...current, ...recent].map(e => e.id);
      const itemLists = await Promise.all(saleableIds.map(id => base44.entities.SalesEventItem.filter({ event_id: id })));
      const map = {};
      saleableIds.forEach((id, i) => { map[id] = itemLists[i]; });
      setItemsByEvent(map);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const { current, recent } = classifySalesEvents(events);
  const saleEvents = [...current, ...recent];
  const activeEvent = saleEvents.find(e => e.id === selectedEventId) || saleEvents[0] || null;

  const handleCheckout = async (event, cart, checkout, cartDiscount) => {
    const items = itemsByEvent[event.id] || [];
    const insufficient = [];
    cart.forEach(c => {
      const item = items.find(i => i.id === c.item_id);
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

    await base44.entities.SalesEventPurchase.bulkCreate(cart.map(c => ({
      event_id: event.id,
      event_title: event.title,
      person_name: personName,
      person_phone: checkout.person_phone,
      item_id: c.item_id,
      item_name: c.name,
      item_price: c.price,
      quantity: c.quantity,
      discount: effectivePercent,
      brand: c.brand || '',
      purchase_date: checkout.purchase_date,
      payment_method: checkout.payment_method,
      purchase_reason: checkout.purchase_reason,
      is_paid: false,
      invoice_id: invoiceId,
    })));

    await Promise.all(cart.map(c => {
      const item = items.find(i => i.id === c.item_id);
      const newStock = (Number(item?.stock_quantity) || 0) - c.quantity;
      return base44.entities.SalesEventItem.update(c.item_id, { stock_quantity: newStock });
    }));

    const newPurchs = await base44.entities.SalesEventPurchase.filter({ invoice_id: invoiceId });
    setPurchases(prev => [...newPurchs, ...prev]);
    setItemsByEvent(prev => ({
      ...prev,
      [event.id]: (prev[event.id] || []).map(i => {
        const line = cart.find(c => c.item_id === i.id);
        if (!line) return i;
        return { ...i, stock_quantity: (Number(i.stock_quantity) || 0) - line.quantity };
      }),
    }));
  };

  const createEvent = async (form) => {
    await base44.entities.SalesEvent.create({ title: form.title, start_date: form.start_date, end_date: form.end_date, description: form.description || '' });
    await fetchEvents();
  };

  const updateEvent = async (id, form) => {
    await base44.entities.SalesEvent.update(id, { title: form.title, start_date: form.start_date, end_date: form.end_date, description: form.description || '' });
    await fetchEvents();
  };

  const deleteEvent = async (ev) => {
    await base44.entities.SalesEvent.delete(ev.id);
    await fetchEvents();
  };

  const today = todayGregorian();
  const invoiceGroups = (() => {
    const groups = {};
    purchases.forEach(p => {
      const key = p.invoice_id || `no-inv-${p.person_phone}-${p.purchase_date}`;
      if (!groups[key]) groups[key] = {
        invoiceId: p.invoice_id, items: [], person_name: p.person_name, person_phone: p.person_phone,
        purchase_date: p.purchase_date, payment_method: p.payment_method, purchase_reason: p.purchase_reason,
        is_paid: p.is_paid, event_id: p.event_id, event_title: p.event_title,
      };
      groups[key].items.push(p);
    });
    return Object.values(groups).map(g => ({
      ...g,
      totalAmount: g.items.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1) * (1 - (i.discount || 0) / 100), 0),
      itemCount: g.items.reduce((s, i) => s + (i.quantity || 1), 0),
    })).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
  })();

  const todayInvoices = invoiceGroups.filter(g => g.purchase_date === today);
  const todayExportRows = todayInvoices.map(g => ({
    date: g.purchase_date ? toJalaliStr(g.purchase_date) : '',
    event: g.event_title || '',
    invoice: g.invoiceId || '',
    name: g.person_name || '',
    phone: g.person_phone || '',
    items: g.items.map(i => `${i.item_name} ×${i.quantity}`).join('، '),
    count: g.itemCount,
    method: paymentMethodLabels[g.payment_method] || g.payment_method || '',
    status: g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده',
    total: g.totalAmount,
  }));

  const applyToPurchases = (matchFn, patch) => setPurchases(prev => prev.map(p => matchFn(p) ? { ...p, ...patch } : p));

  const toggleInvoicePaid = async (group) => {
    const newPaid = !group.is_paid;
    if (group.invoiceId) {
      await base44.entities.SalesEventPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
      applyToPurchases(p => p.invoice_id === group.invoiceId, { is_paid: newPaid });
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.SalesEventPurchase.updateMany({ id: { $in: ids } }, { $set: { is_paid: newPaid } });
      applyToPurchases(p => ids.includes(p.id), { is_paid: newPaid });
    }
  };

  const saveEditInvoice = async (group, editForm) => {
    const payload = { payment_method: editForm.payment_method, purchase_reason: editForm.purchase_reason, is_paid: editForm.is_paid };
    if (group.invoiceId) {
      await base44.entities.SalesEventPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: payload });
      applyToPurchases(p => p.invoice_id === group.invoiceId, payload);
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.SalesEventPurchase.updateMany({ id: { $in: ids } }, { $set: payload });
      applyToPurchases(p => ids.includes(p.id), payload);
    }
  };

  const deleteInvoice = async (group) => {
    if (group.invoiceId) {
      await base44.entities.SalesEventPurchase.deleteMany({ invoice_id: group.invoiceId });
    } else {
      const ids = group.items.map(i => i.id);
      await base44.entities.SalesEventPurchase.deleteMany({ id: { $in: ids } });
    }
    setPurchases(prev => prev.filter(p => !group.items.some(it => it.id === p.id)));
    await Promise.all(group.items.map(line => {
      const localItem = (itemsByEvent[line.event_id] || []).find(i => i.id === line.item_id);
      if (!localItem) return null;
      return base44.entities.SalesEventItem.update(line.item_id, { stock_quantity: (Number(localItem.stock_quantity) || 0) + (line.quantity || 1) });
    }).filter(Boolean));
    setItemsByEvent(prev => {
      const next = { ...prev };
      group.items.forEach(line => {
        const list = next[line.event_id];
        if (!list) return;
        next[line.event_id] = list.map(i => i.id === line.item_id
          ? { ...i, stock_quantity: (Number(i.stock_quantity) || 0) + (line.quantity || 1) }
          : i);
      });
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ثبت فروش جدید */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت فروش جدید</h3>
          {activeEvent && (
            <Link to={`/store/event-items/${activeEvent.id}`} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
              <Pencil className="w-3.5 h-3.5" /> ویرایش آیتم‌های ایونت {activeEvent.title}
            </Link>
          )}
        </div>
        {saleEvents.length === 0 ? (
          <div className="p-6 rounded-lg bg-muted/30 border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground">ایونتی برای ثبت فروش وجود ندارد</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-1 overflow-x-auto border-b border-border -mx-2 px-2">
              {saleEvents.map(ev => {
                const isCurrent = current.some(c => c.id === ev.id);
                const isActive = activeEvent?.id === ev.id;
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(ev.id)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex items-center gap-2 ${isActive ? 'border-[#B74B40] text-[#B74B40]' : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'}`}
                  >
                    {ev.title}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isCurrent ? 'bg-green-50 text-green-600' : 'bg-[#FBF3EC] text-[#B9834B]'}`}>
                      {isCurrent ? 'جاری' : 'اخیر'}
                    </span>
                  </button>
                );
              })}
            </div>
            {activeEvent && (
              <EventSalePanel
                items={itemsByEvent[activeEvent.id] || []}
                onCheckout={(cart, checkout, discount) => handleCheckout(activeEvent, cart, checkout, discount)}
              />
            )}
          </div>
        )}
      </div>

      {/* فاکتورهای امروز */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورهای امروز</h3>
          {todayInvoices.length > 0 && <ExportButton filename="فاکتورهای-امروز-ایونت" columns={exportColumns} rows={todayExportRows} />}
        </div>
        <StoreInvoiceList
          groups={todayInvoices}
          type="salesEvent"
          onTogglePaid={toggleInvoicePaid}
          onSaveEdit={saveEditInvoice}
          onDelete={deleteInvoice}
          emptyMessage="امروز فروشی ثبت نشده است"
        />
      </div>

      {/* مدیریت ایونت‌ها */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CalendarRange className="w-4 h-4 text-[#B74B40]" /> مدیریت ایونت‌ها</h3>
        <EventManageTab
          events={events}
          onCreate={createEvent}
          onUpdate={updateEvent}
          onDelete={deleteEvent}
        />
      </div>
    </div>
  );
}
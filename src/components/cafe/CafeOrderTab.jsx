import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, X, Pencil } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { todayGregorian } from '@/lib/jalali';
import { persianToEnglish } from '@/lib/inputUtils';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';
import InvoiceList from '@/components/cafe/InvoiceList';
import ExportButton from '@/components/ExportButton';
import { toJalaliStr } from '@/lib/jalali';

const cafePaymentMethods = Object.entries(paymentMethodLabels).filter(([k]) => k !== 'azno');

const cafeExportColumns = [
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

export default function CafeOrderTab({ items, people, invoiceGroups, onCheckout, onTogglePaid, onSaveEdit, onDelete, onEditInventory }) {
  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState({ type: 'percent', value: 0 });
  const [checkout, setCheckout] = useState({ person_name: '', person_phone: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
  const [submitting, setSubmitting] = useState(false);

  const visibleItems = items.filter(i => i.is_visible !== false);

  const groupedItems = {};
  visibleItems.forEach(item => {
    const cat = item.category || 'بدون دسته‌بندی';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const updateQty = (itemId, delta) => {
    setCart(prev => prev.map(c => c.item_id === itemId ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(c => c.item_id !== itemId));
  };

  const cancelCart = () => {
    setCart([]);
    setCartDiscount({ type: 'percent', value: 0 });
    setCheckout({ person_name: '', person_phone: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const discountAmount = cartDiscount.type === 'percent'
    ? Math.round(cartSubtotal * (cartDiscount.value || 0) / 100)
    : Math.min(cartDiscount.value || 0, cartSubtotal);
  const finalTotal = cartSubtotal - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkout.person_phone || cart.length === 0) return;
    setSubmitting(true);
    try {
      await onCheckout(cart, checkout, cartDiscount);
      cancelCart();
    } finally { setSubmitting(false); }
  };

  const todayInvoices = invoiceGroups.filter(g => g.purchase_date === todayGregorian());

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
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت خرید جدید</h3>
          <button type="button" onClick={onEditInventory} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
            <Pencil className="w-3.5 h-3.5" /> ویرایش انبار آیتم‌ها
          </button>
        </div>
        {visibleItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">{items.length > 0 ? 'هیچ آیتمی برای نمایش فعال نیست. از انبار آیتم‌ها گزینه «نمایش» را فعال کنید.' : 'ابتدا آیتمی به انبار اضافه کنید'}</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([cat, catItems]) => (
              <div key={cat}>
                <p className="text-xs font-medium text-muted-foreground mb-2">{cat}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {catItems.map(item => {
                    const inCart = cart.find(c => c.item_id === item.id);
                    return (
                      <button key={item.id} type="button" onClick={() => addToCart(item)} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${inCart ? 'border-[#B74B40] bg-[#FDF2F1]' : 'border-border hover:bg-muted/30'}`}>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground text-xs">{toPersianNum(item.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {cart.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">سبد خرید</p>
                <div className="space-y-2">
                  {cart.map(c => (
                    <div key={c.item_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 gap-2 flex-wrap">
                      <span className="text-sm font-medium">{c.name}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => updateQty(c.item_id, -1)} disabled={c.quantity <= 1} className={`w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center ${c.quantity <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}><Minus className="w-3 h-3" /></button>
                          <span className="text-sm font-medium w-6 text-center">{toPersianNum(c.quantity)}</span>
                          <button type="button" onClick={() => updateQty(c.item_id, 1)} className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                        </div>
                        <span className="text-sm font-medium w-24 text-left">{formatCurrency(c.price * c.quantity)}</span>
                        <button type="button" onClick={() => removeFromCart(c.item_id)} className="text-muted-foreground hover:text-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground">تخفیف کل سبد:</span>
                  <select value={cartDiscount.type} onChange={e => setCartDiscount({ ...cartDiscount, type: e.target.value })} className="px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    <option value="percent">درصد</option>
                    <option value="amount">مبلغ</option>
                  </select>
                  <input type="text" inputMode="numeric" placeholder="0" value={cartDiscount.value || ''} onChange={e => { const raw = persianToEnglish(e.target.value).replace(/[^0-9]/g, ''); setCartDiscount({ ...cartDiscount, value: raw ? Number(raw) : 0 }); }} className="w-24 px-2 py-1 rounded-lg border border-input bg-background text-xs text-center" dir="ltr" />
                  <span className="text-xs text-muted-foreground">{cartDiscount.type === 'percent' ? '٪' : 'تومان'}</span>
                  <span className="text-xs text-muted-foreground mr-auto">مبلغ تخفیف: {formatCurrency(discountAmount)}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                  <span className="text-sm font-bold">مبلغ نهایی:</span>
                  <span className="text-lg font-bold text-[#B74B40]">{formatCurrency(finalTotal)}</span>
                </div>
              </div>
            )}

            {cart.length > 0 && (
              <form onSubmit={handleSubmit} className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="text-xs text-muted-foreground block mb-1">مشتری</label>
                  <PersonSearch
                    personName={checkout.person_name}
                    personPhone={checkout.person_phone}
                    onNameChange={v => setCheckout({ ...checkout, person_name: v })}
                    onPhoneChange={v => setCheckout({ ...checkout, person_phone: v })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ خرید</label>
                  <JalaliDateInput value={checkout.purchase_date} onChange={v => setCheckout({ ...checkout, purchase_date: v })} required />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                  <select value={checkout.payment_method} onChange={e => setCheckout({ ...checkout, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {cafePaymentMethods.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">دلیل حضور</label>
                  <select value={checkout.purchase_reason} onChange={e => setCheckout({ ...checkout, purchase_reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">مبلغ نهایی قابل پرداخت: </span>
                    <span className="font-bold text-[#B74B40]">{formatCurrency(finalTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={cancelCart} className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                      لغو سبد
                    </button>
                    <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                      {submitting ? 'در حال ثبت...' : 'ثبت خرید'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورهای امروز</h3>
          {todayInvoices.length > 0 && <ExportButton filename="فاکتورهای-امروز-کافه" columns={cafeExportColumns} rows={todayExportRows} />}
        </div>
        <InvoiceList
          groups={todayInvoices}
          people={people}
          onTogglePaid={onTogglePaid}
          onSaveEdit={onSaveEdit}
          onDelete={onDelete}
          emptyMessage="امروز خریدی ثبت نشده است"
        />
      </div>
    </div>
  );
}
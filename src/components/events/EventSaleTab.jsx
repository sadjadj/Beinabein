import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, X, Pencil } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { todayGregorian } from '@/lib/jalali';
import { persianToEnglish } from '@/lib/inputUtils';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';

const emptyCheckout = () => ({ person_name: '', person_phone: '', brand: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'event' });

export default function EventSaleTab({ saleEvents, items, brands, onCheckout }) {
  const navigate = useNavigate();
  const [activeEventId, setActiveEventId] = useState(saleEvents[0]?.id || '');
  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState(0);
  const [checkout, setCheckout] = useState(emptyCheckout());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!saleEvents.find(e => e.id === activeEventId)) {
      setActiveEventId(saleEvents[0]?.id || '');
      setCart([]);
    }
  }, [saleEvents]);

  if (saleEvents.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border p-10 text-center opacity-60">
        <h3 className="text-sm font-semibold flex items-center justify-center gap-2 mb-3">
          <ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت فروش جدید
        </h3>
        <p className="text-sm text-muted-foreground">ایونتی برای ثبت فروش وجود ندارد</p>
      </div>
    );
  }

  const activeEvent = saleEvents.find(e => e.id === activeEventId) || saleEvents[0];
  const eventItems = items.filter(i => i.event_id === activeEvent.id && i.is_visible !== false);

  const groupedItems = {};
  eventItems.forEach(item => {
    const cat = item.category || 'بدون دسته‌بندی';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  const stockOf = (id) => Number(eventItems.find(i => i.id === id)?.stock_quantity) || 0;

  const switchEvent = (id) => {
    if (id === activeEvent.id) return;
    setActiveEventId(id);
    setCart([]);
    setCartDiscount(0);
    setError('');
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) {
        if (existing.quantity + 1 > stockOf(item.id)) return prev;
        return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      if (stockOf(item.id) < 1) return prev;
      return [...prev, { item_id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };
  const updateQty = (itemId, delta) => {
    setCart(prev => prev.map(c => {
      if (c.item_id !== itemId) return c;
      const next = c.quantity + delta;
      if (next < 1 || next > stockOf(itemId)) return c;
      return { ...c, quantity: next };
    }));
  };
  const removeFromCart = (itemId) => setCart(prev => prev.filter(c => c.item_id !== itemId));
  const cancelCart = () => {
    setCart([]);
    setCartDiscount(0);
    setCheckout(emptyCheckout());
    setError('');
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const discountAmount = Math.round(cartSubtotal * (cartDiscount || 0) / 100);
  const finalTotal = cartSubtotal - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!checkout.person_name || !checkout.person_phone || !checkout.brand || !checkout.purchase_date || !checkout.payment_method || !checkout.purchase_reason || cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      await onCheckout(activeEvent, cart, checkout, cartDiscount);
      cancelCart();
    } catch (err) {
      setError(err?.message || 'خطا در ثبت فروش');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="text-sm font-semibold flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت فروش جدید</h3>
        <button type="button" onClick={() => navigate(`/event-items/${activeEvent.id}`)} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
          <Pencil className="w-3.5 h-3.5" /> ویرایش آیتم‌های ایونت {activeEvent.title}
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border mb-4">
        {saleEvents.map(ev => (
          <button
            key={ev.id}
            type="button"
            onClick={() => switchEvent(ev.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              ev.id === activeEvent.id
                ? 'border-[#B74B40] text-[#B74B40]'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            {ev.title}
          </button>
        ))}
      </div>

      {eventItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">آیتمی برای این ایونت ثبت نشده است. از «ویرایش آیتم‌های ایونت {activeEvent.title}» آیتم اضافه کنید.</p>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedItems).map(([cat, catItems]) => (
            <div key={cat}>
              <p className="text-xs font-medium text-muted-foreground mb-2">{cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {catItems.map(item => {
                  const inCart = cart.find(c => c.item_id === item.id);
                  const stock = stockOf(item.id);
                  const disabled = stock < 1;
                  return (
                    <button key={item.id} type="button" onClick={() => addToCart(item)} disabled={disabled} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${disabled ? 'opacity-40 cursor-not-allowed border-border' : inCart ? 'border-[#B74B40] bg-[#FDF2F1]' : 'border-border hover:bg-muted/30'}`}>
                      <span className="font-medium">{item.name}</span>
                      <span className="text-muted-foreground text-xs">موجودی: {toPersianNum(stock)}</span>
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
                        <button type="button" onClick={() => updateQty(c.item_id, 1)} disabled={c.quantity >= stockOf(c.item_id)} className={`w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center ${c.quantity >= stockOf(c.item_id) ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}><Plus className="w-3 h-3" /></button>
                      </div>
                      <span className="text-sm font-medium w-24 text-left">{formatCurrency(c.price * c.quantity)}</span>
                      <button type="button" onClick={() => removeFromCart(c.item_id)} className="text-muted-foreground hover:text-red-600"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">درصد تخفیف کل سبد:</span>
                <input type="text" inputMode="numeric" placeholder="0" value={cartDiscount || ''} onChange={e => { const raw = persianToEnglish(e.target.value).replace(/[^0-9]/g, ''); setCartDiscount(raw ? Number(raw) : 0); }} className="w-24 px-2 py-1 rounded-lg border border-input bg-background text-xs text-center" dir="ltr" />
                <span className="text-xs text-muted-foreground">٪</span>
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
                <label className="text-xs text-muted-foreground block mb-1">نام خریدار</label>
                <PersonSearch
                  personName={checkout.person_name}
                  personPhone={checkout.person_phone}
                  onNameChange={v => setCheckout({ ...checkout, person_name: v })}
                  onPhoneChange={v => setCheckout({ ...checkout, person_phone: v })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">برند</label>
                <select value={checkout.brand} onChange={e => setCheckout({ ...checkout, brand: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
                  <option value="">انتخاب برند...</option>
                  {brands.map(b => {
                    const label = b.brand_name || b.full_name;
                    return <option key={b.id} value={label}>{label}</option>;
                  })}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تاریخ فروش</label>
                <JalaliDateInput value={checkout.purchase_date} onChange={v => setCheckout({ ...checkout, purchase_date: v })} required max={todayGregorian()} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                <select value={checkout.payment_method} onChange={e => setCheckout({ ...checkout, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">دلیل حضور</label>
                <select value={checkout.purchase_reason} onChange={e => setCheckout({ ...checkout, purchase_reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
                  {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {error && (
                <div className="sm:col-span-2 lg:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
              )}
              <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">مبلغ نهایی قابل پرداخت: </span>
                  <span className="font-bold text-[#B74B40]">{formatCurrency(finalTotal)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={cancelCart} className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">لغو سبد</button>
                  <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">{submitting ? 'در حال ثبت...' : 'ثبت فروش'}</button>
                </div>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
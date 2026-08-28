import React, { useState } from 'react';
import { ShoppingCart, Plus, Minus, X, Trash2, Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { todayGregorian, toJalaliStr } from '@/lib/jalali';
import { persianToEnglish } from '@/lib/inputUtils';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';
import PersianNumberInput from '@/components/PersianNumberInput';
import PriceInput from '@/components/PriceInput';
import ExportButton from '@/components/ExportButton';
import { addStock, processSale, groupSalesByInvoice } from '@/lib/shopUtils';
import ShopSaleList from '@/components/shop/ShopSaleList';

export default function ShopSectionTab({ section, itemLabel = 'آیتم', inventoryTitle, items, sales, eventId = '', eventTitle = '', onRefresh }) {
  const sectionItems = items.filter(i => i.section === section && (!eventId || i.event_id === eventId));

  const [addForm, setAddForm] = useState({ name: '', quantity: 1, cost_price: '', sale_price: '' });
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState('');

  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [checkout, setCheckout] = useState({ person_name: '', person_phone: '', sale_date: todayGregorian(), payment_method: 'cash' });
  const [submitting, setSubmitting] = useState(false);
  const [sellError, setSellError] = useState('');

  const handleAddItem = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!addForm.name || !addForm.quantity || !addForm.sale_price) {
      setAddError('نام، تعداد و قیمت فروش الزامی است');
      return;
    }
    setAdding(true);
    try {
      await addStock(sectionItems, { ...addForm, section, event_id: eventId });
      setAddForm({ name: '', quantity: 1, cost_price: '', sale_price: '' });
      onRefresh();
    } catch {
      setAddError('خطا در افزودن');
    } finally { setAdding(false); }
  };

  const deleteItem = async (id) => {
    await base44.entities.ShopItem.delete(id);
    onRefresh();
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(c => c.item_id === item.id);
      if (existing) return prev.map(c => c.item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item_id: item.id, name: item.name, unit_price: item.sale_price, cost_price: item.cost_price, quantity: 1, stock: item.quantity }];
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
    setDiscount('');
    setCheckout({ person_name: '', person_phone: '', sale_date: todayGregorian(), payment_method: 'cash' });
    setSellError('');
  };

  const cartSubtotal = cart.reduce((s, c) => s + (c.unit_price || 0) * c.quantity, 0);
  const discValue = Number(discount) || 0;
  const discountAmount = Math.round(cartSubtotal * discValue / 100);
  const finalTotal = cartSubtotal - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSellError('');
    if (!checkout.person_name || !checkout.person_phone || cart.length === 0 || !checkout.sale_date) {
      setSellError('نام خریدار، شماره تماس، حداقل یک آیتم و تاریخ فروش الزامی است');
      return;
    }
    setSubmitting(true);
    try {
      const result = await processSale({ cart, checkout, discountPercent: discValue, section, event_id: eventId, event_title: eventTitle, items: sectionItems });
      if (!result.ok) {
        setSellError(`موجودی کافی نیست: ${result.errors.join('، ')}`);
        return;
      }
      cancelCart();
      onRefresh();
    } catch {
      setSellError('خطا در ثبت فروش');
    } finally { setSubmitting(false); }
  };

  const today = todayGregorian();
  const todaySales = sales.filter(s => s.section === section && (!eventId || s.event_id === eventId) && s.sale_date === today);
  const todayGroups = groupSalesByInvoice(todaySales);

  const togglePaid = async (group) => {
    const newPaid = !group.is_paid;
    if (group.invoiceId) {
      await base44.entities.ShopSale.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: newPaid } });
      onRefresh();
    }
  };

  const saleExportColumns = [
    { key: 'date', label: 'تاریخ' },
    { key: 'name', label: 'نام خریدار' },
    { key: 'phone', label: 'شماره' },
    { key: 'items', label: 'آیتم‌ها' },
    { key: 'count', label: 'تعداد' },
    { key: 'total', label: 'مبلغ کل' },
  ];
  const buildExportRows = (list) => list.map(g => ({
    date: g.sale_date ? toJalaliStr(g.sale_date) : '',
    name: g.buyer_name || '',
    phone: g.buyer_phone || '',
    items: g.items.map(i => `${i.item_name} ×${i.quantity}`).join('، '),
    count: g.itemCount,
    total: g.totalAmount,
  }));

  return (
    <div className="space-y-6">
      {/* Add item form */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><Package className="w-4 h-4 text-[#B74B40]" /> افزودن {itemLabel} جدید</h3>
        <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام {itemLabel}</label>
            <input value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تعداد {itemLabel} *</label>
            <PersianNumberInput value={addForm.quantity} onChange={v => setAddForm({ ...addForm, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">قیمت تمام شده</label>
            <PriceInput value={addForm.cost_price} onChange={v => setAddForm({ ...addForm, cost_price: v })} placeholder="قیمت تمام شده" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">قیمت فروش *</label>
            <PriceInput value={addForm.sale_price} onChange={v => setAddForm({ ...addForm, sale_price: v })} placeholder="قیمت فروش" required />
          </div>
          {addError && <div className="sm:col-span-2 lg:col-span-4 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{addError}</div>}
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={adding} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {adding ? 'در حال افزودن...' : `افزودن به ${inventoryTitle}`}
            </button>
          </div>
        </form>
      </div>

      {/* Inventory list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">{inventoryTitle}</h3>
        </div>
        {sectionItems.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">{itemLabel}‌ی موجود نیست</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">موجودی</th>
                  <th className="text-right p-3 font-medium">قیمت تمام شده</th>
                  <th className="text-right p-3 font-medium">قیمت فروش</th>
                  <th className="text-center p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {sectionItems.map(it => (
                  <tr key={it.id} className="border-t border-border hover:bg-[#FDF2F1]/30">
                    <td className="p-3 font-medium">{it.name}</td>
                    <td className="p-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${Number(it.quantity || 0) > 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                        {toPersianNum(it.quantity || 0)}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{toPersianNum(it.cost_price || 0)}</td>
                    <td className="p-3">{formatCurrency(it.sale_price || 0)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteItem(it.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4 inline-block" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sell form */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-4"><ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت فروش {itemLabel}</h3>
        {sectionItems.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">ابتدا {itemLabel}‌ی به {inventoryTitle} اضافه کنید</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {sectionItems.map(item => {
                const inCart = cart.find(c => c.item_id === item.id);
                const stock = Number(item.quantity || 0);
                return (
                  <button key={item.id} type="button" onClick={() => addToCart(item)} disabled={stock <= 0} className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${inCart ? 'border-[#B74B40] bg-[#FDF2F1]' : 'border-border hover:bg-muted/30'} ${stock <= 0 ? 'opacity-40 cursor-not-allowed' : ''}`}>
                    <span className="font-medium truncate">{item.name}</span>
                    <span className="text-muted-foreground text-xs flex-shrink-0 mr-2">{toPersianNum(stock)}</span>
                  </button>
                );
              })}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">سبد فروش</p>
                <div className="space-y-2">
                  {cart.map(c => {
                    const item = sectionItems.find(i => i.id === c.item_id);
                    const stock = item ? Number(item.quantity || 0) : 0;
                    const over = c.quantity > stock;
                    return (
                      <div key={c.item_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5 gap-2 flex-wrap">
                        <span className="text-sm font-medium">{c.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => updateQty(c.item_id, -1)} disabled={c.quantity <= 1} className={`w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center ${c.quantity <= 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}><Minus className="w-3 h-3" /></button>
                            <span className="text-sm font-medium w-6 text-center">{toPersianNum(c.quantity)}</span>
                            <button type="button" onClick={() => updateQty(c.item_id, 1)} className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className={`text-xs ${over ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>موجودی: {toPersianNum(stock)}</span>
                          <span className="text-sm font-medium w-24 text-left">{formatCurrency(c.unit_price * c.quantity)}</span>
                          <button type="button" onClick={() => removeFromCart(c.item_id)} className="text-muted-foreground hover:text-red-600"><X className="w-4 h-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-border flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-muted-foreground">درصد تخفیف:</span>
                  <input type="text" inputMode="numeric" placeholder="0" value={discount || ''} onChange={e => { const raw = persianToEnglish(e.target.value).replace(/[^0-9]/g, ''); setDiscount(raw ? raw : ''); }} className="w-24 px-2 py-1 rounded-lg border border-input bg-background text-xs text-center" dir="ltr" />
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
                  <label className="text-xs text-muted-foreground block mb-1">نام خریدار *</label>
                  <PersonSearch
                    personName={checkout.person_name}
                    personPhone={checkout.person_phone}
                    onNameChange={v => setCheckout({ ...checkout, person_name: v })}
                    onPhoneChange={v => setCheckout({ ...checkout, person_phone: v })}
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ فروش *</label>
                  <JalaliDateInput value={checkout.sale_date} onChange={v => setCheckout({ ...checkout, sale_date: v })} required max={todayGregorian()} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                  <select value={checkout.payment_method} onChange={e => setCheckout({ ...checkout, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                {sellError && <div className="sm:col-span-2 lg:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{sellError}</div>}
                <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">مبلغ نهایی: </span>
                    <span className="font-bold text-[#B74B40]">{formatCurrency(finalTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={cancelCart} className="px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">لغو</button>
                    <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">{submitting ? 'در حال ثبت...' : 'ثبت فروش'}</button>
                  </div>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Today's sales */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فروش‌های امروز</h3>
          {todayGroups.length > 0 && <ExportButton filename={`فروش‌های-امروز-${inventoryTitle}`} columns={saleExportColumns} rows={buildExportRows(todayGroups)} />}
        </div>
        <ShopSaleList groups={todayGroups} onTogglePaid={togglePaid} emptyMessage="امروز فروشی ثبت نشده است" />
      </div>
    </div>
  );
}
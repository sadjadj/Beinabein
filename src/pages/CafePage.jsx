import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Coffee, Users, TrendingUp, Plus, Pencil, Check, X, Package, Trash2, FolderPlus, ShoppingCart, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import { computeCafeStats, findOrCreatePerson, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

export default function CafePage() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [people, setPeople] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('purchases');
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState({ person_name: '', person_phone: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
  const [itemForm, setItemForm] = useState({ name: '', category: '', price: '', brand: '' });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({});
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null);
  const [editInvoiceForm, setEditInvoiceForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invItems, purchs, cats, ppl] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500),
        base44.entities.Category.list('-created_date', 100),
        base44.entities.Person.list('-created_date', 500)
      ]);
      setItems(invItems);
      setPurchases(purchs);
      setPeople(ppl);
      setCategories(cats);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

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

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);

  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    if (!checkout.person_phone || cart.length === 0) return;
    setSubmitting(true);
    try {
      await findOrCreatePerson(checkout.person_phone, checkout.person_name);
      const invoiceId = `INV-${Date.now()}`;
      await base44.entities.ItemPurchase.bulkCreate(
        cart.map(c => ({
          person_name: checkout.person_name,
          person_phone: checkout.person_phone,
          item_name: c.name,
          item_price: c.price,
          quantity: c.quantity,
          purchase_date: checkout.purchase_date,
          payment_method: checkout.payment_method,
          purchase_reason: checkout.purchase_reason,
          is_paid: checkout.payment_method === 'free',
          invoice_id: invoiceId
        }))
      );
      setCart([]);
      setCheckout({ person_name: '', person_phone: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) return;
    setSubmitting(true);
    try {
      if (editingItemId) {
        await base44.entities.InventoryItem.update(editingItemId, { ...itemForm, price: Number(itemForm.price) || 0 });
        setEditingItemId(null);
      } else {
        await base44.entities.InventoryItem.create({ ...itemForm, price: Number(itemForm.price) || 0 });
      }
      setItemForm({ name: '', category: '', price: '', brand: '', tags: [] });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemForm({ ...item, tags: item.tags || [] });
    setTab('inventory');
  };

  const deleteItem = async (id) => {
    await base44.entities.InventoryItem.delete(id);
    fetchData();
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (!categoryForm.name) return;
    setSubmitting(true);
    try {
      await base44.entities.Category.create({ ...categoryForm });
      setCategoryForm({ name: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const deleteCategory = async (id) => {
    await base44.entities.Category.delete(id);
    fetchData();
  };

  const togglePaid = async (p) => {
    await base44.entities.ItemPurchase.update(p.id, { is_paid: !p.is_paid });
    fetchData();
  };

  const personIdByPhone = (phone) => people.find(p => p.phone === phone)?.id;

  // Group purchases by invoice
  const invoiceGroups = (() => {
    const groups = {};
    purchases.forEach(p => {
      const key = p.invoice_id || `no-inv-${p.id}`;
      if (!groups[key]) groups[key] = { invoiceId: p.invoice_id, items: [], person_name: p.person_name, person_phone: p.person_phone, purchase_date: p.purchase_date, payment_method: p.payment_method, purchase_reason: p.purchase_reason, is_paid: p.is_paid };
      groups[key].items.push(p);
    });
    return Object.values(groups).map(g => ({
      ...g,
      totalAmount: g.items.reduce((s, i) => s + (i.item_price || 0) * (i.quantity || 1), 0),
      itemCount: g.items.reduce((s, i) => s + (i.quantity || 1), 0)
    })).sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));
  })();

  const toggleInvoicePaid = async (group) => {
    await base44.entities.ItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: { is_paid: !group.is_paid } });
    fetchData();
  };

  const startEditInvoice = (group) => {
    setEditingInvoiceId(group.invoiceId || `no-inv-${group.items[0].id}`);
    setEditInvoiceForm({ payment_method: group.payment_method, purchase_reason: group.purchase_reason, is_paid: group.is_paid });
  };

  const saveEditInvoice = async (group) => {
    await base44.entities.ItemPurchase.updateMany({ invoice_id: group.invoiceId }, { $set: { payment_method: editInvoiceForm.payment_method, purchase_reason: editInvoiceForm.purchase_reason, is_paid: editInvoiceForm.is_paid } });
    setEditingInvoiceId(null);
    fetchData();
  };

  const deleteInvoice = async (group) => {
    if (group.invoiceId) {
      await base44.entities.ItemPurchase.deleteMany({ invoice_id: group.invoiceId });
    } else {
      await base44.entities.ItemPurchase.delete(group.items[0].id);
    }
    fetchData();
  };

  const stats = computeCafeStats(purchases, null);
  const groupedItems = {};
  items.forEach(item => {
    const cat = item.category || 'بدون دسته‌بندی';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">کافه</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت انبار آیتم‌ها و ثبت خریدها</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد خرید" value={toPersianNum(stats.totalPurchases)} icon={Coffee} color="terracotta" />
        <StatCard label="خریداران یونیک" value={toPersianNum(stats.uniqueBuyerCount)} icon={Users} color="teal" />
        <StatCard label="درآمد کل" value={formatCurrency(stats.totalSales)} icon={TrendingUp} color="ochre" />
        <StatCard label="آیتم‌های انبار" value={toPersianNum(items.length)} icon={Package} color="pink" />
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab('purchases')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'purchases' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>سفارش جدید</button>
        <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'inventory' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>انبار آیتم‌ها</button>
        <button onClick={() => setTab('categories')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'categories' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>کتگوری‌ها</button>
      </div>

      {tab === 'categories' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <form onSubmit={handleCategorySubmit} className="flex items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام کتگوری</label>
                <input type="text" placeholder="مثلاً نوشیدنی" value={categoryForm.name} onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
              </div>
              <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                <FolderPlus className="w-4 h-4" /> افزودن
              </button>
            </form>
          </div>
          {categories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">هنوز کتگوری ثبت نشده است</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-3 font-medium">نام کتگوری</th>
                    <th className="text-center p-3 font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(c => (
                    <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{c.name}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => deleteCategory(c.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'inventory' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> {editingItemId ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}</h3>
            <form onSubmit={handleItemSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">اسم آیتم</label>
                <input type="text" placeholder="اسم آیتم" value={editingItemId ? editItemForm.name : itemForm.name} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, name: e.target.value }) : setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">کتگوری</label>
                <select value={editingItemId ? editItemForm.category : itemForm.category} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, category: e.target.value }) : setItemForm({ ...itemForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">کتگوری...</option>
                  {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
                <PriceInput value={editingItemId ? editItemForm.price : itemForm.price} onChange={v => editingItemId ? setEditItemForm({ ...editItemForm, price: v }) : setItemForm({ ...itemForm, price: v })} required />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  {submitting ? 'در حال ثبت...' : editingItemId ? 'ذخیره' : 'افزودن'}
                </button>
                {editingItemId && <button type="button" onClick={() => setEditingItemId(null)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>}
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">آیتم‌های انبار ({toPersianNum(items.length)})</h3></div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز آیتمی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">اسم</th>
                      <th className="text-right p-3 font-medium">کتگوری</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-right p-3 font-medium">برند</th>
                      <th className="text-center p-3 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                        <td className="p-3">{formatCurrency(item.price)}</td>
                        <td className="p-3">{item.brand || '-'}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => startEditItem(item)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'purchases' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-[#B74B40]" /> ثبت خرید جدید</h3>
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">ابتدا آیتمی به انبار اضافه کنید</p>
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
                        <div key={c.item_id} className="flex items-center justify-between bg-muted/30 rounded-lg p-2.5">
                          <span className="text-sm font-medium">{c.name}</span>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => updateQty(c.item_id, -1)} className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-muted"><Minus className="w-3 h-3" /></button>
                              <span className="text-sm font-medium w-6 text-center">{toPersianNum(c.quantity)}</span>
                              <button type="button" onClick={() => updateQty(c.item_id, 1)} className="w-6 h-6 rounded-md bg-white border border-border flex items-center justify-center hover:bg-muted"><Plus className="w-3 h-3" /></button>
                            </div>
                            <span className="text-sm font-medium w-24 text-left">{formatCurrency(c.price * c.quantity)}</span>
                            <button type="button" onClick={() => removeFromCart(c.item_id)} className="text-muted-foreground hover:text-red-600"><X className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                      <span className="text-sm font-bold">مبلغ نهایی:</span>
                      <span className="text-lg font-bold text-[#B74B40]">{formatCurrency(cartTotal)}</span>
                    </div>
                  </div>
                )}

                {cart.length > 0 && (
                  <form onSubmit={handleCheckoutSubmit} className="border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">دلیل خرید</label>
                      <select value={checkout.purchase_reason} onChange={e => setCheckout({ ...checkout, purchase_reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                        {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-muted-foreground">مبلغ نهایی قابل پرداخت: </span>
                        <span className="font-bold text-[#B74B40]">{formatCurrency(cartTotal)}</span>
                      </div>
                      <button type="submit" disabled={submitting} className="px-6 py-2.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                        {submitting ? 'در حال ثبت...' : 'ثبت خرید'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">فاکتورهای اخیر</h3></div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : invoiceGroups.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز خریدی ثبت نشده است</div>
            ) : (
              <div className="divide-y divide-border">
                {invoiceGroups.map((group, idx) => {
                  const groupKey = group.invoiceId || `no-inv-${idx}`;
                  const isExpanded = expandedInvoice === groupKey;
                  const isEditing = editingInvoiceId === groupKey;
                  const personId = personIdByPhone(group.person_phone);
                  return (
                    <div key={groupKey} className="p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-3 text-sm">
                          <button onClick={() => setExpandedInvoice(isExpanded ? null : groupKey)} className="text-muted-foreground hover:text-foreground">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{group.purchase_date ? toJalaliStr(group.purchase_date) : '-'}</span>
                          {personId ? (
                            <Link to={`/people/${personId}`} className="font-medium hover:text-[#B74B40]">{group.person_name || '-'}</Link>
                          ) : (
                            <span className="font-medium">{group.person_name || '-'}</span>
                          )}
                          <span className="text-xs text-muted-foreground">{toPersianNum(group.itemCount)} آیتم</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <select value={editInvoiceForm.payment_method} onChange={e => setEditInvoiceForm({ ...editInvoiceForm, payment_method: e.target.value })} className="px-2 py-1 rounded-lg border border-input bg-background text-xs">
                                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <select value={editInvoiceForm.purchase_reason} onChange={e => setEditInvoiceForm({ ...editInvoiceForm, purchase_reason: e.target.value })} className="px-2 py-1 rounded-lg border border-input bg-background text-xs">
                                {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" checked={editInvoiceForm.is_paid} onChange={e => setEditInvoiceForm({ ...editInvoiceForm, is_paid: e.target.checked })} className="w-3.5 h-3.5" /> پرداخت
                              </label>
                              <button onClick={() => saveEditInvoice(group)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                              <button onClick={() => setEditingInvoiceId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground">{paymentMethodLabels[group.payment_method] || group.payment_method}</span>
                              <button onClick={() => toggleInvoicePaid(group)} className={`text-xs ${group.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                                {group.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                              </button>
                              <span className="font-medium text-sm">{formatCurrency(group.totalAmount)}</span>
                              <button onClick={() => startEditInvoice(group)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => deleteInvoice(group)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 pr-8 space-y-1">
                          {group.items.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-xs text-muted-foreground py-1">
                              <span>{item.item_name} ×{toPersianNum(item.quantity)}</span>
                              <span>{formatCurrency((item.item_price || 0) * (item.quantity || 1))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
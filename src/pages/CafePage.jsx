import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Coffee, Users, TrendingUp, Plus, Pencil, Check, X, Package, Trash2, FolderPlus, ShoppingCart, Minus } from 'lucide-react';
import { computeCafeStats, findOrCreatePerson, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';

export default function CafePage() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('purchases');
  const [cart, setCart] = useState([]);
  const [checkout, setCheckout] = useState({ person_name: '', person_phone: '', purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
  const [itemForm, setItemForm] = useState({ name: '', category: '', price: '', brand: '', tags: [] });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({});
  const [categoryForm, setCategoryForm] = useState({ name: '' });
  const [tagForm, setTagForm] = useState({ name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invItems, purchs, cats, tgs] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500),
        base44.entities.Category.list('-created_date', 100),
        base44.entities.CafeTag.list('-created_date', 100)
      ]);
      setItems(invItems);
      setPurchases(purchs);
      setCategories(cats);
      setTags(tgs);
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
          is_paid: checkout.payment_method === 'free'
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

  const handleTagSubmit = async (e) => {
    e.preventDefault();
    if (!tagForm.name) return;
    setSubmitting(true);
    try {
      await base44.entities.CafeTag.create({ ...tagForm });
      setTagForm({ name: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const deleteTag = async (id) => {
    await base44.entities.CafeTag.delete(id);
    fetchData();
  };

  const togglePaid = async (p) => {
    await base44.entities.ItemPurchase.update(p.id, { is_paid: !p.is_paid });
    fetchData();
  };

  const stats = computeCafeStats(purchases, null);
  const groupedItems = {};
  items.forEach(item => {
    const cat = item.category || 'بدون دسته‌بندی';
    if (!groupedItems[cat]) groupedItems[cat] = [];
    groupedItems[cat].push(item);
  });

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
        <button onClick={() => setTab('purchases')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'purchases' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>خریدها</button>
        <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'inventory' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>انبار آیتم‌ها</button>
        <button onClick={() => setTab('tags')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'tags' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>تگ‌ها</button>
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

      {tab === 'tags' && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <form onSubmit={handleTagSubmit} className="flex items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام تگ</label>
                <input type="text" placeholder="مثلاً گیاهی، بدون شکر" value={tagForm.name} onChange={e => setTagForm({ ...tagForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
              </div>
              <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                <Plus className="w-4 h-4" /> افزودن
              </button>
            </form>
          </div>
          {tags.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">هنوز تگی ثبت نشده است</div>
          ) : (
            <div className="p-4 flex flex-wrap gap-2">
              {tags.map(t => (
                <span key={t.id} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FDF2F1] text-[#B74B40] text-sm font-medium">
                  {t.name}
                  <button onClick={() => deleteTag(t.id)} className="hover:text-[#A03D34]"><X className="w-3 h-3" /></button>
                </span>
              ))}
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
              <div>
                <label className="text-xs text-muted-foreground block mb-1">برند</label>
                <input type="text" placeholder="برند" value={editingItemId ? editItemForm.brand : itemForm.brand} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, brand: e.target.value }) : setItemForm({ ...itemForm, brand: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">تگ‌ها</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map(t => {
                    const selected = editingItemId ? (editItemForm.tags || []).includes(t.name) : (itemForm.tags || []).includes(t.name);
                    return (
                      <button key={t.id} type="button" onClick={() => {
                        const current = editingItemId ? editItemForm : itemForm;
                        const setter = editingItemId ? setEditItemForm : setItemForm;
                        const newTags = selected ? (current.tags || []).filter(x => x !== t.name) : [...(current.tags || []), t.name];
                        setter({ ...current, tags: newTags });
                      }} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${selected ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
                        {t.name}
                      </button>
                    );
                  })}
                </div>
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
                      <th className="text-right p-3 font-medium">تگ‌ها</th>
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
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(item.tags || []).map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs">{t}</span>)}
                          </div>
                        </td>
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
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">خریدهای اخیر</h3></div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : purchases.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز خریدی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">تاریخ</th>
                      <th className="text-right p-3 font-medium">آیتم</th>
                      <th className="text-right p-3 font-medium">نام</th>
                      <th className="text-right p-3 font-medium">تعداد</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-right p-3 font-medium">مدل پرداخت</th>
                      <th className="text-center p-3 font-medium">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3">{toJalaliStr(p.purchase_date)}</td>
                        <td className="p-3 font-medium">{p.item_name}</td>
                        <td className="p-3">{p.person_name || '-'}</td>
                        <td className="p-3">{toPersianNum(p.quantity)}</td>
                        <td className="p-3">{formatCurrency(p.item_price * p.quantity)}</td>
                        <td className="p-3 text-xs">{paymentMethodLabels[p.payment_method] || p.payment_method}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => togglePaid(p)} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                            {p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                          </button>
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
    </div>
  );
}
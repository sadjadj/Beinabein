import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Coffee, Users, TrendingUp, Plus, Pencil, Check, X, Package, Trash2 } from 'lucide-react';
import { computeCafeStats, findOrCreatePerson, computeCurrentStock, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

export default function CafePage() {
  const [items, setItems] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [tab, setTab] = useState('purchases'); // 'purchases' or 'inventory'
  const [purchaseForm, setPurchaseForm] = useState({ person_name: '', person_phone: '', item_name: '', item_price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
  const [editingPurchaseId, setEditingPurchaseId] = useState(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState({});
  const [itemForm, setItemForm] = useState({ name: '', category: '', price: '', brand: '', initial_stock: '' });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invItems, purchases] = await Promise.all([
        base44.entities.InventoryItem.list('-created_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500)
      ]);
      setItems(invItems);
      setPurchases(purchases);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const selectItem = (item) => {
    setPurchaseForm({ ...purchaseForm, item_name: item.name, item_price: item.price });
  };

  const handlePurchaseSubmit = async (e) => {
    e.preventDefault();
    if (!purchaseForm.person_phone || !purchaseForm.item_name) return;
    setSubmitting(true); setMessage(null);
    try {
      await findOrCreatePerson(purchaseForm.person_phone, purchaseForm.person_name);
      await base44.entities.ItemPurchase.create({
        ...purchaseForm,
        item_price: Number(purchaseForm.item_price) || 0,
        quantity: Number(purchaseForm.quantity) || 1
      });
      setMessage({ type: 'success', text: 'خرید ثبت شد' });
      setPurchaseForm({ person_name: '', person_phone: '', item_name: '', item_price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', purchase_reason: 'independent' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.price) return;
    setSubmitting(true);
    try {
      if (editingItemId) {
        await base44.entities.InventoryItem.update(editingItemId, {
          ...itemForm, price: Number(itemForm.price) || 0, initial_stock: Number(itemForm.initial_stock) || 0
        });
        setEditingItemId(null);
      } else {
        await base44.entities.InventoryItem.create({
          ...itemForm, price: Number(itemForm.price) || 0, initial_stock: Number(itemForm.initial_stock) || 0
        });
      }
      setItemForm({ name: '', category: '', price: '', brand: '', initial_stock: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItemForm({ ...item });
    setTab('inventory');
  };

  const deleteItem = async (id) => {
    await base44.entities.InventoryItem.delete(id);
    fetchData();
  };

  const togglePaid = async (p) => {
    await base44.entities.ItemPurchase.update(p.id, { is_paid: !p.is_paid });
    fetchData();
  };

  const startEditPurchase = (p) => {
    setEditingPurchaseId(p.id);
    setEditPurchaseForm({ ...p });
  };

  const saveEditPurchase = async () => {
    await base44.entities.ItemPurchase.update(editingPurchaseId, {
      ...editPurchaseForm, item_price: Number(editPurchaseForm.item_price) || 0, quantity: Number(editPurchaseForm.quantity) || 1
    });
    setEditingPurchaseId(null);
    fetchData();
  };

  const stats = computeCafeStats(purchases, null);

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

      <div className="flex gap-2">
        <button onClick={() => setTab('purchases')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'purchases' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>خریدها</button>
        <button onClick={() => setTab('inventory')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'inventory' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>انبار آیتم‌ها</button>
      </div>

      {tab === 'inventory' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> {editingItemId ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}</h3>
            <form onSubmit={handleItemSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input type="text" placeholder="اسم آیتم" value={editingItemId ? editItemForm.name : itemForm.name} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, name: e.target.value }) : setItemForm({ ...itemForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="text" placeholder="کتگوری" value={editingItemId ? editItemForm.category : itemForm.category} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, category: e.target.value }) : setItemForm({ ...itemForm, category: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="number" placeholder="قیمت (تومان)" value={editingItemId ? editItemForm.price : itemForm.price} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, price: e.target.value }) : setItemForm({ ...itemForm, price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="text" placeholder="برند" value={editingItemId ? editItemForm.brand : itemForm.brand} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, brand: e.target.value }) : setItemForm({ ...itemForm, brand: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="number" placeholder="موجودی اولیه" value={editingItemId ? editItemForm.initial_stock : itemForm.initial_stock} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, initial_stock: e.target.value }) : setItemForm({ ...itemForm, initial_stock: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
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
              <div className="p-8 text-center text-muted-foreground">هنوز آیمی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">اسم</th>
                      <th className="text-right p-3 font-medium">کتگوری</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-right p-3 font-medium">برند</th>
                      <th className="text-center p-3 font-medium">موجودی اولیه</th>
                      <th className="text-center p-3 font-medium">موجودی فعلی</th>
                      <th className="text-center p-3 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const stock = computeCurrentStock(item, purchases);
                      return (
                        <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                          <td className="p-3 font-medium">{item.name}</td>
                          <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                          <td className="p-3">{formatCurrency(item.price)}</td>
                          <td className="p-3">{item.brand || '-'}</td>
                          <td className="p-3 text-center">{toPersianNum(item.initial_stock)}</td>
                          <td className="p-3 text-center">
                            <span className={stock <= 0 ? 'text-red-600 font-medium' : stock <= 5 ? 'text-[#B9834B] font-medium' : 'text-green-600 font-medium'}>
                              {toPersianNum(stock)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => startEditItem(item)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => deleteItem(item.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت خرید جدید</h3>
            {items.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {items.map(item => (
                  <button key={item.id} type="button" onClick={() => selectItem(item)} className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-border hover:bg-[#FDF2F1] text-sm transition-colors">
                    <span>{item.name}</span>
                    <span className="text-muted-foreground text-xs mr-2">{toPersianNum(item.price)}</span>
                  </button>
                ))}
              </div>
            )}
            <form onSubmit={handlePurchaseSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input type="text" placeholder="نام مشتری" value={purchaseForm.person_name} onChange={e => setPurchaseForm({ ...purchaseForm, person_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="tel" placeholder="شماره تلفن" value={purchaseForm.person_phone} onChange={e => setPurchaseForm({ ...purchaseForm, person_phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="text" placeholder="آیتم" value={purchaseForm.item_name} onChange={e => setPurchaseForm({ ...purchaseForm, item_name: e.target.value, item_price: items.find(i => i.name === e.target.value)?.price || '' })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="number" placeholder="قیمت" value={purchaseForm.item_price} onChange={e => setPurchaseForm({ ...purchaseForm, item_price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="number" placeholder="تعداد" value={purchaseForm.quantity} onChange={e => setPurchaseForm({ ...purchaseForm, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <JalaliDateInput value={purchaseForm.purchase_date} onChange={v => setPurchaseForm({ ...purchaseForm, purchase_date: v })} required />
              <select value={purchaseForm.payment_method} onChange={e => setPurchaseForm({ ...purchaseForm, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={purchaseForm.purchase_reason} onChange={e => setPurchaseForm({ ...purchaseForm, purchase_reason: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  {submitting ? 'در حال ثبت...' : 'ثبت خرید'}
                </button>
                {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
              </div>
            </form>
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
                      <th className="text-right p-3 font-medium">شماره</th>
                      <th className="text-right p-3 font-medium">تعداد</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-right p-3 font-medium">پرداخت</th>
                      <th className="text-center p-3 font-medium">وضعیت</th>
                      <th className="text-center p-3 font-medium">ویرایش</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.map(p => (
                      <React.Fragment key={p.id}>
                        <tr className="border-t border-border hover:bg-muted/30">
                          <td className="p-3">{toJalaliStr(p.purchase_date)}</td>
                          <td className="p-3 font-medium">{p.item_name}</td>
                          <td className="p-3">{p.person_name || '-'}</td>
                          <td className="p-3 text-muted-foreground">{p.person_phone}</td>
                          <td className="p-3">{toPersianNum(p.quantity)}</td>
                          <td className="p-3">{formatCurrency(p.item_price * p.quantity)}</td>
                          <td className="p-3 text-xs">{paymentMethodLabels[p.payment_method] || p.payment_method}</td>
                          <td className="p-3 text-center">
                            <button onClick={() => togglePaid(p)} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                              {p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                            </button>
                          </td>
                          <td className="p-3 text-center">
                            <button onClick={() => startEditPurchase(p)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                          </td>
                        </tr>
                        {editingPurchaseId === p.id && (
                          <tr className="border-t border-border bg-muted/20">
                            <td colSpan={9} className="p-4">
                              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                <input type="text" placeholder="آیتم" value={editPurchaseForm.item_name} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, item_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                                <input type="number" placeholder="قیمت" value={editPurchaseForm.item_price} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, item_price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                                <input type="number" placeholder="تعداد" value={editPurchaseForm.quantity} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                                <input type="text" placeholder="نام" value={editPurchaseForm.person_name} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, person_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                                <input type="tel" placeholder="شماره" value={editPurchaseForm.person_phone} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, person_phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                                <select value={editPurchaseForm.payment_method} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <select value={editPurchaseForm.purchase_reason} onChange={e => setEditPurchaseForm({ ...editPurchaseForm, purchase_reason: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                                  {Object.entries(purchaseReasonLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                </select>
                                <JalaliDateInput value={editPurchaseForm.purchase_date} onChange={v => setEditPurchaseForm({ ...editPurchaseForm, purchase_date: v })} />
                                <div className="flex gap-2">
                                  <button onClick={saveEditPurchase} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#B74B40] text-white text-sm"><Check className="w-4 h-4" /> ذخیره</button>
                                  <button onClick={() => setEditingPurchaseId(null)} className="px-3 py-2 rounded-lg border border-border text-sm"><X className="w-4 h-4" /></button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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
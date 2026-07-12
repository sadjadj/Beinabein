import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Briefcase, Users, Repeat, Plus, ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { computeWorkspaceStats, findOrCreatePerson, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import FloatingDateInput from '@/components/FloatingDateInput';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

export default function WorkspacePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('orders');
  const [orderForm, setOrderForm] = useState({ person_name: '', person_phone: '', subscription_id: '', quantity: 1, purchase_date: '', payment_method: 'cash', entry_time: '', usage_date: '', how_met: '' });
  const [subForm, setSubForm] = useState({ name: '', price: '' });
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubForm, setEditSubForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orders, subs] = await Promise.all([
        base44.entities.WorkspaceOrder.list('-purchase_date', 200),
        base44.entities.WorkspaceSubscription.list('-created_date', 100)
      ]);
      setRecords(orders);
      setSubscriptions(subs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.person_phone || !orderForm.purchase_date) return;
    setSubmitting(true);
    try {
      await findOrCreatePerson(orderForm.person_phone, orderForm.person_name);
      const sub = subscriptions.find(s => s.id === orderForm.subscription_id);
      await base44.entities.WorkspaceOrder.create({
        ...orderForm,
        subscription_name: sub?.name || '',
        price: sub?.price || 0,
        quantity: Number(orderForm.quantity) || 1,
        how_met: orderForm.how_met || 'other'
      });
      setOrderForm({ person_name: '', person_phone: '', subscription_id: '', quantity: 1, purchase_date: '', payment_method: 'cash', entry_time: '', usage_date: '', how_met: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    const activeForm = editingSubId ? editSubForm : subForm;
    if (!activeForm.name) return;
    setSubmitting(true);
    try {
      if (editingSubId) {
        await base44.entities.WorkspaceSubscription.update(editingSubId, { name: editSubForm.name, price: Number(editSubForm.price) || 0 });
        setEditingSubId(null);
        setEditSubForm({});
      } else {
        await base44.entities.WorkspaceSubscription.create({ ...subForm, price: Number(subForm.price) || 0 });
        setSubForm({ name: '', price: '' });
      }
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEditSub = (s) => {
    setEditingSubId(s.id);
    setEditSubForm({ name: s.name, price: s.price });
  };

  const deleteSub = async (id) => {
    await base44.entities.WorkspaceSubscription.delete(id);
    fetchData();
  };

  const togglePaid = async (r) => {
    await base44.entities.WorkspaceOrder.update(r.id, { is_paid: !r.is_paid });
    fetchData();
  };

  const stats = computeWorkspaceStats(records, null);

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-7 w-28" />
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
        <h1 className="text-2xl font-bold">فضای کار</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت سفارش و مدیریت اشتراک‌ها</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="مجموع سفارش‌ها" value={toPersianNum(stats.totalOrders)} icon={Briefcase} color="terracotta" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="teal" />
        <StatCard label="افراد تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="ochre" />
        <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">درآمد کل</p>
              <p className="text-xl lg:text-2xl font-bold mt-2 text-foreground break-words leading-tight">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FBF0F1] flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-[#D98B94]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('orders')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'orders' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>سفارش‌ها</button>
        <button onClick={() => setTab('subscriptions')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'subscriptions' ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>اشتراک‌های فضا کار</button>
      </div>

      {tab === 'subscriptions' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> {editingSubId ? 'ویرایش اشتراک' : 'افزودن اشتراک جدید'}</h3>
            <form onSubmit={handleSubSubmit} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام اشتراک</label>
                <input type="text" placeholder="مثلاً صندلی روزانه" value={editingSubId ? editSubForm.name : subForm.name} onChange={e => editingSubId ? setEditSubForm({ ...editSubForm, name: e.target.value }) : setSubForm({ ...subForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
                <PriceInput value={editingSubId ? editSubForm.price : subForm.price} onChange={v => editingSubId ? setEditSubForm({ ...editSubForm, price: v }) : setSubForm({ ...subForm, price: v })} required />
              </div>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : editingSubId ? 'ذخیره' : 'افزودن'}
              </button>
              {editingSubId && <button type="button" onClick={() => setEditingSubId(null)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>}
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">اشتراک‌های تعریف شده ({toPersianNum(subscriptions.length)})</h3></div>
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز اشتراکی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">نام اشتراک</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-center p-3 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(s => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3">{formatCurrency(s.price)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => startEditSub(s)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteSub(s.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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

      {tab === 'orders' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت سفارش جدید</h3>
            <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
                <PersonSearch
                  personName={orderForm.person_name}
                  personPhone={orderForm.person_phone}
                  onNameChange={v => setOrderForm({ ...orderForm, person_name: v })}
                  onPhoneChange={v => setOrderForm({ ...orderForm, person_phone: v })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل اشتراک</label>
                <select value={orderForm.subscription_id} onChange={e => setOrderForm({ ...orderForm, subscription_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
                  <option value="">انتخاب اشتراک...</option>
                  {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name} — {toPersianNum(s.price)} تومان</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
                <PersianNumberInput value={orderForm.quantity} onChange={v => setOrderForm({ ...orderForm, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تاریخ خرید</label>
                <FloatingDateInput value={orderForm.purchase_date} onChange={v => setOrderForm({ ...orderForm, purchase_date: v })} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تاریخ استفاده</label>
                <FloatingDateInput value={orderForm.usage_date} onChange={v => setOrderForm({ ...orderForm, usage_date: v })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">زمان ورود (ساعت)</label>
                <select value={orderForm.entry_time} onChange={e => setOrderForm({ ...orderForm, entry_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">انتخاب ساعت...</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={String(h).padStart(2, '0') + ':00'}>{toPersianNum(String(h).padStart(2, '0'))}:۰۰</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                <select value={orderForm.payment_method} onChange={e => setOrderForm({ ...orderForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل آشنایی</label>
                <select value={orderForm.how_met} onChange={e => setOrderForm({ ...orderForm, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">انتخاب...</option>
                  {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  {submitting ? 'در حال ثبت...' : 'ثبت سفارش'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">سفارش‌های اخیر</h3></div>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز سفارشی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">تاریخ خرید</th>
                      <th className="text-right p-3 font-medium">اشتراک</th>
                      <th className="text-right p-3 font-medium">نام</th>
                      <th className="text-right p-3 font-medium">شماره</th>
                      <th className="text-right p-3 font-medium">ورود</th>
                      <th className="text-right p-3 font-medium">مدل پرداخت</th>
                      <th className="text-center p-3 font-medium">وضعیت</th>
                      <th className="text-center p-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r.id} className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => navigate(`/workspace/${r.id}`)}>
                        <td className="p-3">{r.purchase_date ? toJalaliStr(r.purchase_date) : '-'}</td>
                        <td className="p-3">{r.subscription_name || '-'}</td>
                        <td className="p-3">{r.person_name || '-'}</td>
                        <td className="p-3 text-muted-foreground">{r.person_phone}</td>
                        <td className="p-3">{r.entry_time || '-'}</td>
                        <td className="p-3 text-xs">{paymentMethodLabels[r.payment_method] || r.payment_method}</td>
                        <td className="p-3 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); togglePaid(r); }}
                            className={`text-xs font-medium px-2 py-1 rounded ${r.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}
                          >
                            {r.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                          </button>
                        </td>
                        <td className="p-3 text-center">
                          <ChevronLeft className="w-4 h-4 text-muted-foreground inline-block" />
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
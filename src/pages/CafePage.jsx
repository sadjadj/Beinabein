import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import StatCard from '@/components/StatCard';
import { Coffee, Users, TrendingUp, Plus, ClipboardList } from 'lucide-react';
import { computeCafeStats, findOrCreatePerson, toPersianNum, formatCurrency, formatPercent } from '@/lib/stats';
import { CAFE_ITEMS } from '@/lib/cafeItems';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

const reasonLabels = { workspace: 'فضای کار', workshop: 'کارگاه', event: 'رویداد', independent: 'مستقل' };

export default function CafePage() {
  const [records, setRecords] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', name: '', amount: '', purchase_date: todayGregorian(), entry_reason: 'independent' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purchases, wsVisits] = await Promise.all([
        base44.entities.CafePurchase.list('-purchase_date', 200),
        base44.entities.WorkspaceVisit.list('-visit_date', 200)
      ]);
      setRecords(purchases);
      setVisits(wsVisits);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.amount || !form.purchase_date) return;
    setSubmitting(true); setMessage(null);
    try {
      await findOrCreatePerson(form.phone, form.name);
      await base44.entities.CafePurchase.create({
        person_phone: form.phone, person_name: form.name,
        amount: Number(form.amount), purchase_date: form.purchase_date,
        entry_reason: form.entry_reason
      });
      setMessage({ type: 'success', text: 'خرید ثبت شد' });
      setForm({ phone: '', name: '', amount: '', purchase_date: todayGregorian(), entry_reason: 'independent' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const selectItem = (item) => {
    setForm({ ...form, amount: item.price });
  };

  const stats = computeCafeStats(records, visits, null);
  const chartData = Object.entries(stats.salesByReason).map(([reason, amount]) => ({ name: reasonLabels[reason] || reason, amount }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">کافه</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت خرید و گزارش کافه</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد خرید" value={toPersianNum(stats.totalPurchases)} icon={Coffee} color="terracotta" />
        <StatCard label="خریداران یونیک" value={toPersianNum(stats.uniqueBuyerCount)} icon={Users} color="teal" />
        <StatCard label="میانگین خرید تکراری" value={formatCurrency(stats.repeatAvg)} icon={TrendingUp} color="ochre" />
        <StatCard label="نسبت خرید به حضور" value={formatPercent(stats.purchaseRate)} icon={TrendingUp} color="pink" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><ClipboardList className="w-4 h-4 text-[#B74B40]" /> منوی کافه (قیمت ثابت)</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {CAFE_ITEMS.map(item => (
            <button
              key={item.name}
              type="button"
              onClick={() => selectItem(item)}
              className="flex items-center justify-between px-3 py-2 rounded-lg border border-border hover:bg-gray-50 text-sm transition-colors"
            >
              <span>{item.name}</span>
              <span className="text-muted-foreground text-xs">{toPersianNum(item.price)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت خرید جدید</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input type="tel" placeholder="شماره تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="text" placeholder="نام" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="number" placeholder="مبلغ (تومان)" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} required />
          <select value={form.entry_reason} onChange={e => setForm({ ...form, entry_reason: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="independent">مستقل</option>
            <option value="workspace">فضای کار</option>
            <option value="workshop">کارگاه</option>
            <option value="event">رویداد</option>
          </select>
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت'}
            </button>
            {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
          </div>
        </form>
      </div>

      {chartData.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">فروش به تفکیک دلیل ورود</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => toPersianNum(v)} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Bar dataKey="amount" fill="#B74B40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">خریدهای اخیر</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز خرید ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-right p-3 font-medium">دلیل ورود</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{toJalaliStr(r.purchase_date)}</td>
                    <td className="p-3">{r.person_phone}</td>
                    <td className="p-3">{r.person_name || '-'}</td>
                    <td className="p-3">{formatCurrency(r.amount)}</td>
                    <td className="p-3">{reasonLabels[r.entry_reason] || r.entry_reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
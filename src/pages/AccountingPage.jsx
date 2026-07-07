import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Wallet, TrendingUp, TrendingDown, Plus, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { toPersianNum, formatCurrency, formatPercent } from '@/lib/stats';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

const categoryLabels = { workshop: 'کارگاه', event: 'رویداد', cafe: 'کافه', expense: 'هزینه' };
const paymentModelLabels = { monthly: 'ماهانه', one_time: 'یکجا' };

export default function AccountingPage() {
  const [transactions, setTransactions] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all'); // all, paid, unpaid, monthly
  const [form, setForm] = useState({ person_name: '', person_phone: '', description: '', amount: '', type: 'income', category: 'workshop', date: todayGregorian(), payment_model: 'one_time', is_paid: false, related_workshop_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txns, ws] = await Promise.all([
        base44.entities.Transaction.list('-date', 500),
        base44.entities.Workshop.list('-date', 500)
      ]);
      setTransactions(txns);
      setWorkshops(ws);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.description || !form.amount || !form.date) return;
    setSubmitting(true);
    try {
      await base44.entities.Transaction.create({
        ...form,
        amount: Number(form.amount),
        related_workshop_id: form.related_workshop_id || null
      });
      setForm({ person_name: '', person_phone: '', description: '', amount: '', type: 'income', category: 'workshop', date: todayGregorian(), payment_model: 'one_time', is_paid: false, related_workshop_id: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const togglePaid = async (txn) => {
    await base44.entities.Transaction.update(txn.id, { is_paid: !txn.is_paid });
    fetchData();
  };

  // Calculate monthly P&L
  const now = new Date();
  const currentMonth = now.toISOString().substring(0, 7);
  const monthTxns = transactions.filter(t => t.date && t.date.startsWith(currentMonth));
  const income = monthTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = monthTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const profit = income - expenses;

  const unpaidTxns = transactions.filter(t => !t.is_paid && t.type === 'income');
  const monthlyUnpaid = unpaidTxns.filter(t => t.payment_model === 'monthly');

  const filtered = transactions.filter(t => {
    if (filter === 'paid') return t.is_paid;
    if (filter === 'unpaid') return !t.is_paid && t.type === 'income';
    if (filter === 'monthly') return t.payment_model === 'monthly';
    return true;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">حسابداری</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت تراکنش‌ها و سود و زیان</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت تراکنش
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="درآمد این ماه" value={formatCurrency(income)} icon={TrendingUp} color="terracotta" />
        <StatCard label="هزینه این ماه" value={formatCurrency(expenses)} icon={TrendingDown} color="pink" />
        <StatCard label="سود/زیان این ماه" value={formatCurrency(profit)} sublabel={profit >= 0 ? 'سود' : 'زیان'} icon={Wallet} color={profit >= 0 ? 'teal' : 'pink'} />
        <StatCard label="پرداخت‌نشده" value={toPersianNum(unpaidTxns.length)} sublabel={`${formatCurrency(unpaidTxns.reduce((s, t) => s + (t.amount || 0), 0))}`} icon={AlertCircle} color="ochre" />
      </div>

      {monthlyUnpaid.length > 0 && (
        <div className="bg-[#FBF3EC] rounded-xl border border-[#E8D5C0] p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#B9834B]">
            <Bell className="w-4 h-4" /> یادآوری پیگیری پرداخت‌های ماهانه ({toPersianNum(monthlyUnpaid.length)} مورد)
          </h3>
          <div className="space-y-2">
            {monthlyUnpaid.map(t => (
              <div key={t.id} className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{t.person_name || 'نامشخص'}</p>
                  <p className="text-xs text-muted-foreground">{t.description} • {t.person_phone || '-'}</p>
                </div>
                <div className="text-left">
                  <p className="font-semibold">{formatCurrency(t.amount)}</p>
                  <button onClick={() => togglePaid(t)} className="text-xs text-[#B74B40] hover:underline mt-1">ثبت پرداخت</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input type="text" placeholder="نام" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="tel" placeholder="شماره تلفن" value={form.person_phone} onChange={e => setForm({ ...form, person_phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="توضیحات" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="number" placeholder="مبلغ" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="income">درآمد</option>
              <option value="expense">هزینه</option>
            </select>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(categoryLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.payment_model} onChange={e => setForm({ ...form, payment_model: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(paymentModelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <JalaliDateInput value={form.date} onChange={v => setForm({ ...form, date: v })} required />
            <label className="flex items-center gap-2 text-sm col-span-1">
              <input type="checkbox" checked={form.is_paid} onChange={e => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4" />
              پرداخت شده
            </label>
            <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2">
          {['all', 'paid', 'unpaid', 'monthly'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {f === 'all' ? 'همه' : f === 'paid' ? 'پرداخت‌شده' : f === 'unpaid' ? 'پرداخت‌نشده' : 'ماهانه'}
            </button>
          ))}
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">تراکنشی یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">توضیحات</th>
                  <th className="text-right p-3 font-medium">نوع</th>
                  <th className="text-right p-3 font-medium">دسته</th>
                  <th className="text-right p-3 font-medium">مدل</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-right p-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{toJalaliStr(t.date)}</td>
                    <td className="p-3">{t.person_name || '-'}</td>
                    <td className="p-3">{t.description}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${t.type === 'income' ? 'bg-[#F0F7F8] text-[#8CB9C0]' : 'bg-[#FBF0F1] text-[#D98B94]'}`}>
                        {t.type === 'income' ? 'درآمد' : 'هزینه'}
                      </span>
                    </td>
                    <td className="p-3">{categoryLabels[t.category] || t.category}</td>
                    <td className="p-3 text-xs">{paymentModelLabels[t.payment_model] || 'یکجا'}</td>
                    <td className="p-3 font-medium">{formatCurrency(t.amount)}</td>
                    <td className="p-3">
                      <button onClick={() => togglePaid(t)} className="inline-flex items-center gap-1 text-xs">
                        {t.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> پرداخت شده</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#B9834B]"><AlertCircle className="w-3.5 h-3.5" /> پرداخت‌نشده</span>
                        )}
                      </button>
                    </td>
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
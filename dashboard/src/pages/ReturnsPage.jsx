import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { RotateCcw, Plus, Trash2, CheckCircle, AlertCircle, Wallet, Search } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PriceInput from '@/components/PriceInput';
import ExportButton from '@/components/ExportButton';
import { TableSkeleton } from '@/components/SkeletonPatterns';

export default function ReturnsPage({ embedded = false }) {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ person_name: '', person_phone: '', item_name: '', amount: '', return_date: todayGregorian(), reason: '' });
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Returns.list('-return_date', 500);
      setReturns(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.person_phone || !form.return_date) return;
    setSubmitting(true);
    try {
      await findOrCreatePerson(form.person_phone, form.person_name);
      await base44.entities.Returns.create({
        ...form,
        amount: Number(form.amount) || 0
      });
      setForm({ person_name: '', person_phone: '', item_name: '', amount: '', return_date: todayGregorian(), reason: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const deleteReturn = async (id) => {
    await base44.entities.Returns.delete(id);
    fetchData();
  };

  const toggleRefunded = async (r) => {
    await base44.entities.Returns.update(r.id, { is_refunded: !r.is_refunded });
    fetchData();
  };

  const filteredReturns = returns.filter(r => {
    if (dateFrom && (!r.return_date || r.return_date < dateFrom)) return false;
    if (dateTo && (!r.return_date || r.return_date > dateTo)) return false;
    if (!search) return true;
    const s = search.trim().toLowerCase();
    return (r.person_name || '').toLowerCase().includes(s) ||
      (r.person_phone || '').includes(search) ||
      (r.item_name || '').toLowerCase().includes(s);
  });

  const totalReturns = filteredReturns.length;
  const totalAmount = filteredReturns.reduce((s, r) => s + (r.amount || 0), 0);
  const pendingCount = filteredReturns.filter(r => !r.is_refunded).length;

  const exportColumns = [
    { key: 'date', label: 'تاریخ' },
    { key: 'name', label: 'نام' },
    { key: 'phone', label: 'شماره' },
    { key: 'item', label: 'آیتم' },
    { key: 'reason', label: 'دلیل' },
    { key: 'amount', label: 'مبلغ' },
    { key: 'status', label: 'وضعیت' },
  ];
  const exportRows = filteredReturns.map(r => ({
    date: r.return_date ? toJalaliStr(r.return_date) : '',
    name: r.person_name || '-',
    phone: r.person_phone || '',
    item: r.item_name || '-',
    reason: r.reason || '-',
    amount: r.amount || 0,
    status: r.is_refunded ? 'بازگشت شده' : 'در انتظار',
  }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {!embedded && (
      <div>
        <h1 className="text-2xl font-bold">مرجوعی</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت مرجوعی‌ها و بازگشت وجه</p>
      </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="کل مرجوعی‌ها" value={toPersianNum(totalReturns)} icon={RotateCcw} color="terracotta" info="تعداد کل مرجوعی‌های ثبت‌شده در بازه فیلترشده" />
        <StatCard label="مبلغ کل" value={formatCurrency(totalAmount)} icon={Wallet} color="pink" info="مجموع مبالغ مرجوعی‌ها در بازه فیلترشده" />
        <StatCard label="در انتظار بازگشت" value={toPersianNum(pendingCount)} icon={AlertCircle} color="ochre" info="تعداد مرجوعی‌هایی که وجه آن‌ها هنوز بازگردانده نشده است" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت مرجوعی جدید</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
            <input type="text" placeholder="نام مشتری" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">شماره تلفن *</label>
            <input type="tel" placeholder="شماره تلفن" value={form.person_phone} onChange={e => setForm({ ...form, person_phone: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">آیتم مرجوعی</label>
            <input type="text" placeholder="آیتم" value={form.item_name} onChange={e => setForm({ ...form, item_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مبلغ بازگشتی به تومان</label>
            <PriceInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ مرجوعی *</label>
            <JalaliDateInput value={form.return_date} onChange={v => setForm({ ...form, return_date: v })} required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">دلیل</label>
            <input type="text" placeholder="دلیل مرجوعی" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت مرجوعی'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">فهرست مرجوعی‌ها ({toPersianNum(filteredReturns.length)})</h3>
            <ExportButton filename="مرجوعی‌ها" columns={exportColumns} rows={exportRows} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="جستجو نام / شماره / آیتم..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">از</span>
              <JalaliDateInput value={dateFrom} onChange={setDateFrom} showToday={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">تا</span>
              <JalaliDateInput value={dateTo} onChange={setDateTo} showToday={false} />
            </div>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={7} />
        ) : filteredReturns.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز مرجوعی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">آیتم</th>
                  <th className="text-right p-3 font-medium">دلیل</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                  <th className="text-center p-3 font-medium">حذف</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{toJalaliStr(r.return_date)}</td>
                    <td className="p-3 font-medium">{r.person_name || '-'}</td>
                    <td className="p-3 text-muted-foreground">{r.person_phone}</td>
                    <td className="p-3">{r.item_name || '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground">{r.reason || '-'}</td>
                    <td className="p-3 font-medium">{formatCurrency(r.amount)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => toggleRefunded(r)} className="inline-flex items-center gap-1 text-xs">
                        {r.is_refunded ? (
                          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> بازگشت شده</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#B9834B]"><AlertCircle className="w-3.5 h-3.5" /> در انتظار</span>
                        )}
                      </button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteReturn(r.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
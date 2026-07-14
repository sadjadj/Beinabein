import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Plus, Search, Wallet, GraduationCap, CheckCircle, AlertCircle, Trash2, Pencil } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import WorkshopSearchSelect from '@/components/WorkshopSearchSelect';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian } from '@/lib/jalali';

export default function WorkshopRegistrationsPage() {
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [dupWarning, setDupWarning] = useState('');
  const [form, setForm] = useState({
    workshop_id: '', person_name: '', person_phone: '', price: '', quantity: 1,
    purchase_date: todayGregorian(), payment_method: 'cash', how_met: 'other',
    is_paid: false, registered_sessions: '', donation: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ws, purchs, ppl] = await Promise.all([
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
        base44.entities.Person.list('-created_date', 1000)
      ]);
      setWorkshops(ws);
      setPurchases(purchs);
      setPersons(ppl);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const workshopById = {};
  workshops.forEach(w => { workshopById[w.id] = w; });
  const personByPhone = {};
  persons.forEach(p => { if (p.phone) personByPhone[p.phone] = p; });

  const totalReg = purchases.length;
  const paidCount = purchases.filter(p => p.is_paid).length;
  const totalRevenue = purchases.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0), 0);
  const uniquePeople = new Set(purchases.map(p => p.person_phone)).size;

  const filtered = purchases.filter(p => {
    if (workshopFilter && p.workshop_id !== workshopFilter) return false;
    if (paidFilter === 'paid' && !p.is_paid) return false;
    if (paidFilter === 'unpaid' && p.is_paid) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.person_name || '').toLowerCase().includes(s) ||
      (p.person_phone || '').includes(search) ||
      (p.workshop_title || '').toLowerCase().includes(s);
  });

  const addRegistration = async () => {
    if (!form.workshop_id || !form.person_phone) return;
    const dup = purchases.find(p => p.workshop_id === form.workshop_id && p.person_phone === form.person_phone);
    if (dup) {
      setDupWarning('این شخص قبلاً در این کارگاه ثبت‌نام شده است.');
      return;
    }
    setDupWarning('');
    setSubmitting(true);
    try {
      const ws = workshopById[form.workshop_id];
      await findOrCreatePerson(form.person_phone, form.person_name);
      await base44.entities.WorkshopPurchase.create({
        workshop_id: form.workshop_id,
        workshop_title: ws?.title || '',
        person_name: form.person_name,
        person_phone: form.person_phone,
        price: Number(form.price) || ws?.price || 0,
        quantity: Number(form.quantity) || 1,
        purchase_date: form.purchase_date,
        payment_method: form.payment_method,
        how_met: form.how_met || 'other',
        is_paid: form.is_paid,
        registered_sessions: form.registered_sessions ? Number(form.registered_sessions) : null,
        donation: Number(form.donation) || 0
      });
      setForm({ workshop_id: '', person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: 'other', is_paid: false, registered_sessions: '', donation: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const deleteRegistration = async (id) => {
    await base44.entities.WorkshopPurchase.delete(id);
    fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ثبت‌نام کارگاه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت و مدیریت ثبت‌نامی‌های همه کارگاه‌ها</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجوی نام / تلفن / کارگاه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-64" />
          </div>
          <button onClick={() => { setShowForm(!showForm); setDupWarning(''); }} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت‌نام جدید
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="کل ثبت‌نامی‌ها" value={toPersianNum(totalReg)} icon={Users} color="terracotta" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniquePeople)} icon={GraduationCap} color="teal" />
        <StatCard label="پرداخت‌شده" value={toPersianNum(paidCount)} icon={CheckCircle} color="green" sublabel={`از ${toPersianNum(totalReg)}`} />
        <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">درآمد کل</p>
              <p className="text-lg lg:text-xl font-bold mt-2 text-foreground break-words leading-tight">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FBF0F1] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#D98B94]" />
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">ثبت‌نام جدید</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">کارگاه</label>
              <WorkshopSearchSelect
                workshops={workshops.filter(w => !w.is_ended)}
                value={form.workshop_id}
                onChange={(wid) => { const ws = workshopById[wid]; setForm({ ...form, workshop_id: wid, price: ws?.price || '' }); }}
              />
            </div>
            <PersonSearch personName={form.person_name} personPhone={form.person_phone} onNameChange={v => setForm({ ...form, person_name: v })} onPhoneChange={v => setForm({ ...form, person_phone: v })} />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
              <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">دونیشین (تومان)</label>
              <PriceInput value={form.donation} onChange={v => setForm({ ...form, donation: v })} placeholder="اختیاری" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
              <PersianNumberInput value={form.quantity} onChange={v => setForm({ ...form, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تعداد جلسات (اختیاری)</label>
              <PersianNumberInput value={form.registered_sessions} onChange={v => setForm({ ...form, registered_sessions: v })} placeholder="تعداد جلسات" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ ثبت</label>
              <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
              <select value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2">
              <input type="checkbox" checked={form.is_paid} onChange={e => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
            </label>
          </div>
          {dupWarning && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{dupWarning}</div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={addRegistration} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">ثبت‌نامی‌ها ({toPersianNum(filtered.length)})</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={workshopFilter} onChange={e => setWorkshopFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="">همه کارگاه‌ها</option>
              {workshops.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
            </select>
            <div className="flex items-center gap-1">
              {[['', 'همه'], ['paid', 'پرداخت‌شده'], ['unpaid', 'پرداخت‌نشده']].map(([val, lbl]) => (
                <button key={val} onClick={() => setPaidFilter(val)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${paidFilter === val ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={8} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search || workshopFilter || paidFilter ? 'نتیجه‌ای یافت نشد' : 'هنوز ثبت‌نامی وجود ندارد'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">تلفن</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-right p-3 font-medium">پرداخت</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <Link to={`/workshops/${p.workshop_id}`} className="font-medium hover:text-[#B74B40]">{p.workshop_title || '-'}</Link>
                      {p.registered_sessions && <span className="text-xs text-[#B9834B] block mt-0.5">{toPersianNum(p.registered_sessions)} جلسه</span>}
                    </td>
                    <td className="p-3">
                      {personByPhone[p.person_phone]
                        ? <Link to={`/people/${personByPhone[p.person_phone].id}`} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
                        : <span className="font-medium">{p.person_name || '-'}</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap" dir="ltr">{p.person_phone || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{p.purchase_date ? formatJalaliShort(p.purchase_date) : '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">
                      {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0))}
                      {Number(p.donation) > 0 && <span className="block text-[10px] text-[#8CB9C0]">شامل {formatCurrency(Number(p.donation))} دونیشین</span>}
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex items-center gap-1 text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                        {p.is_paid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {p.is_paid ? 'پرداخت‌شده' : 'پرداخت‌نشده'}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link to={`/accounting/workshop/${p.id}`} className="text-muted-foreground hover:text-[#B74B40]" title="ویرایش فاکتور">
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button onClick={() => deleteRegistration(p.id)} className="text-muted-foreground hover:text-red-600" title="حذف">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
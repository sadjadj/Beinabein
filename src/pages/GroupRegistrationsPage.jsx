import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort, getJalaliParts } from '@/lib/jalali';
import { computeGroupSessions, gregorianToMonthKey, currentJalaliMonthKey } from '@/lib/groupSessions';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import { TableSkeleton } from '@/components/SkeletonPatterns';

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

function monthLabel(key) {
  if (!key) return '';
  const [jy, jm] = key.split('-').map(Number);
  return `${jMonths[jm - 1]} ${toPersianNum(jy)}`;
}

export default function GroupRegistrationsPage({ embedded = false }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [plans, setPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [monthKey, setMonthKey] = useState(currentJalaliMonthKey());
  const [showAdd, setShowAdd] = useState(false);
  const [dupWarning, setDupWarning] = useState('');
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: '' });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gs, plns, purchs, ppl] = await Promise.all([
          base44.entities.Group.list('-start_date', 500),
          base44.entities.GroupPlan.list('-created_date', 1000),
          base44.entities.GroupPurchase.list('-purchase_date', 1000),
          base44.entities.Person.list('-created_date', 500)
        ]);
        setGroups(gs);
        setPlans(plns);
        setPurchases(purchs);
        setPersons(ppl);
        if (gs.length > 0 && !selectedGroupId) setSelectedGroupId(gs[0].id);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const groupPlans = plans.filter(p => p.group_id === selectedGroupId);

  // Available months: from group start to today (or ended_at), Jalali months
  const availableMonths = useMemo(() => {
    if (!selectedGroup) return [currentJalaliMonthKey()];
    const sessions = computeGroupSessions(selectedGroup);
    const set = new Set(sessions.map(s => gregorianToMonthKey(s.date)));
    set.add(currentJalaliMonthKey());
    return [...set].sort();
  }, [selectedGroup]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(monthKey)) {
      setMonthKey(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  const monthPurchases = purchases.filter(p => p.group_id === selectedGroupId && p.month === monthKey)
    .sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));

  const personByPhone = {};
  persons.forEach(per => { if (per.phone) personByPhone[per.phone] = per; });

  const addRegistration = async () => {
    if (!selectedGroupId || !regForm.person_phone) return;
    const dup = monthPurchases.find(p => p.person_phone === regForm.person_phone);
    if (dup) { setDupWarning('این شخص در این ماه قبلاً در این گروه ثبت‌نام شده است.'); return; }
    setDupWarning('');
    setSubmitting(true);
    try {
      await findOrCreatePerson(regForm.person_phone, regForm.person_name);
      const newPurchase = await base44.entities.GroupPurchase.create({
        group_id: selectedGroupId,
        group_title: selectedGroup?.title || '',
        month: monthKey,
        person_name: regForm.person_name,
        person_phone: regForm.person_phone,
        price: Number(regForm.price) || 0,
        quantity: Number(regForm.quantity) || 1,
        purchase_date: regForm.purchase_date,
        payment_method: regForm.payment_method,
        how_met: regForm.how_met || 'other',
        is_paid: regForm.is_paid,
        donation: Number(regForm.donation) || 0,
        plan_name: groupPlans.find(p => p.id === regForm.plan_id)?.name || ''
      });
      setPurchases(prev => [newPurchase, ...prev]);
      setRegForm({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: '' });
      setShowAdd(false);
    } finally { setSubmitting(false); }
  };

  const togglePaid = async (p) => {
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !p.is_paid } : x));
    await base44.entities.GroupPurchase.update(p.id, { is_paid: !p.is_paid });
  };

  const deleteReg = async (id) => {
    setPurchases(prev => prev.filter(x => x.id !== id));
    await base44.entities.GroupPurchase.delete(id);
  };

  if (loading) return <div className="p-6"><TableSkeleton rows={5} cols={5} /></div>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">ثبت نام افراد در گروه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت نام افراد برای هر گروه و هر ماه به‌صورت جداگانه</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">گروه</label>
          <select value={selectedGroupId} onChange={e => setSelectedGroupId(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm min-w-[200px]">
            {groups.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">ماه</label>
          <select value={monthKey} onChange={e => setMonthKey(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
            {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت نام جدید
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl border border-border p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <PersonSearch personName={regForm.person_name} personPhone={regForm.person_phone} onNameChange={v => setRegForm({ ...regForm, person_name: v })} onPhoneChange={v => setRegForm({ ...regForm, person_phone: v })} />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام</label>
            <select value={regForm.plan_id} onChange={e => { const plan = groupPlans.find(p => p.id === e.target.value); setRegForm({ ...regForm, plan_id: e.target.value, price: plan ? plan.price : '' }); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">دستی (بدون پلن)</option>
              {groupPlans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
            </select>
          </div>
          <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
          <PriceInput value={regForm.donation} onChange={v => setRegForm({ ...regForm, donation: v })} placeholder="دونیشین (اختیاری)" />
          <input type="number" placeholder="تعداد" value={regForm.quantity} onChange={e => setRegForm({ ...regForm, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <JalaliDateInput value={regForm.purchase_date} onChange={v => setRegForm({ ...regForm, purchase_date: v })} />
          {!regForm.is_paid && (
            <select value={regForm.payment_method} onChange={e => setRegForm({ ...regForm, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          )}
          <select value={regForm.how_met} onChange={e => setRegForm({ ...regForm, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">نحوه آشنایی...</option>
            {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={regForm.is_paid} onChange={e => setRegForm({ ...regForm, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
          </label>
          {dupWarning && (
            <div className="sm:col-span-2 lg:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{dupWarning}</div>
          )}
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button onClick={addRegistration} disabled={submitting} className="px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت'}
            </button>
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">انصراف</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">ثبت‌نام‌های {selectedGroup ? selectedGroup.title : ''} در {monthLabel(monthKey)} ({toPersianNum(monthPurchases.length)})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">نام</th>
                <th className="text-right p-3 font-medium">شماره</th>
                <th className="text-right p-3 font-medium">مدل</th>
                <th className="text-right p-3 font-medium">تاریخ</th>
                <th className="text-right p-3 font-medium">مبلغ</th>
                <th className="text-center p-3 font-medium">پرداخت</th>
                <th className="text-center p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {monthPurchases.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">در این ماه ثبت‌نامی وجود ندارد</td></tr>
              ) : monthPurchases.map(p => {
                const total = (p.price || 0) * (p.quantity || 1) + (p.donation || 0);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/accounting/group/${p.id}`, { state: { from: '/groups' } })}>
                    <td className="p-3 font-medium">{p.person_name || '-'}</td>
                    <td className="p-3 text-muted-foreground" dir="ltr">{p.person_phone}</td>
                    <td className="p-3 text-xs">{p.plan_name || '-'}</td>
                    <td className="p-3 text-xs">{p.purchase_date ? formatJalaliShort(p.purchase_date) : '-'}</td>
                    <td className="p-3 text-xs">{formatCurrency(total)}</td>
                    <td className="p-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); togglePaid(p); }} className={`text-xs font-medium px-2 py-1 rounded ${p.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={(e) => { e.stopPropagation(); deleteReg(p.id); }} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
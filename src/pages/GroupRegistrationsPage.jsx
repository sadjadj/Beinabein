import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Trash2, RotateCcw } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort } from '@/lib/jalali';
import { currentJalaliMonthKey } from '@/lib/groupSessions';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import { TableSkeleton } from '@/components/SkeletonPatterns';

const paymentMethodDisplay = (method) => (method === 'free' ? '—' : (paymentMethodLabels[method] || method || '-'));

export default function GroupRegistrationsPage({ embedded = false }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [plans, setPlans] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [dupWarning, setDupWarning] = useState('');
  const [searchGroup, setSearchGroup] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [regForm, setRegForm] = useState({
    group_id: '', person_name: '', person_phone: '', price: '', quantity: 1,
    purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: ''
  });

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
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const groupById = {};
  groups.forEach(g => { groupById[g.id] = g; });
  const groupPlans = plans.filter(p => p.group_id === regForm.group_id);

  const today = todayGregorian();
  const todayPurchases = useMemo(() => purchases.filter(p => p.purchase_date === today)
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || '')), [purchases, today]);

  const filteredToday = todayPurchases.filter(p => {
    if (paidFilter === 'paid' && !p.is_paid) return false;
    if (paidFilter === 'unpaid' && p.is_paid) return false;
    if (!searchGroup) return true;
    return (p.group_title || groupById[p.group_id]?.title || '').toLowerCase().includes(searchGroup.toLowerCase());
  });

  const handlePlanChange = (planId) => {
    const plan = plans.find(p => p.id === planId);
    const isFree = plan && (Number(plan.price) === 0 || plan.name === 'رایگان');
    setRegForm(prev => ({
      ...prev, plan_id: planId, price: plan ? plan.price : '',
      is_paid: !!isFree, payment_method: isFree ? 'free' : 'cash'
    }));
  };

  const resetForm = () => {
    setRegForm({ group_id: '', person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: '' });
    setFormError('');
    setDupWarning('');
  };

  const addRegistration = async () => {
    if (!regForm.group_id) { setFormError('انتخاب گروه الزامی است'); return; }
    if (!regForm.plan_id) { setFormError('انتخاب مدل ثبت‌نام الزامی است'); return; }
    if (!regForm.person_name) { setFormError('نام مشتری الزامی است'); return; }
    if (!regForm.person_phone) { setFormError('شماره تلفن الزامی است'); return; }
    setFormError('');
    const selectedGroup = groupById[regForm.group_id];
    const monthKey = currentJalaliMonthKey();
    const dup = purchases.find(p => p.group_id === regForm.group_id && p.month === monthKey && p.person_phone === regForm.person_phone);
    if (dup) { setDupWarning('این شخص در این ماه قبلاً در این گروه ثبت‌نام شده است.'); return; }
    setDupWarning('');
    setSubmitting(true);
    try {
      await findOrCreatePerson(regForm.person_phone, regForm.person_name);
      const newPurchase = await base44.entities.GroupPurchase.create({
        group_id: regForm.group_id,
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
        plan_name: plans.find(p => p.id === regForm.plan_id)?.name || ''
      });
      setPurchases(prev => [newPurchase, ...prev]);
      resetForm();
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

  if (loading) return <div className="p-6"><TableSkeleton rows={5} cols={6} /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">ثبت نام گروه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت‌نام افراد در گروه‌ها و مشاهده ثبت‌نام‌های امروز</p>
        </div>
      )}

      {/* Registration Form — always visible */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">ثبت‌نام جدید</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">گروه *</label>
            <select value={regForm.group_id} onChange={e => { setRegForm(prev => ({ ...prev, group_id: e.target.value, plan_id: '', price: '' })); setFormError(''); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
              <option value="">انتخاب گروه...</option>
              {groups.filter(g => !g.is_ended).map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام *</label>
            <select value={regForm.plan_id} onChange={e => handlePlanChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
              <option value="">انتخاب مدل...</option>
              {groupPlans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام و شماره تلفن مشتری *</label>
            <PersonSearch personName={regForm.person_name} personPhone={regForm.person_phone} onNameChange={v => setRegForm({ ...regForm, person_name: v })} onPhoneChange={v => setRegForm({ ...regForm, person_phone: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان)</label>
            <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">دونیشین (تومان)</label>
            <PriceInput value={regForm.donation} onChange={v => setRegForm({ ...regForm, donation: v })} placeholder="اختیاری" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ ثبت</label>
            <JalaliDateInput value={regForm.purchase_date} onChange={v => setRegForm({ ...regForm, purchase_date: v })} showToday={false} max={todayGregorian()} />
          </div>
          {!regForm.is_paid && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
              <select value={regForm.payment_method} onChange={e => setRegForm({ ...regForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
            <select value={regForm.how_met} onChange={e => setRegForm({ ...regForm, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">انتخاب...</option>
              {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm py-2">
              <input type="checkbox" checked={regForm.is_paid} onChange={e => setRegForm({ ...regForm, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
            </label>
          </div>
        </div>
        {formError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{formError}</div>
        )}
        {dupWarning && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{dupWarning}</div>
        )}
        <div className="flex gap-2 mt-4">
          <button onClick={addRegistration} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : 'ثبت'}
          </button>
          <button onClick={resetForm} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> پاک کردن فرم
          </button>
        </div>
      </div>

      {/* Today's registrations list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <h3 className="text-sm font-semibold">ثبت‌نام‌های امروز ({toPersianNum(filteredToday.length)})</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <input type="text" placeholder="فیلتر نام گروه..." value={searchGroup} onChange={e => setSearchGroup(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm w-44" />
            <div className="flex items-center gap-1">
              {[['', 'همه'], ['paid', 'پرداخت‌شده'], ['unpaid', 'پرداخت‌نشده']].map(([val, lbl]) => (
                <button key={val} onClick={() => setPaidFilter(val)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${paidFilter === val ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{lbl}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">نام</th>
                <th className="text-right p-3 font-medium">گروه</th>
                <th className="text-right p-3 font-medium">مدل</th>
                <th className="text-center p-3 font-medium">تلفن</th>
                <th className="text-center p-3 font-medium">مبلغ</th>
                <th className="text-center p-3 font-medium">مدل پرداخت</th>
                <th className="text-center p-3 font-medium">پرداخت</th>
                <th className="text-center p-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filteredToday.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{searchGroup || paidFilter ? 'نتیجه‌ای یافت نشد' : 'امروز ثبت‌نامی وجود ندارد'}</td></tr>
              ) : filteredToday.map(p => {
                const total = (p.price || 0) * (p.quantity || 1) + (p.donation || 0);
                return (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/accounting/group/${p.id}`, { state: { from: '/groups' } })}>
                    <td className="p-3 font-medium">{p.person_name || '-'}</td>
                    <td className="p-3">{p.group_title || groupById[p.group_id]?.title || '-'}</td>
                    <td className="p-3 text-xs">{p.plan_name || '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground text-center whitespace-nowrap" dir="ltr">{p.person_phone}</td>
                    <td className="p-3 text-xs text-center whitespace-nowrap">{formatCurrency(total)}</td>
                    <td className="p-3 text-xs text-center">{paymentMethodDisplay(p.payment_method)}</td>
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
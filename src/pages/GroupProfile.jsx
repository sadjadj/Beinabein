import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowRight, Pencil, Users, Calendar, Clock, MapPin, ClipboardCheck, Plus, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { dayLabels, paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian, getJalaliParts } from '@/lib/jalali';
import { computeGroupSessions, computeGroupTotalSessions, gregorianToMonthKey, currentJalaliMonthKey } from '@/lib/groupSessions';
import { Skeleton } from '@/components/SkeletonPatterns';
import GroupForm from '@/components/GroupForm';
import JalaliDateInput from '@/components/JalaliDateInput';
import PriceInput from '@/components/PriceInput';
import PersonSearch from '@/components/PersonSearch';

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
function monthLabel(key) {
  if (!key) return '';
  const [jy, jm] = key.split('-').map(Number);
  return `${jMonths[jm - 1]} ${toPersianNum(jy)}`;
}

export default function GroupProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [group, setGroup] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [persons, setPersons] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [monthKey, setMonthKey] = useState(currentJalaliMonthKey());
  const [showAddReg, setShowAddReg] = useState(false);
  const [regError, setRegError] = useState('');
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [g, purchs, sess, facs, spcs, ppl, plns] = await Promise.all([
        base44.entities.Group.get(id),
        base44.entities.GroupPurchase.list('-purchase_date', 1000),
        base44.entities.GroupSession.list('-created_date', 1000),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100),
        base44.entities.Person.list('-created_date', 500),
        base44.entities.GroupPlan.list('-created_date', 500)
      ]);
      setGroup(g);
      setPurchases(purchs.filter(p => p.group_id === id));
      setSessions(sess.filter(s => s.group_id === id));
      setFacilitators(facs);
      setSpaces(spcs);
      setPersons(ppl);
      setPlans(plns.filter(p => p.group_id === id));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const allSessions = useMemo(() => group ? computeGroupSessions(group) : [], [group]);
  const totalSessions = allSessions.length;

  const availableMonths = useMemo(() => {
    const set = new Set(allSessions.map(s => gregorianToMonthKey(s.date)));
    set.add(currentJalaliMonthKey());
    return [...set].sort();
  }, [allSessions]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(monthKey)) {
      setMonthKey(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  const monthSessions = useMemo(() => allSessions.filter(s => gregorianToMonthKey(s.date) === monthKey), [allSessions, monthKey]);
  const monthPurchases = purchases.filter(p => p.month === monthKey);

  const buildInitialForm = () => ({
    title: group.title || '',
    description: group.description || '',
    tags: group.tags || '',
    facilitator_ids: group.facilitator_ids || [],
    space: group.space || '',
    schedule: (group.schedule || []).map(s => ({ day: s.day, start_time: s.start_time || '', end_time: s.end_time || '' })),
    start_date: group.start_date || '',
    capacity: group.capacity || '',
    facilitator_percentage: group.facilitator_percentage || ''
  });

  const handleSaveEdit = async (form, submittedPlans) => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null,
        schedule: (form.schedule || []).map(s => ({ day: s.day, start_time: s.start_time, end_time: s.end_time }))
      };
      await base44.entities.Group.update(id, payload);
      if (form.title && form.title !== group.title) {
        await base44.entities.GroupPurchase.updateMany({ group_id: id }, { $set: { group_title: form.title } });
        await base44.entities.GroupSession.updateMany({ group_id: id }, { $set: { group_title: form.title } });
      }
      const keepIds = new Set((submittedPlans || []).filter(p => p.id).map(p => p.id));
      const plansToDelete = plans.filter(p => !keepIds.has(p.id));
      const plansToUpdate = (submittedPlans || []).filter(p => p.id);
      const plansToAdd = (submittedPlans || []).filter(p => !p.id);
      for (const p of plansToDelete) await base44.entities.GroupPlan.delete(p.id);
      if (plansToUpdate.length) await base44.entities.GroupPlan.bulkUpdate(plansToUpdate.map(p => ({ id: p.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));
      if (plansToAdd.length) await base44.entities.GroupPlan.bulkCreate(plansToAdd.map(p => ({ group_id: id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));
      setEditing(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    await base44.entities.GroupPurchase.deleteMany({ group_id: id });
    await base44.entities.GroupSession.deleteMany({ group_id: id });
    await base44.entities.GroupPlan.deleteMany({ group_id: id });
    await base44.entities.Group.delete(id);
    navigate('/groups');
  };

  const endGroup = async () => {
    setEnding(true);
    try {
      await base44.entities.Group.update(id, { is_ended: true, ended_at: todayGregorian() });
      fetchData();
    } finally { setEnding(false); }
  };

  const reactivateGroup = async () => {
    await base44.entities.Group.update(id, { is_ended: false, ended_at: '' });
    fetchData();
  };

  const addRegistration = async () => {
    if (!regForm.plan_id) { setRegError('انتخاب مدل ثبت‌نام الزامی است'); return; }
    setRegError('');
    if (!regForm.person_phone) return;
    const dup = monthPurchases.find(p => p.person_phone === regForm.person_phone);
    if (dup) { alert('این شخص در این ماه قبلاً ثبت‌نام شده است.'); return; }
    setSubmitting(true);
    try {
      await findOrCreatePerson(regForm.person_phone, regForm.person_name);
      const newPurchase = await base44.entities.GroupPurchase.create({
        group_id: id,
        group_title: group.title,
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
      setRegForm({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, donation: '', plan_id: '' });
      setShowAddReg(false);
    } finally { setSubmitting(false); }
  };

  const deleteRegistration = async (purchaseId) => {
    setPurchases(prev => prev.filter(x => x.id !== purchaseId));
    await base44.entities.GroupPurchase.delete(purchaseId);
  };

  const toggleRegPaid = async (p) => {
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !p.is_paid } : x));
    await base44.entities.GroupPurchase.update(p.id, { is_paid: !p.is_paid });
  };

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-32 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
  if (!group) return <div className="p-6 text-center text-muted-foreground">گروهی یافت نشد</div>;

  const personByPhone = {};
  persons.forEach(per => { if (per.phone) personByPhone[per.phone] = per; });
  const totalAmount = purchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const paidAmount = purchases.filter(p => p.is_paid).reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const facNames = (group.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean);
  const dayText = (group.schedule || []).map(s => `${dayLabels[s.day]} ${s.start_time || ''}${s.end_time ? ` تا ${s.end_time}` : ''}`).join('، ');

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به صفحه قبل
      </button>

      {editing ? (
        <GroupForm
          initialForm={buildInitialForm()}
          initialPlans={plans}
          facilitators={facilitators}
          spaces={spaces}
          onSubmit={handleSaveEdit}
          onCancel={() => setEditing(false)}
          submitting={submitting}
          submitLabel="ذخیره تغییرات"
          showDelete={isAdmin}
          onDelete={handleDelete}
        />
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold">{group.title}</h1>
                {group.tags && <p className="text-sm text-muted-foreground mt-1">{group.tags}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {dayText && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {dayText}</span>}
                  {group.space && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {group.space}</span>}
                  {group.start_date && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> شروع: {formatJalaliShort(group.start_date)}</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {toPersianNum(purchases.length)} ثبت‌نام کل</span>
                  <span className="flex items-center gap-1 text-muted-foreground"><Calendar className="w-4 h-4" /> {toPersianNum(totalSessions)} جلسه برگزار شده</span>
                  <span className="font-medium text-[#B74B40]">{formatCurrency(paidAmount)} از {formatCurrency(totalAmount)}</span>
                  {group.is_ended && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">پایان یافته</span>}
                </div>
                {group.description && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{group.description}</p>}
                <div className="flex flex-wrap gap-2 mt-4">
                  {facNames.map(n => (
                    <Link key={n} to={`/facilitators/${facilitators.find(f => f.full_name === n)?.id}`} className="px-3 py-1.5 rounded-lg bg-[#FDF2F1] text-[#B74B40] text-xs font-medium hover:bg-[#FDF2F1]/80">{n}</Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
                {!group.is_ended ? (
                  <button onClick={endGroup} disabled={ending} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 text-sm hover:bg-red-50 disabled:opacity-50">
                    <Ban className="w-3.5 h-3.5" /> پایان گروه
                  </button>
                ) : (
                  <button onClick={reactivateGroup} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-green-200 text-green-600 text-sm hover:bg-green-50">
                    <CheckCircle2 className="w-3.5 h-3.5" /> فعال‌سازی
                  </button>
                )}
                <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5" /> ویرایش
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#B74B40]" /> ثبت‌نامی‌ها ({toPersianNum(monthPurchases.length)})</h3>
                <div className="flex items-center gap-2">
                  <select value={monthKey} onChange={e => setMonthKey(e.target.value)} className="px-2 py-1 rounded-lg border border-input bg-background text-xs">
                    {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
                  </select>
                  <button onClick={() => setShowAddReg(!showAddReg)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-xs font-medium hover:bg-[#A03D34]">
                    <Plus className="w-3.5 h-3.5" /> افزودن
                  </button>
                </div>
              </div>
              {showAddReg && (
                <div className="mb-3 p-3 bg-muted/30 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <PersonSearch personName={regForm.person_name} personPhone={regForm.person_phone} onNameChange={v => setRegForm(prev => ({ ...prev, person_name: v }))} onPhoneChange={v => setRegForm(prev => ({ ...prev, person_phone: v }))} />
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام *</label>
                    <select required value={regForm.plan_id} onChange={e => { setRegError(''); const plan = plans.find(p => p.id === e.target.value); const isFree = plan && (Number(plan.price) === 0 || plan.name === 'رایگان'); setRegForm(prev => ({ ...prev, plan_id: e.target.value, price: plan ? plan.price : '', is_paid: !!isFree, payment_method: isFree ? 'free' : 'cash' })); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="" disabled>انتخاب مدل ثبت‌نام...</option>
                      {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
                    </select>
                  </div>
                  <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
                  <PriceInput value={regForm.donation} onChange={v => setRegForm({ ...regForm, donation: v })} placeholder="دونیشین (اختیاری)" />
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
                  {regError && (
                    <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{regError}</div>
                  )}
                  <div className="sm:col-span-2 flex gap-2">
                    <button onClick={addRegistration} disabled={submitting} className="px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">{submitting ? 'در حال ثبت...' : 'ثبت'}</button>
                    <button onClick={() => setShowAddReg(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">انصراف</button>
                  </div>
                </div>
              )}
              {monthPurchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">در این ماه ثبت‌نامی وجود ندارد</p>
              ) : (
                <div className="divide-y divide-border">
                  {monthPurchases.map(p => (
                    <div key={p.id} onClick={() => navigate(`/accounting/group/${p.id}`, { state: { from: `/groups/${id}` } })} className="py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/30 rounded-lg">
                      <div>
                        {personByPhone[p.person_phone]
                          ? <Link to={`/people/${personByPhone[p.person_phone].id}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
                          : <span className="font-medium">{p.person_name || '-'}</span>}
                        {p.plan_name && <span className="inline-block text-xs text-[#8CB9C0] mr-2">{p.plan_name}</span>}
                        {p.donation > 0 && <span className="text-xs text-[#8CB9C0] mr-2">دونیشین {formatCurrency(p.donation)}</span>}
                        <span className="text-xs text-muted-foreground mr-2">{formatJalaliShort(p.purchase_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{formatCurrency((p.price || 0) * (p.quantity || 1) + (p.donation || 0))}</span>
                        <button onClick={(e) => { e.stopPropagation(); toggleRegPaid(p); }} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                        <button onClick={(e) => { e.stopPropagation(); deleteRegistration(p.id); }} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#B74B40]" /> جلسات {monthLabel(monthKey)} ({toPersianNum(monthSessions.length)})</h3>
              </div>
              {monthSessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">در این ماه جلسه‌ای برگزار نشده است</p>
              ) : (
                <div className="divide-y divide-border">
                  {monthSessions.map(s => {
                    const sess = sessions.find(x => x.session_date === s.date);
                    const presentCount = sess ? (sess.present_phones || []).length : 0;
                    return (
                      <div key={s.date} className="py-2.5 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full border-2 border-[#B74B40] text-[#B74B40] flex items-center justify-center text-xs font-bold">{toPersianNum(s.session_number)}</span>
                          <span className="text-muted-foreground">{formatJalaliShort(s.date)}</span>
                          <span className="text-xs text-muted-foreground">{dayLabels[s.day]}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{toPersianNum(presentCount)} حاضر</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <Link to={`/groups/attendance/${group.id}`} className="block text-center text-sm text-[#B74B40] hover:underline mt-3">مدیریت حضور و غیاب</Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Pencil, Check, X, Users, Calendar, Clock, MapPin, GraduationCap, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency, computeWorkshopRevenue, findOrCreatePerson } from '@/lib/stats';
import { dayLabels, paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian, formatJalali, toJalaliStr } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import WorkshopCalendarPicker, { computeWorkshopFieldsFromDates } from '@/components/WorkshopCalendarPicker';
import PersonSearch from '@/components/PersonSearch';
import { Skeleton } from '@/components/SkeletonPatterns';

export default function WorkshopProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [persons, setPersons] = useState([]);
  const [dupWarning, setDupWarning] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({});
  const [showAddReg, setShowAddReg] = useState(false);
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, registered_sessions: '', donation: '', plan_id: '' });
  const [editingRegId, setEditingRegId] = useState(null);
  const [capacityWarning, setCapacityWarning] = useState('');
  const [plans, setPlans] = useState([]);
  const [planForm, setPlanForm] = useState({ name: '', price: '' });
  const [regSessionTab, setRegSessionTab] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess, facs, spcs, ppl, planList] = await Promise.all([
        base44.entities.Workshop.get(id),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopSession.list('-session_number', 500),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100),
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkshopPlan.list('-created_date', 500)
      ]);
      setWorkshop(w);
      setPurchases(purchs.filter(p => p.workshop_id === id));
      setSessions(sess.filter(s => s.workshop_id === id).sort((a, b) => (a.session_number || 0) - (b.session_number || 0)));
      setFacilitators(facs);
      setSpaces(spcs);
      setPersons(ppl);
      setPlans(planList.filter(p => p.workshop_id === id));
      // Set default reg session tab: latest session whose date has arrived
      const wsSess = sess.filter(s => s.workshop_id === id).sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
      const today = todayGregorian();
      const pastSessions = wsSess.filter(s => s.session_date && s.session_date <= today);
      if (pastSessions.length > 0) {
        const latest = pastSessions.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))[0];
        setRegSessionTab(latest.id);
      } else if (wsSess.length > 0) {
        setRegSessionTab(wsSess[wsSess.length - 1].id);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    const sessionDates = workshop.session_dates || [];
    const computed = computeWorkshopFieldsFromDates(sessionDates);
    setForm({
      title: workshop.title || '', price: workshop.price || '',
      is_permanent: workshop.is_permanent || false, description: workshop.description || '',
      tags: workshop.tags || '', facilitator_ids: workshop.facilitator_ids || [],
      space: workshop.space || '', start_time: workshop.start_time || '', end_time: workshop.end_time || '',
      facilitator_percentage: workshop.facilitator_percentage || '',
      capacity: workshop.capacity || '',
      session_dates: sessionDates,
      session_count: computed.session_count || workshop.session_count || '',
      start_date: computed.start_date || workshop.start_date || '',
      end_date: computed.end_date || workshop.end_date || '',
      day_of_week: computed.day_of_week || workshop.day_of_week || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      const computed = computeWorkshopFieldsFromDates(form.session_dates || []);
      const payload = {
        ...form,
        ...computed,
        price: Number(form.price) || 0,
        session_count: form.is_permanent ? null : (Number(computed.session_count) || null),
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null
      };
      await base44.entities.Workshop.update(id, payload);

      // Sync WorkshopSession records with new session_dates
      const newDates = computed.session_dates;
      const existingByDate = {};
      sessions.forEach(s => { if (s.session_date) existingByDate[s.session_date] = s; });
      const toCreate = [];
      const toUpdate = [];
      const toDelete = [];
      const newDateSet = new Set(newDates);
      newDates.forEach((date, i) => {
        const existing = existingByDate[date];
        if (existing) {
          if (existing.session_number !== i + 1) {
            toUpdate.push({ id: existing.id, session_number: i + 1 });
          }
        } else {
          toCreate.push({
            workshop_id: id,
            workshop_title: form.title,
            session_number: i + 1,
            session_date: date,
            present_phones: []
          });
        }
      });
      sessions.forEach(s => {
        if (!newDateSet.has(s.session_date) && (s.present_phones || []).length === 0) {
          toDelete.push(s.id);
        }
      });
      if (toCreate.length > 0) await base44.entities.WorkshopSession.bulkCreate(toCreate);
      if (toUpdate.length > 0) await base44.entities.WorkshopSession.bulkUpdate(toUpdate);
      if (toDelete.length > 0) await Promise.all(toDelete.map(sid => base44.entities.WorkshopSession.delete(sid)));

      if (form.title && form.title !== workshop.title) {
        await base44.entities.WorkshopPurchase.updateMany({ workshop_id: id }, { $set: { workshop_title: form.title } });
        await base44.entities.WorkshopSession.updateMany({ workshop_id: id }, { $set: { workshop_title: form.title } });
      }
      setEditing(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    await base44.entities.Workshop.delete(id);
    navigate('/workshops');
  };

  const toggleWorkshopActive = async () => {
    await base44.entities.Workshop.update(id, { is_ended: !workshop.is_ended });
    fetchData();
  };

  const toggleFacilitator = (fid) => {
    setForm(prev => ({
      ...prev, facilitator_ids: prev.facilitator_ids.includes(fid)
        ? prev.facilitator_ids.filter(x => x !== fid)
        : [...prev.facilitator_ids, fid]
    }));
  };

  const addRegistration = async () => {
    if (!regForm.person_phone) return;
    const dup = purchases.find(p => p.person_phone === regForm.person_phone);
    if (dup) {
      setDupWarning('این شخص قبلاً در این کارگاه ثبت‌نام شده است.');
      return;
    }
    setDupWarning('');
    const newCount = rev.participantCount + (Number(regForm.quantity) || 1);
    if (workshop.capacity && newCount > workshop.capacity) {
      setCapacityWarning(`ظرفیت کارگاه ${toPersianNum(workshop.capacity)} نفر است. با این ثبت‌نام تعداد به ${toPersianNum(newCount)} نفر می‌رسد. آیا مطمئن هستید؟`);
      return;
    }
    setCapacityWarning('');
    await doAddRegistration();
  };

  const doAddRegistration = async () => {
    setSubmitting(true);
    try {
      await findOrCreatePerson(regForm.person_phone, regForm.person_name);
      const newPurchase = await base44.entities.WorkshopPurchase.create({
        workshop_id: id,
        workshop_title: workshop.title,
        person_name: regForm.person_name,
        person_phone: regForm.person_phone,
        price: Number(regForm.price) || workshop.price || 0,
        quantity: Number(regForm.quantity) || 1,
        purchase_date: regForm.purchase_date,
        payment_method: regForm.payment_method,
        how_met: regForm.how_met || 'other',
        is_paid: regForm.is_paid,
        registered_sessions: regForm.registered_sessions ? Number(regForm.registered_sessions) : null,
        donation: Number(regForm.donation) || 0,
        plan_name: plans.find(p => p.id === regForm.plan_id)?.name || ''
      });
      setPurchases(prev => [newPurchase, ...prev]);
      setRegForm({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, registered_sessions: '', donation: '', plan_id: '' });
      setCapacityWarning('');
      setShowAddReg(false);
    } finally { setSubmitting(false); }
  };

  const deleteRegistration = async (purchaseId) => {
    setPurchases(prev => prev.filter(x => x.id !== purchaseId));
    await base44.entities.WorkshopPurchase.delete(purchaseId);
  };

  const toggleRegPaid = async (p) => {
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !p.is_paid } : x));
    await base44.entities.WorkshopPurchase.update(p.id, { is_paid: !p.is_paid });
  };

  const addPlan = async () => {
    if (!planForm.name || planForm.price === '' || planForm.price === null) return;
    await base44.entities.WorkshopPlan.create({ workshop_id: id, name: planForm.name, price: Number(planForm.price) || 0, is_active: true });
    setPlanForm({ name: '', price: '' });
    fetchData();
  };

  const togglePlanActive = async (plan) => {
    await base44.entities.WorkshopPlan.update(plan.id, { is_active: !plan.is_active });
    fetchData();
  };

  const deletePlan = async (planId) => {
    await base44.entities.WorkshopPlan.delete(planId);
    fetchData();
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
  if (!workshop) return <div className="p-6 text-center text-muted-foreground">کارگاهی یافت نشد</div>;

  const personByPhone = {};
  persons.forEach(per => { if (per.phone) personByPhone[per.phone] = per; });
  const rev = computeWorkshopRevenue(workshop, purchases);
  const facNames = (workshop.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean);

  const isNewWorkshop = workshop.session_dates && workshop.session_dates.length > 0;
  const getSessionParticipants = (session) => {
    if (isNewWorkshop) {
      return purchases.filter(p => {
        if (p.registration_type === 'full') return true;
        if (p.registration_type === 'single' && p.selected_sessions) {
          return p.selected_sessions.includes(session.session_number);
        }
        return true;
      });
    }
    return purchases;
  };
  const activeRegSession = sessions.find(s => s.id === regSessionTab);
  const activeRegParticipants = activeRegSession ? getSessionParticipants(activeRegSession) : purchases;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => { if (window.history.length > 1) navigate(-1); else navigate('/workshops'); }} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      {editing ? (
        <div className="bg-white rounded-xl border border-border p-5 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">اسم کارگاه</label>
              <input type="text" placeholder="اسم کارگاه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
              <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">درصد تسهیلگر</label>
              <PersianNumberInput value={form.facilitator_percentage} onChange={v => setForm({ ...form, facilitator_percentage: v })} placeholder="درصد" className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-20 text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تگ کارگاه (موضوعات)</label>
              <input type="text" placeholder="موضوعات" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-32" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
              <PersianNumberInput value={form.capacity} onChange={v => setForm({ ...form, capacity: v })} placeholder="ظرفیت" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24 text-right" />
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ساعت شروع</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ساعت پایان</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">فضای برگزاری</label>
              <select value={form.space} onChange={e => setForm({ ...form, space: e.target.value })} className="px-4 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
                <option value="">انتخاب فضا...</option>
                {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="relative">
            <WorkshopCalendarPicker
              selectedDates={form.session_dates || []}
              onChange={(dates) => {
                const computed = computeWorkshopFieldsFromDates(dates);
                setForm(prev => ({ ...prev, ...computed }));
              }}
            />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تعداد جلسه (خودکار)</label>
              <input type="text" value={form.session_count ? toPersianNum(form.session_count) : ''} readOnly placeholder="—" className="px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm w-28 text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع (خودکار)</label>
              <input type="text" value={form.start_date ? toJalaliStr(form.start_date) : ''} readOnly placeholder="—" className="px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm w-32 text-center" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ پایان (خودکار)</label>
              <input type="text" value={form.end_date ? toJalaliStr(form.end_date) : ''} readOnly placeholder="—" className="px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm w-32 text-center" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">روز کارگاه (خودکار)</label>
              <input type="text" value={form.day_of_week || ''} readOnly placeholder="—" className="px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm min-w-[140px]" />
            </div>
          </div>
          <textarea placeholder="توضیحات کارگاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div>
            <label className="text-xs text-muted-foreground block mb-2">تسهیلگران:</label>
            <FacilitatorMultiSearch selectedIds={form.facilitator_ids} onChange={ids => setForm({ ...form, facilitator_ids: ids })} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_permanent} onChange={e => setForm({ ...form, is_permanent: e.target.checked })} className="w-4 h-4" />
            کارگاه دائمی
          </label>
          <div className="flex justify-between gap-2">
            <button onClick={handleDelete} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> حذف کارگاه
            </button>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                <Check className="w-4 h-4" /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
                <X className="w-4 h-4" /> انصراف
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold">{workshop.title}</h1>
                {workshop.tags && <p className="text-sm text-muted-foreground mt-1">{workshop.tags}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {workshop.day_of_week && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {dayLabels[workshop.day_of_week]}</span>}
                  {(workshop.start_time || workshop.end_time) && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {workshop.start_time}{workshop.end_time ? ` - ${workshop.end_time}` : ''}</span>}
                  {workshop.space && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {workshop.space}</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {toPersianNum(rev.purchaseCount)} ثبت‌نام{workshop.capacity ? ` از ${toPersianNum(workshop.capacity)}` : ''}</span>
                  <span className="font-medium text-[#B74B40]">{formatCurrency(workshop.price)}</span>
                  {workshop.is_permanent && <span className="px-2 py-0.5 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs">دائمی</span>}
                  {workshop.is_ended && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">پایان یافته</span>}
                </div>
                {workshop.description && <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{workshop.description}</p>}
                <div className="flex flex-wrap gap-2 mt-4">
                  {facNames.map(n => (
                    <Link key={n} to={`/facilitators/${facilitators.find(f => f.full_name === n)?.id}`} className="px-3 py-1.5 rounded-lg bg-[#FDF2F1] text-[#B74B40] text-xs font-medium hover:bg-[#FDF2F1]/80">
                      {n}
                    </Link>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={toggleWorkshopActive} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border text-sm ${workshop.is_ended ? 'border-green-200 text-green-600 hover:bg-green-50' : 'border-amber-200 text-[#B9834B] hover:bg-[#FBF3EC]'}`}>
                  {workshop.is_ended ? 'فعال‌سازی' : 'غیرفعال‌سازی'}
                </button>
                <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex-shrink-0">
                  <Pencil className="w-3.5 h-3.5" /> ویرایش
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#B74B40]" /> ثبت‌نامی‌ها ({toPersianNum(purchases.length)})</h3>
                <button onClick={() => setShowAddReg(!showAddReg)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-xs font-medium hover:bg-[#A03D34]">
                  <Plus className="w-3.5 h-3.5" /> افزودن
                </button>
              </div>
              {showAddReg && (
                <div className="mb-3 p-3 bg-muted/30 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <PersonSearch personName={regForm.person_name} personPhone={regForm.person_phone} onNameChange={v => setRegForm({ ...regForm, person_name: v })} onPhoneChange={v => setRegForm({ ...regForm, person_phone: v })} />
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام</label>
                    <select value={regForm.plan_id} onChange={(e) => { const plan = plans.find(p => p.id === e.target.value); setRegForm({ ...regForm, plan_id: e.target.value, price: plan ? plan.price : (workshop.price || '') }); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      <option value="">دستی (بدون پلن)</option>
                      {plans.filter(p => p.is_active).map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
                    </select>
                  </div>
                  <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
                  <PriceInput value={regForm.donation} onChange={v => setRegForm({ ...regForm, donation: v })} placeholder="دونیشین (اختیاری)" />
                  <input type="number" placeholder="تعداد" value={regForm.quantity} onChange={e => setRegForm({ ...regForm, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <JalaliDateInput value={regForm.purchase_date} onChange={v => setRegForm({ ...regForm, purchase_date: v })} />
                  <input type="number" placeholder="تعداد جلسه (اختیاری)" value={regForm.registered_sessions} onChange={e => setRegForm({ ...regForm, registered_sessions: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
                    <input type="checkbox" checked={regForm.is_paid} onChange={e => setRegForm({ ...regForm, is_paid: e.target.checked })} className="w-4 h-4" /> رایگان
                  </label>
                  {dupWarning && (
                    <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      {dupWarning}
                    </div>
                  )}
                  {capacityWarning && (
                    <div className="sm:col-span-2 p-3 bg-[#FBF3EC] border border-[#E8D5C0] rounded-lg text-xs text-[#B9834B] flex items-center justify-between gap-2">
                      <span className="flex-1">{capacityWarning}</span>
                      <button onClick={doAddRegistration} disabled={submitting} className="px-3 py-1 rounded-lg bg-[#B9834B] text-white text-xs font-medium hover:bg-[#A5723E] disabled:opacity-50 whitespace-nowrap">
                        ثبت در هر صورت
                      </button>
                      <button onClick={() => setCapacityWarning('')} className="px-2 py-1 rounded-lg border border-border text-xs whitespace-nowrap">انصراف</button>
                    </div>
                  )}
                  <div className="sm:col-span-2 flex gap-2">
                    <button onClick={addRegistration} disabled={submitting} className="px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                      {submitting ? 'در حال ثبت...' : 'ثبت'}
                    </button>
                    <button onClick={() => setShowAddReg(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">انصراف</button>
                  </div>
                </div>
              )}
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">هنوز ثبت‌نامی وجود ندارد</p>
              ) : sessions.length > 0 ? (
                <div>
                  {/* Session tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3 border-b border-border pb-2">
                    {sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setRegSessionTab(s.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          regSessionTab === s.id
                            ? 'bg-[#B74B40] text-white'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        جلسه {toPersianNum(s.session_number)}
                      </button>
                    ))}
                  </div>
                  {/* Session info */}
                  {activeRegSession && (
                    <div className="mb-2 text-xs text-muted-foreground">
                      {formatJalali(activeRegSession.session_date)} • {toPersianNum(activeRegParticipants.length)} نفر
                    </div>
                  )}
                  {/* Participant list for active session */}
                  {activeRegParticipants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">در این جلسه ثبت‌نامی وجود ندارد</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeRegParticipants.map(p => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                          <div>
                            {personByPhone[p.person_phone]
                              ? <Link to={`/people/${personByPhone[p.person_phone].id}`} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
                              : <span className="font-medium">{p.person_name || '-'}</span>}
                            {p.plan_name && <span className="text-xs text-[#8CB9C0] mr-2">{p.plan_name}</span>}
                            {p.registered_sessions && <span className="text-xs text-[#B9834B] mr-2">{toPersianNum(p.registered_sessions)} جلسه</span>}
                            {p.donation > 0 && <span className="text-xs text-[#8CB9C0] mr-2">دونیشین {formatCurrency(p.donation)}</span>}
                            <span className="text-xs text-muted-foreground mr-2">{formatJalaliShort(p.purchase_date)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{paymentMethodLabels[p.payment_method] || p.payment_method}</span>
                            <button onClick={() => toggleRegPaid(p)} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                            <button onClick={() => deleteRegistration(p.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {purchases.map(p => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        {personByPhone[p.person_phone]
                          ? <Link to={`/people/${personByPhone[p.person_phone].id}`} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
                          : <span className="font-medium">{p.person_name || '-'}</span>}
                        {p.plan_name && <span className="text-xs text-[#8CB9C0] mr-2">{p.plan_name}</span>}
                        {p.registered_sessions && <span className="text-xs text-[#B9834B] mr-2">{toPersianNum(p.registered_sessions)} جلسه</span>}
                        {p.donation > 0 && <span className="text-xs text-[#8CB9C0] mr-2">دونیشین {formatCurrency(p.donation)}</span>}
                        <span className="text-xs text-muted-foreground mr-2">{formatJalaliShort(p.purchase_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{paymentMethodLabels[p.payment_method] || p.payment_method}</span>
                        <button onClick={() => toggleRegPaid(p)} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                        <button onClick={() => deleteRegistration(p.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-[#B74B40]" /> جلسات ({toPersianNum(sessions.length)})</h3>
              </div>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">هنوز جلسه‌ای ثبت نشده است</p>
              ) : (
                <div className="divide-y divide-border">
                  {sessions.map(s => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#B74B40] text-white flex items-center justify-center text-xs font-bold">{toPersianNum(s.session_number)}</span>
                        <span className="text-muted-foreground">{formatJalaliShort(s.session_date)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{toPersianNum((s.present_phones || []).length)} حاضر</span>
                    </div>
                  ))}
                </div>
              )}
              <Link to={`/attendance/${workshop.id}`} className="block text-center text-sm text-[#B74B40] hover:underline mt-3">
                مدیریت حضور و غیاب
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-3">مدل‌های ثبت‌نام ({toPersianNum(plans.length)})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <input type="text" placeholder="نام مدل (مثلاً تک جلسه)" value={planForm.name} onChange={e => setPlanForm({ ...planForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <PriceInput value={planForm.price} onChange={v => setPlanForm({ ...planForm, price: v })} />
              <button onClick={addPlan} className="flex items-center justify-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
                <Plus className="w-4 h-4" /> افزودن مدل
              </button>
            </div>
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">هنوز مدل ثبت‌نامی تعریف نشده است</p>
            ) : (
              <div className="divide-y divide-border">
                {plans.map(pl => (
                  <div key={pl.id} className="py-2.5 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{pl.name}</span>
                      <span className="text-muted-foreground">{formatCurrency(pl.price)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => togglePlanActive(pl)} className={`text-xs px-2 py-1 rounded-full ${pl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pl.is_active ? 'فعال' : 'غیرفعال'}</button>
                      <button onClick={() => deletePlan(pl.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
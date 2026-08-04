import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowRight, Pencil, Users, Calendar, Clock, MapPin, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency, computeWorkshopRevenue, findOrCreatePerson } from '@/lib/stats';
import { dayLabels, paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian, formatJalali } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PriceInput from '@/components/PriceInput';
import PersonSearch from '@/components/PersonSearch';
import { Skeleton } from '@/components/SkeletonPatterns';
import WorkshopForm from '@/components/WorkshopForm';

export default function WorkshopProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
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
  const [showAddReg, setShowAddReg] = useState(false);
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, registered_sessions: '', donation: '', plan_id: '' });
  const [capacityWarning, setCapacityWarning] = useState('');
  const [plans, setPlans] = useState([]);
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
    setEditing(true);
  };

  const buildInitialForm = () => {
    const existingDates = (workshop.session_dates && workshop.session_dates.length > 0)
      ? [...workshop.session_dates].sort()
      : [...sessions].sort((a, b) => (a.session_date || '').localeCompare(b.session_date || '')).map(s => s.session_date);
    return {
      title: workshop.title || '',
      price: workshop.price || '',
      session_count: existingDates.length || workshop.session_count || '',
      is_permanent: workshop.is_permanent || false,
      description: workshop.description || '',
      tags: workshop.tags || '',
      facilitator_ids: workshop.facilitator_ids || [],
      space: workshop.space || '',
      start_time: workshop.start_time || '',
      end_time: workshop.end_time || '',
      day_of_week: workshop.day_of_week || '',
      start_date: existingDates[0] || workshop.start_date || '',
      end_date: existingDates[existingDates.length - 1] || workshop.end_date || '',
      facilitator_percentage: workshop.facilitator_percentage || '',
      capacity: workshop.capacity || '',
      session_dates: existingDates
    };
  };

  // Build attendance map: date → present count
  const attendanceByDate = {};
  sessions.forEach(s => {
    if (s.session_date && (s.present_phones || []).length > 0) {
      attendanceByDate[s.session_date] = (s.present_phones || []).length;
    }
  });

  const handleSaveEdit = async (form, submittedPlans) => {
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null,
        session_count: Number(form.session_count) || 0
      };
      await base44.entities.Workshop.update(id, payload);

      // Sync WorkshopSession records with new session_dates
      const newDates = form.session_dates || [];
      const newDateSet = new Set(newDates);
      const existingByDate = {};
      sessions.forEach(s => { if (s.session_date) existingByDate[s.session_date] = s; });

      const toDelete = sessions.filter(s => !newDateSet.has(s.session_date));
      const toAdd = newDates.filter(d => !existingByDate[d]);

      // Delete removed sessions
      if (toDelete.length > 0) {
        for (const s of toDelete) {
          await base44.entities.WorkshopSession.delete(s.id);
        }
      }
      // Add new sessions
      if (toAdd.length > 0) {
        await base44.entities.WorkshopSession.bulkCreate(
          toAdd.map(date => ({
            workshop_id: id,
            workshop_title: form.title || workshop.title,
            session_number: 0, // will re-number below
            session_date: date,
            present_phones: []
          }))
        );
      }

      // Re-number all sessions sequentially by date order
      const updatedSessions = await base44.entities.WorkshopSession.list('-session_date', 500);
      const wsSessions = updatedSessions.filter(s => s.workshop_id === id)
        .sort((a, b) => (a.session_date || '').localeCompare(b.session_date || ''));
      if (wsSessions.length > 0) {
        await base44.entities.WorkshopSession.bulkUpdate(
          wsSessions.map((s, i) => ({ id: s.id, session_number: i + 1 }))
        );
      }

      // Update workshop_title on purchases/sessions if title changed
      if (form.title && form.title !== workshop.title) {
        await base44.entities.WorkshopPurchase.updateMany({ workshop_id: id }, { $set: { workshop_title: form.title } });
        await base44.entities.WorkshopSession.updateMany({ workshop_id: id }, { $set: { workshop_title: form.title } });
      }

      // Sync plans
      const keepIds = new Set((submittedPlans || []).filter(p => p.id).map(p => p.id));
      const plansToDelete = plans.filter(p => !keepIds.has(p.id));
      const plansToUpdate = (submittedPlans || []).filter(p => p.id);
      const plansToAdd = (submittedPlans || []).filter(p => !p.id);
      for (const p of plansToDelete) await base44.entities.WorkshopPlan.delete(p.id);
      if (plansToUpdate.length) await base44.entities.WorkshopPlan.bulkUpdate(plansToUpdate.map(p => ({ id: p.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));
      if (plansToAdd.length) await base44.entities.WorkshopPlan.bulkCreate(plansToAdd.map(p => ({ workshop_id: id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));

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
  const totalAmount = purchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const paidAmount = purchases.filter(p => p.is_paid).reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
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
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به صفحه قبل
      </button>

      {editing ? (
        <WorkshopForm
          initialForm={buildInitialForm()}
          initialPlans={plans}
          facilitators={facilitators}
          spaces={spaces}
          isAdmin={isAdmin}
          attendanceByDate={attendanceByDate}
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
                <h1 className="text-xl font-bold">{workshop.title}</h1>
                {workshop.tags && <p className="text-sm text-muted-foreground mt-1">{workshop.tags}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {workshop.day_of_week && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {dayLabels[workshop.day_of_week] || workshop.day_of_week}</span>}
                  {(workshop.start_time || workshop.end_time) && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {workshop.start_time}{workshop.end_time ? ` - ${workshop.end_time}` : ''}</span>}
                  {workshop.space && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {workshop.space}</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {toPersianNum(rev.purchaseCount)} ثبت‌نام{workshop.capacity ? ` از ${toPersianNum(workshop.capacity)}` : ''}</span>
                  <span className="font-medium text-[#B74B40]">{formatCurrency(paidAmount)} / {formatCurrency(totalAmount)}</span>
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
                <p className="text-sm text-muted-foreground text-center py-4">هنوز جلسه‌ای ثبت نشده است. با کلیک روی «ویرایش» و سپس «تقویم کارگاه» جلسات را اضافه کنید.</p>
              ) : (
                <div className="divide-y divide-border">
                  {sessions.map(s => (
                    <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full border-2 border-[#B74B40] text-[#B74B40] flex items-center justify-center text-xs font-bold">{toPersianNum(s.session_number)}</span>
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

        </>
      )}
    </div>
  );
}
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
import PlanOverflowDialog from '@/components/PlanOverflowDialog';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { workshopTimeLabel } from '@/lib/workshopSchedule';
import { getPlanBounds, isFreePlan, isAmountPaid, formatPlanRange } from '@/lib/planPricing';
import SessionPicker from '@/components/workshops/SessionPicker';
import { heldSessions, planLimit, firstRegistrationIds } from '@/lib/registrationSessions';
import InstallmentFields, { lastSessionDate } from '@/components/workshops/InstallmentFields';
import InstallmentChips, { InstallmentPayForm } from '@/components/workshops/InstallmentChips';
import { blankInstallmentForm, isInstallment, installmentError, buildInstallments, paidCount, paidTotal, purchaseStatus, purchasePaidAmount } from '@/lib/installments';

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
  const [regError, setRegError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAddReg, setShowAddReg] = useState(false);
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', registered_sessions: '', donation: '', plan_id: '', registration_type: 'full', selected_sessions: [] });
  const [overflow, setOverflow] = useState(null);
  const [pendingReg, setPendingReg] = useState(null);
  const [capacityWarning, setCapacityWarning] = useState('');
  const [plans, setPlans] = useState([]);
  const [regSessionTab, setRegSessionTab] = useState(null);
  const [deleteRegId, setDeleteRegId] = useState(null);
  const [saveError, setSaveError] = useState('');
  const [inst, setInst] = useState(blankInstallmentForm);
  const [openInst, setOpenInst] = useState(null); // { id, index } — registration whose instalments are open

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess, facs, spcs, ppl, planList] = await Promise.all([
        base44.entities.Workshop.get(id),
        base44.entities.WorkshopPurchase.filter({ workshop_id: id }),
        base44.entities.WorkshopSession.filter({ workshop_id: id }),
        base44.entities.Facilitator.list('-created_date'),
        base44.entities.Space.list('-created_date'),
        base44.entities.Person.list('-created_date'),
        base44.entities.WorkshopPlan.filter({ workshop_id: id })
      ]);
      setWorkshop(w);
      setPurchases(purchs);
      setSessions([...sess].sort((a, b) => (a.session_number || 0) - (b.session_number || 0)));
      setFacilitators(facs);
      setSpaces(spcs);
      setPersons(ppl);
      setPlans(planList);
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
      session_dates: existingDates,
      allow_installments: workshop.allow_installments || false,
      schedule: workshop.schedule || []
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
    setSaveError('');
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
      const updatedSessions = await base44.entities.WorkshopSession.list('-session_date');
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
      if (plansToUpdate.length) await base44.entities.WorkshopPlan.bulkUpdate(plansToUpdate.map(p => ({ id: p.id, name: p.name, price_min: Number(p.price_min) || 0, price_max: Number(p.price_max) || 0, session_count: Number(p.session_count) || null, is_active: p.is_active !== false })));
      if (plansToAdd.length) await base44.entities.WorkshopPlan.bulkCreate(plansToAdd.map(p => ({ workshop_id: id, name: p.name, price_min: Number(p.price_min) || 0, price_max: Number(p.price_max) || 0, session_count: Number(p.session_count) || null, is_active: p.is_active !== false })));

      setEditing(false);
      fetchData();
    } catch (err) {
      setSaveError(err.message || 'ذخیره تغییرات ناموفق بود');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    // Cascade delete related records to avoid orphan data
    await base44.entities.WorkshopPurchase.deleteMany({ workshop_id: id });
    await base44.entities.WorkshopSession.deleteMany({ workshop_id: id });
    await base44.entities.WorkshopPlan.deleteMany({ workshop_id: id });
    await base44.entities.Workshop.delete(id);
    navigate('/workshops');
  };

  const toggleWorkshopActive = async () => {
    await base44.entities.Workshop.update(id, { is_ended: !workshop.is_ended, ended_at: workshop.is_ended ? '' : new Date().toISOString() });
    fetchData();
  };

  const addRegistration = async () => {
    if (!regForm.plan_id) { setRegError('انتخاب مدل ثبت‌نام الزامی است'); return; }
    setRegError('');
    if (!regForm.person_phone) return;
    // A repeat registration needs a session the person doesn't hold yet
    if (priorRegs.length > 0 && held.size >= wsSessionCount) {
      setDupWarning(wsSessionCount > 0 ? 'این شخص برای همهٔ جلسات این کارگاه ثبت‌نام کرده است.' : 'این شخص قبلاً در این کارگاه ثبت‌نام شده است.');
      return;
    }
    setDupWarning('');
    if (wsSessionCount > 0 && pickedSessions.length === 0) {
      setRegError('انتخاب حداقل یک جلسه الزامی است');
      return;
    }
    const plan = plans.find(p => p.id === regForm.plan_id);
    const { min, max } = getPlanBounds(plan);
    const amount = Number(regForm.price) || 0;
    const donation = Number(regForm.donation) || 0;
    if (inst.on) {
      const instError = amount > max
        ? 'در پرداخت قسطی، مبلغ نمی‌تواند بیشتر از سقف مدل ثبت‌نام باشد'
        : installmentError(inst.rows, amount, lastSessionDate(workshop));
      if (instError) { setRegError(instError); return; }
    }
    if (amount > max) { setOverflow({ amount, max, donation }); return; }
    const pending = { amount, donation, isPaid: amount >= min };
    const newCount = peopleCount + (priorRegs.length > 0 ? 0 : Number(regForm.quantity) || 1);
    if (workshop.capacity && newCount > workshop.capacity) {
      setPendingReg(pending);
      setCapacityWarning(`ظرفیت کارگاه ${toPersianNum(workshop.capacity)} نفر است. با این ثبت‌نام تعداد به ${toPersianNum(newCount)} نفر می‌رسد. آیا مطمئن هستید؟`);
      return;
    }
    setCapacityWarning('');
    await doAddRegistration(pending);
  };

  const acceptOverflow = () => {
    const { amount, max, donation } = overflow;
    setOverflow(null);
    setRegForm(prev => ({ ...prev, price: max, donation: donation + (amount - max) }));
    setTimeout(() => addRegistration(), 50);
  };

  const doAddRegistration = async (pending) => {
    setSubmitting(true);
    try {
      await findOrCreatePerson(regForm.person_phone, regForm.person_name);
      const installments = inst.on ? buildInstallments(inst, regForm.purchase_date, regForm.payment_method) : null;
      const newPurchase = await base44.entities.WorkshopPurchase.create({
        workshop_id: id,
        workshop_title: workshop.title,
        person_name: regForm.person_name,
        person_phone: regForm.person_phone,
        price: pending.amount,
        quantity: Number(regForm.quantity) || 1,
        purchase_date: regForm.purchase_date,
        payment_method: isFreePlan(plans.find(p => p.id === regForm.plan_id)) ? 'free' : regForm.payment_method,
        how_met: regForm.how_met || 'other',
        is_paid: installments ? installments.every(i => i.paid_date) : pending.isPaid,
        ...(installments ? { is_installment: true, installments } : {}),
        registered_sessions: pickedSessions.length || null,
        donation: pending.donation,
        plan_name: plans.find(p => p.id === regForm.plan_id)?.name || '',
        registration_type: wsSessionCount > 0 && pickedSessions.length < wsSessionCount ? 'single' : 'full',
        selected_sessions: pickedSessions
      });
      setPurchases(prev => [newPurchase, ...prev]);
      if (installments) window.dispatchEvent(new Event('installments-changed'));
      setInst(blankInstallmentForm);
      setRegForm({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', registered_sessions: '', donation: '', plan_id: '', registration_type: 'full', selected_sessions: [] });
      setCapacityWarning('');
      setPendingReg(null);
      setShowAddReg(false);
    } finally { setSubmitting(false); }
  };

  const deleteRegistration = async (purchaseId) => {
    setPurchases(prev => prev.filter(x => x.id !== purchaseId));
    await base44.entities.WorkshopPurchase.delete(purchaseId);
  };

  const confirmDeleteReg = async () => {
    if (!deleteRegId) return;
    await deleteRegistration(deleteRegId);
    setDeleteRegId(null);
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
  const paidAmount = purchases.reduce((s, p) => s + purchasePaidAmount(p), 0);
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
  const selectedRegPlan = plans.find(p => p.id === regForm.plan_id);
  // Repeat registrations: the same person again, only for sessions they don't hold yet
  const wsSessionCount = workshop.session_dates?.length || workshop.session_count || 0;
  const priorRegs = purchases.filter(p => regForm.person_phone && p.person_phone === regForm.person_phone);
  const held = heldSessions(purchases, regForm.person_phone, wsSessionCount);
  const pickedSessions = regForm.selected_sessions.filter(s => !held.has(s));
  const firstRegIds = firstRegistrationIds(purchases);
  // A person registered more than once still takes one seat
  const peopleCount = rev.participantCount - (purchases.length - firstRegIds.size);
  const computedPaid = selectedRegPlan ? isAmountPaid(regForm.price, selectedRegPlan) : false;

  // One registration row of the ثبت‌نامی‌ها box (shared by the per-session and
  // the plain list). Instalment registrations get a «قسطی» pill instead of the
  // paid/unpaid toggle; clicking it opens that person's instalments in place.
  const today = todayGregorian();
  const renderRegRow = (p) => {
    const total = (p.price || 0) * (p.quantity || 1) + (p.donation || 0);
    const isInst = isInstallment(p);
    const status = isInst ? purchaseStatus(p, today) : null;
    const due = status === 'overdue' || status === 'due_today';
    const expanded = openInst?.id === p.id;
    return (
      <div key={p.id}>
        <div onClick={() => navigate(`/accounting/workshop/${p.id}`, { state: { from: `/workshops/${id}` } })} className="py-2.5 flex items-center justify-between text-sm cursor-pointer hover:bg-muted/30 rounded-lg">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 min-w-0">
            {personByPhone[p.person_phone]
              ? <Link to={`/people/${personByPhone[p.person_phone].id}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
              : <span className="font-medium">{p.person_name || '-'}</span>}
            {!firstRegIds.has(p.id) && <span className="whitespace-nowrap text-[11px] font-medium px-2 py-px rounded-full border border-[#E8D5C0] bg-[#FBF3EC] text-[#7A4F1F]">ثبت‌نام مجدد</span>}
            {p.plan_name && <span className="whitespace-nowrap text-xs text-[#8CB9C0]">{p.plan_name}</span>}
            {p.registered_sessions && <span className="whitespace-nowrap text-xs text-[#B9834B]">{toPersianNum(p.registered_sessions)} جلسه</span>}
            {p.donation > 0 && <span className="whitespace-nowrap text-xs text-[#8CB9C0]">دونیشین {formatCurrency(p.donation)}</span>}
            <span className="whitespace-nowrap text-xs text-muted-foreground">{formatJalaliShort(p.purchase_date)}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 mr-2">
            <span className={`text-xs font-medium whitespace-nowrap ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
              {isInst && !p.is_paid && `${toPersianNum(paidTotal(p))} از `}{formatCurrency(total)}
            </span>
            {isInst ? (
              <button onClick={(e) => { e.stopPropagation(); setOpenInst(expanded ? null : { id: p.id, index: null }); }} aria-expanded={expanded} className={`px-2.5 py-1 rounded-full text-xs whitespace-nowrap border ${due ? 'border-[#F5C9C3] bg-[#FDF2F1] text-[#8F342B] font-bold' : p.is_paid ? 'border-green-200 bg-green-50 text-green-700 font-medium' : 'border-[#E8D5C0] bg-[#FBF3EC] text-[#7A4F1F] font-medium'} ${expanded ? 'ring-2 ring-[#B74B40] ring-offset-1' : ''}`}>
                قسطی — {toPersianNum(paidCount(p))} از {toPersianNum(p.installments.length)}{status === 'due_today' ? ' · سررسید امروز' : status === 'overdue' ? ' · معوق' : ''}
              </button>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); toggleRegPaid(p); }} className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
            )}
            <button onClick={(e) => { e.stopPropagation(); setDeleteRegId(p.id); }} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        </div>
        {expanded && (
          <div className={`mb-2 p-3 rounded-lg border space-y-3 ${due ? 'bg-[#FDF2F1] border-[#F5C9C3]' : 'bg-muted/30 border-border'}`}>
            <InstallmentChips purchase={p} selected={openInst.index} onSelect={i => setOpenInst({ id: p.id, index: i })} />
            {openInst.index !== null && (
              <InstallmentPayForm
                key={openInst.index}
                purchase={p}
                index={openInst.index}
                onSaved={updated => { setPurchases(prev => prev.map(x => (x.id === updated.id ? updated : x))); setOpenInst({ id: p.id, index: null }); }}
                onCancel={() => setOpenInst({ id: p.id, index: null })}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به صفحه قبل
      </button>

      {editing ? (
        <>
        {saveError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{saveError}</div>
        )}
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
        </>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-xl font-bold">{workshop.title}</h1>
                {workshop.tags && <p className="text-sm text-muted-foreground mt-1">{workshop.tags}</p>}
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  {workshop.day_of_week && <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {dayLabels[workshop.day_of_week] || workshop.day_of_week}</span>}
                  {(workshop.start_time || workshop.end_time) && <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {workshopTimeLabel(workshop)}</span>}
                  {workshop.space && <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {workshop.space}</span>}
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {toPersianNum(peopleCount)} نفر{workshop.capacity ? ` از ${toPersianNum(workshop.capacity)}` : ''}</span>
                  <span className="font-medium text-[#B74B40]">{formatCurrency(paidAmount)} از {formatCurrency(totalAmount)}</span>
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
                <h3 className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-[#B74B40]" /> ثبت‌نامی‌ها ({toPersianNum(peopleCount)} نفر{purchases.length > firstRegIds.size && ` · ${toPersianNum(purchases.length)} ثبت‌نام`})</h3>
                <button onClick={() => setShowAddReg(!showAddReg)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-xs font-medium hover:bg-[#A03D34]">
                  <Plus className="w-3.5 h-3.5" /> افزودن
                </button>
              </div>
              {showAddReg && (
                <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">نام مشتری *</label>
                    <PersonSearch personName={regForm.person_name} personPhone={regForm.person_phone} onNameChange={v => setRegForm(prev => ({ ...prev, person_name: v }))} onPhoneChange={v => setRegForm(prev => ({ ...prev, person_phone: v }))} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام *</label>
                      <select required value={regForm.plan_id} onChange={(e) => { setRegError(''); const plan = plans.find(p => p.id === e.target.value); setRegForm(prev => ({ ...prev, plan_id: e.target.value, price: plan ? getPlanBounds(plan).min : '', payment_method: isFreePlan(plan) ? 'free' : 'cash', selected_sessions: planLimit(plan) ? prev.selected_sessions.slice(0, planLimit(plan)) : prev.selected_sessions })); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                        <option value="" disabled>انتخاب مدل ثبت‌نام...</option>
                        {plans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatPlanRange(p)}</option>)}
                      </select>
                    </div>
                    <div className="[&>input]:w-full">
                      <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان)</label>
                      <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
                    </div>
                  </div>
                  <div className="[&>input]:w-full">
                    <label className="text-xs text-muted-foreground block mb-1">دونیشین (تومان)</label>
                    <PriceInput value={regForm.donation} onChange={v => setRegForm({ ...regForm, donation: v })} placeholder="اختیاری" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">تاریخ ثبت</label>
                    <JalaliDateInput value={regForm.purchase_date} onChange={v => setRegForm({ ...regForm, purchase_date: v })} />
                  </div>
                  {!computedPaid && !inst.on && (
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
                  <SessionPicker
                    className="sm:col-span-2 p-3 bg-white rounded-lg border border-border"
                    workshop={workshop}
                    selected={pickedSessions}
                    onChange={next => setRegForm(prev => ({ ...prev, selected_sessions: next }))}
                    held={held}
                    limit={planLimit(selectedRegPlan)}
                    prior={priorRegs}
                    personName={regForm.person_name}
                  />
                  {workshop.allow_installments && (
                    <div className="sm:col-span-2">
                      <InstallmentFields compact value={inst} onChange={setInst} total={regForm.price} workshop={workshop} method={regForm.payment_method} onMethod={v => setRegForm({ ...regForm, payment_method: v })} />
                    </div>
                  )}
                  {inst.on ? (
                    <span className="sm:col-span-2 justify-self-start text-xs font-medium px-2.5 py-1 rounded-full text-[#7A4F1F] bg-[#FBF3EC]">
                      قسطی — {toPersianNum(inst.firstPaid && inst.rows.length ? 1 : 0)} از {toPersianNum(inst.rows.length)} قسط پرداخت شده
                    </span>
                  ) : (
                  <span className={`sm:col-span-2 justify-self-start text-xs font-medium px-2.5 py-1 rounded-full ${computedPaid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}>
                    {computedPaid ? 'پرداخت شده' : 'پرداخت نشده'}
                  </span>
                  )}
                  {regError && (
                    <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      {regError}
                    </div>
                  )}
                  {dupWarning && (
                    <div className="sm:col-span-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                      {dupWarning}
                    </div>
                  )}
                  {capacityWarning && (
                    <div className="sm:col-span-2 p-3 bg-[#FBF3EC] border border-[#E8D5C0] rounded-lg text-xs text-[#B9834B] flex items-center justify-between gap-2">
                      <span className="flex-1">{capacityWarning}</span>
                      <button onClick={() => doAddRegistration(pendingReg)} disabled={submitting || !pendingReg} className="px-3 py-1 rounded-lg bg-[#B9834B] text-white text-xs font-medium hover:bg-[#A5723E] disabled:opacity-50 whitespace-nowrap">
                        ثبت در هر صورت
                      </button>
                      <button onClick={() => setCapacityWarning('')} className="px-2 py-1 rounded-lg border border-border text-xs whitespace-nowrap">انصراف</button>
                    </div>
                  )}
                  <div className="sm:col-span-2 flex gap-2 pt-1">
                    <button onClick={addRegistration} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                      {submitting ? 'در حال ثبت...' : 'ثبت'}
                    </button>
                    <button onClick={() => setShowAddReg(false)} className="px-4 py-2 rounded-lg border border-border bg-white text-sm">انصراف</button>
                  </div>
                </div>
              )}
              {purchases.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">هنوز ثبت‌نامی وجود ندارد</p>
              ) : sessions.length > 0 ? (
                <div>
                  {/* Session tabs */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-3 border-b border-border pb-2">
                    <button
                      onClick={() => setRegSessionTab(null)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        regSessionTab === null
                          ? 'bg-[#B74B40] text-white'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                    >
                      همه
                    </button>
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
                      {formatJalali(activeRegSession.session_date)} – {toPersianNum(activeRegParticipants.length)} نفر
                    </div>
                  )}
                  {/* Participant list for active session */}
                  {activeRegParticipants.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">در این جلسه ثبت‌نامی وجود ندارد</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {activeRegParticipants.map(renderRegRow)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {purchases.map(renderRegRow)}
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
      <PlanOverflowDialog payload={overflow} onAccept={acceptOverflow} onClose={() => setOverflow(null)} />
      <ConfirmDeleteDialog open={!!deleteRegId} onConfirm={confirmDeleteReg} onClose={() => setDeleteRegId(null)} />
    </div>
  );
}
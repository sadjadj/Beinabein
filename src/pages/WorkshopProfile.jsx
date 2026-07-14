import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Pencil, Check, X, Users, Calendar, Clock, MapPin, GraduationCap, ClipboardCheck, Plus, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency, computeWorkshopRevenue, findOrCreatePerson } from '@/lib/stats';
import { dayLabels, paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian, formatJalali } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import PriceInput from '@/components/PriceInput';
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
  const [regForm, setRegForm] = useState({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, registered_sessions: '' });
  const [editingRegId, setEditingRegId] = useState(null);
  const [capacityWarning, setCapacityWarning] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess, facs, spcs, ppl] = await Promise.all([
        base44.entities.Workshop.get(id),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopSession.list('-session_number', 500),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100),
        base44.entities.Person.list('-created_date', 500)
      ]);
      setWorkshop(w);
      setPurchases(purchs.filter(p => p.workshop_id === id));
      setSessions(sess.filter(s => s.workshop_id === id).sort((a, b) => (a.session_number || 0) - (b.session_number || 0)));
      setFacilitators(facs);
      setSpaces(spcs);
      setPersons(ppl);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const checkAndCreateAutoSession = async () => {
    if (!workshop || !workshop.day_of_week) return;
    const today = todayGregorian();
    const startDate = workshop.start_date;
    if (!startDate || startDate > today) return;
    if (workshop.end_date && workshop.end_date < today) return;

    const dayMap = { saturday: 6, sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5 };
    const targetDay = dayMap[workshop.day_of_week];
    const start = new Date(startDate);
    const end = new Date(today);
    const sessionDates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === targetDay) {
        sessionDates.push(new Date(d).toISOString().split('T')[0]);
      }
    }

    const existingDates = new Set(sessions.map(s => s.session_date));
    const missing = sessionDates.filter(d => !existingDates.has(d));
    if (missing.length === 0) return;

    const baseNum = sessions.length > 0 ? Math.max(...sessions.map(s => s.session_number || 0)) : 0;
    await base44.entities.WorkshopSession.bulkCreate(
      missing.map((date, i) => ({
        workshop_id: id,
        workshop_title: workshop.title,
        session_number: baseNum + i + 1,
        session_date: date,
        present_phones: []
      }))
    );
    fetchData();
  };

  useEffect(() => {
    if (workshop && sessions.length >= 0) {
      const timer = setTimeout(() => checkAndCreateAutoSession(), 500);
      return () => clearTimeout(timer);
    }
  }, [workshop?.id]);

  const startEdit = () => {
    setForm({
      title: workshop.title || '', price: workshop.price || '', session_count: workshop.session_count || '',
      is_permanent: workshop.is_permanent || false, description: workshop.description || '',
      tags: workshop.tags || '', facilitator_ids: workshop.facilitator_ids || [],
      space: workshop.space || '', start_time: workshop.start_time || '', end_time: workshop.end_time || '',
      day_of_week: workshop.day_of_week || 'saturday',
      start_date: workshop.start_date || todayGregorian(), end_date: workshop.end_date || '',
      facilitator_percentage: workshop.facilitator_percentage || '',
      capacity: workshop.capacity || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      await base44.entities.Workshop.update(id, {
        ...form,
        price: Number(form.price) || 0,
        session_count: form.is_permanent ? null : (Number(form.session_count) || null),
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null
      });
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
      await base44.entities.WorkshopPurchase.create({
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
        registered_sessions: regForm.registered_sessions ? Number(regForm.registered_sessions) : null
      });
      setRegForm({ person_name: '', person_phone: '', price: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: '', is_paid: false, registered_sessions: '' });
      setCapacityWarning('');
      setShowAddReg(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const deleteRegistration = async (purchaseId) => {
    await base44.entities.WorkshopPurchase.delete(purchaseId);
    fetchData();
  };

  const toggleRegPaid = async (p) => {
    await base44.entities.WorkshopPurchase.update(p.id, { is_paid: !p.is_paid });
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      {editing ? (
        <div className="bg-white rounded-xl border border-border p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">اسم کارگاه</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
              <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تعداد جلسه</label>
              <input type="number" value={form.session_count} onChange={e => setForm({ ...form, session_count: e.target.value })} disabled={form.is_permanent} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">درصد تسهیلگر</label>
              <input type="number" value={form.facilitator_percentage} onChange={e => setForm({ ...form, facilitator_percentage: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
              <input type="number" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} placeholder="حداکثر ثبت‌نام" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تگ (موضوعات)</label>
              <input type="text" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ساعت شروع</label>
              <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">ساعت پایان</label>
              <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">روز کارگاه</label>
              <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(dayLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">فضای برگزاری</label>
              <select value={form.space} onChange={e => setForm({ ...form, space: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">انتخاب فضا...</option>
                {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع</label>
              <JalaliDateInput value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} showToday={false} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ پایان</label>
              <JalaliDateInput value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} showToday={false} />
            </div>
          </div>
          <textarea placeholder="توضیحات کارگاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="w-4 h-4" /> {toPersianNum(rev.participantCount)} ثبت‌نام{workshop.capacity ? ` از ${toPersianNum(workshop.capacity)}` : ''}</span>
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
              <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex-shrink-0">
                <Pencil className="w-3.5 h-3.5" /> ویرایش
              </button>
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
                  <PriceInput value={regForm.price} onChange={v => setRegForm({ ...regForm, price: v })} />
                  <input type="number" placeholder="تعداد" value={regForm.quantity} onChange={e => setRegForm({ ...regForm, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <JalaliDateInput value={regForm.purchase_date} onChange={v => setRegForm({ ...regForm, purchase_date: v })} />
                  <input type="number" placeholder="تعداد جلسه (اختیاری)" value={regForm.registered_sessions} onChange={e => setRegForm({ ...regForm, registered_sessions: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                  <select value={regForm.payment_method} onChange={e => setRegForm({ ...regForm, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <select value={regForm.how_met} onChange={e => setRegForm({ ...regForm, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                    <option value="">نحوه آشنایی...</option>
                    {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={regForm.is_paid} onChange={e => setRegForm({ ...regForm, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
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
              ) : (
                <div className="divide-y divide-border">
                  {purchases.map(p => (
                    <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                      <div>
                        {personByPhone[p.person_phone]
                          ? <Link to={`/people/${personByPhone[p.person_phone].id}`} className="font-medium hover:text-[#B74B40]">{p.person_name || '-'}</Link>
                          : <span className="font-medium">{p.person_name || '-'}</span>}
                        {p.registered_sessions && <span className="text-xs text-[#B9834B] mr-2">{toPersianNum(p.registered_sessions)} جلسه</span>}
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
        </>
      )}
    </div>
  );
}
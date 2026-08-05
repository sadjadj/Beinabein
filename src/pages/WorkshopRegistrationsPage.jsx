import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Users, Search, Wallet, GraduationCap, CheckCircle, AlertCircle, Trash2, Pencil, Check, X, FileText, RotateCcw } from 'lucide-react';
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
import ExportButton from '@/components/ExportButton';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function WorkshopRegistrationsPage({ embedded = false }) {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [persons, setPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [workshopFilter, setWorkshopFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [dupWarning, setDupWarning] = useState('');
  const [formError, setFormError] = useState('');
  const [plans, setPlans] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    workshop_id: '', person_name: '', person_phone: '', price: '',
    purchase_date: todayGregorian(), payment_method: 'card_to_card', how_met: 'other',
    is_paid: false, registered_sessions: '', donation: '', plan_id: '',
    description: '', registration_type: 'full', selected_sessions: []
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ws, purchs, ppl, planList] = await Promise.all([
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
        base44.entities.Person.list('-created_date', 1000),
        base44.entities.WorkshopPlan.list('-created_date', 1000)
      ]);
      setWorkshops(ws);
      setPurchases(purchs);
      setPersons(ppl);
      setPlans(planList);
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

  const today = todayGregorian();
  const filtered = purchases.filter(p => {
    if (embedded && p.purchase_date !== today) return false;
    if (workshopFilter && p.workshop_id !== workshopFilter) return false;
    if (paidFilter === 'paid' && !p.is_paid) return false;
    if (paidFilter === 'unpaid' && p.is_paid) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.person_name || '').toLowerCase().includes(s) ||
      (p.person_phone || '').includes(search) ||
      (p.workshop_title || '').toLowerCase().includes(s);
  });

  // Session computation for selected workshop
  const selectedWorkshop = workshopById[form.workshop_id];
  const sessionCount = selectedWorkshop?.session_dates?.length || selectedWorkshop?.session_count || 0;
  const sessions = Array.from({ length: sessionCount }, (_, i) => i + 1);

  const handleWorkshopChange = (wid) => {
    setFormError('');
    setForm(prev => ({
      ...prev, workshop_id: wid, plan_id: '', price: '', selected_sessions: [], registered_sessions: 0
    }));
  };

  const handleSessionToggle = (sessionNum) => {
    setForm(prev => {
      const isSelected = prev.selected_sessions.includes(sessionNum);
      const next = isSelected ? prev.selected_sessions.filter(s => s !== sessionNum) : [...prev.selected_sessions, sessionNum];
      return { ...prev, selected_sessions: next, registered_sessions: next.length };
    });
  };

  const regExportColumns = [
    { key: 'workshop', label: 'کارگاه' },
    { key: 'plan', label: 'مدل ثبت‌نام' },
    { key: 'name', label: 'نام' },
    { key: 'phone', label: 'تلفن' },
    { key: 'date', label: 'تاریخ' },
    { key: 'price', label: 'مبلغ' },
    { key: 'donation', label: 'دونیشین' },
    { key: 'status', label: 'پرداخت' },
  ];
  const regExportRows = filtered.map(p => ({
    workshop: p.workshop_title || '',
    plan: p.plan_name || '',
    name: p.person_name || '',
    phone: p.person_phone || '',
    date: p.purchase_date ? formatJalaliShort(p.purchase_date) : '',
    price: (Number(p.price) || 0) * (Number(p.quantity) || 1),
    donation: Number(p.donation) || 0,
    status: p.is_paid ? 'پرداخت‌شده' : 'پرداخت‌نشده',
  }));

  const validateForm = () => {
    if (!form.workshop_id) return 'انتخاب کارگاه الزامی است';
    if (!form.plan_id) return 'انتخاب مدل ثبت‌نام الزامی است';
    if (!form.person_name) return 'نام مشتری الزامی است';
    if (!form.person_phone) return 'شماره تلفن الزامی است';
    if (sessionCount > 0 && (!form.selected_sessions || form.selected_sessions.length === 0)) return 'انتخاب حداقل یک جلسه الزامی است';
    return '';
  };

  const addRegistration = async () => {
    const error = validateForm();
    if (error) { setFormError(error); return; }
    setFormError('');
    const dup = purchases.find(p => p.workshop_id === form.workshop_id && p.person_phone === form.person_phone);
    if (dup) { setDupWarning('این شخص قبلاً در این کارگاه ثبت‌نام شده است.'); return; }
    setDupWarning('');
    setSubmitting(true);
    try {
      const ws = workshopById[form.workshop_id];
      await findOrCreatePerson(form.person_phone, form.person_name);
      const selected = form.selected_sessions || [];
      const regType = (sessionCount > 0 && selected.length === sessionCount) ? 'full' : 'single';
      const newPurchase = await base44.entities.WorkshopPurchase.create({
        workshop_id: form.workshop_id,
        workshop_title: ws?.title || '',
        person_name: form.person_name,
        person_phone: form.person_phone,
        price: Number(form.price) || ws?.price || 0,
        quantity: 1,
        purchase_date: form.purchase_date,
        payment_method: form.is_paid ? 'free' : form.payment_method,
        how_met: form.how_met || 'other',
        is_paid: form.is_paid,
        registered_sessions: selected.length || null,
        donation: Number(form.donation) || 0,
        plan_name: plans.find(p => p.id === form.plan_id)?.name || '',
        description: form.description || '',
        registration_type: regType,
        selected_sessions: selected
      });
      setPurchases(prev => [newPurchase, ...prev]);
      setForm({ workshop_id: '', person_name: '', person_phone: '', price: '', purchase_date: todayGregorian(), payment_method: 'card_to_card', how_met: 'other', is_paid: false, registered_sessions: '', donation: '', plan_id: '', description: '', registration_type: 'full', selected_sessions: [] });
    } finally { setSubmitting(false); }
  };

  const startInlineEdit = (p) => {
    setEditingId(p.id);
    setEditForm({ registered_sessions: p.registered_sessions || '', is_paid: p.is_paid });
  };

  const saveInlineEdit = async (p) => {
    const updated = await base44.entities.WorkshopPurchase.update(p.id, {
      registered_sessions: editForm.registered_sessions ? Number(editForm.registered_sessions) : null,
      is_paid: editForm.is_paid
    });
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, ...updated } : x));
    setEditingId(null);
  };

  const togglePaid = async (p) => {
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !p.is_paid } : x));
    await base44.entities.WorkshopPurchase.update(p.id, { is_paid: !p.is_paid });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.WorkshopPurchase.delete(deleteTarget.id);
    setPurchases(prev => prev.filter(x => x.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">ثبت نام افراد در کارگاه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت و مدیریت ثبت‌نامی‌های همه کارگاه‌ها</p>
        </div>
        )}
        {!embedded && (
        <div className="flex items-center gap-2 flex-wrap">
          <ExportButton filename="ثبت‌نام‌های-کارگاه" columns={regExportColumns} rows={regExportRows} />
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجوی نام / تلفن / کارگاه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-64" />
          </div>
        </div>
        )}
      </div>

      {/* Registration Form — always visible */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">ثبت‌نام جدید</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">کارگاه *</label>
            <WorkshopSearchSelect
              workshops={workshops.filter(w => !w.is_ended)}
              value={form.workshop_id}
              onChange={handleWorkshopChange}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام *</label>
            <select value={form.plan_id} onClick={() => { if (!form.workshop_id) setFormError('انتخاب کارگاه الزامی است'); }} onChange={(e) => { if (!form.workshop_id) { setFormError('انتخاب کارگاه الزامی است'); return; } setFormError(''); const plan = plans.find(p => p.id === e.target.value); const isFree = plan && (Number(plan.price) === 0 || plan.name === 'رایگان'); setForm({ ...form, plan_id: e.target.value, price: plan ? plan.price : '', is_paid: !!isFree, payment_method: isFree ? 'free' : 'card_to_card' }); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
              <option value="">انتخاب مدل...</option>
              {plans.filter(p => p.workshop_id === form.workshop_id).map(p => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
            </select>
          </div>
          <PersonSearch personName={form.person_name} personPhone={form.person_phone} onNameChange={v => setForm({ ...form, person_name: v })} onPhoneChange={v => setForm({ ...form, person_phone: v })} />
          <div>
            <label className="text-xs text-muted-foreground block mb-1">دونیشین (تومان)</label>
            <PriceInput value={form.donation} onChange={v => setForm({ ...form, donation: v })} placeholder="اختیاری" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ ثبت</label>
            <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} max={todayGregorian()} />
          </div>
          {!form.is_paid && (
            <div>
              <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
              <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
            <select value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
        {/* Session selection */}
        {form.workshop_id && sessionCount > 0 && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <label className="text-xs text-muted-foreground block mb-2">جلسات *</label>
            <div className="flex flex-wrap gap-2">
              {sessions.map(s => {
                const isSelected = form.selected_sessions.includes(s);
                const dateLabel = selectedWorkshop?.session_dates?.[s - 1] ? formatJalaliShort(selectedWorkshop.session_dates[s - 1]) : `جلسه ${toPersianNum(s)}`;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSessionToggle(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isSelected ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}
                  >
                    {dateLabel}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-2">تعداد جلسات انتخابی: {toPersianNum(form.selected_sessions.length)}</p>
          </div>
        )}
        {/* Description */}
        <div className="mt-3">
          <label className="text-xs text-muted-foreground block mb-1">توضیحات</label>
          <textarea
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            rows={3}
            placeholder="توضیحات (اختیاری)..."
            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
          />
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
          <button onClick={() => { setForm({ workshop_id: '', person_name: '', person_phone: '', price: '', purchase_date: todayGregorian(), payment_method: 'card_to_card', how_met: 'other', is_paid: false, registered_sessions: '', donation: '', plan_id: '', description: '', registration_type: 'full', selected_sessions: [] }); setFormError(''); setDupWarning(''); }} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
            <RotateCcw className="w-3.5 h-3.5" /> پاک کردن فرم
          </button>
        </div>
      </div>

      {/* Registrations list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">{embedded ? `ثبت‌نام‌های امروز (${toPersianNum(filtered.length)})` : `ثبت‌نامی‌ها (${toPersianNum(filtered.length)})`}</h3>
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
          <TableSkeleton rows={8} cols={7} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search || workshopFilter || paidFilter ? 'نتیجه‌ای یافت نشد' : 'هنوز ثبت‌نامی وجود ندارد'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-center p-3 font-medium">تلفن</th>
                  <th className="text-center p-3 font-medium">تاریخ</th>
                  <th className="text-center p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">جلسات</th>
                  <th className="text-center p-3 font-medium">پرداخت</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} className={`border-t border-border hover:bg-muted/30 ${editingId === p.id ? '' : 'cursor-pointer'}`} onClick={() => { if (editingId !== p.id) navigate(`/accounting/workshop/${p.id}`); }}>
                    <td className="p-3">
                      <span className="font-medium">{p.person_name || '-'}</span>
                      {p.description && <FileText className="w-3.5 h-3.5 text-[#B9834B] inline-block mr-1" />}
                    </td>
                    <td className="p-3">
                      <Link to={`/workshops/${p.workshop_id}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#B74B40]">{p.workshop_title || '-'}</Link>
                      {p.plan_name && <span className="text-xs text-[#8CB9C0] block mt-0.5">{p.plan_name}</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap text-center" dir="ltr">{p.person_phone || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">{p.purchase_date ? formatJalaliShort(p.purchase_date) : '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">
                      {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0))}
                      {Number(p.donation) > 0 && <span className="block text-[10px] text-[#8CB9C0]">شامل {formatCurrency(Number(p.donation))} دونیشین</span>}
                    </td>
                    <td className="p-3 text-xs text-center">
                      {editingId === p.id ? (
                        <PersianNumberInput value={editForm.registered_sessions} onChange={v => setEditForm({ ...editForm, registered_sessions: v })} placeholder="تعداد جلسات" className="w-20 px-2 py-1 rounded-lg border border-input bg-background text-sm text-right" />
                      ) : (
                        p.registered_sessions ? `${toPersianNum(p.registered_sessions)} جلسه` : '-'
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {editingId === p.id ? (
                        <label className="flex items-center gap-1 text-xs justify-center">
                          <input type="checkbox" checked={editForm.is_paid} onChange={e => setEditForm({ ...editForm, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شد
                        </label>
                      ) : (
                        <button onClick={(e) => { e.stopPropagation(); togglePaid(p); }} className={`inline-flex items-center gap-1 text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                          {p.is_paid ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                          {p.is_paid ? 'پرداخت‌شده' : 'پرداخت‌نشده'}
                        </button>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {editingId === p.id ? (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); saveInlineEdit(p); }} className="text-green-600 hover:text-green-700" title="ذخیره"><Check className="w-4 h-4" /></button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingId(null); }} className="text-muted-foreground hover:text-foreground" title="انصراف"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); startInlineEdit(p); }} className="text-muted-foreground hover:text-[#B74B40]" title="ویرایش">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(p); }} className="text-muted-foreground hover:text-red-600" title="حذف">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف فاکتور</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف فاکتور {deleteTarget?.person_name} در کارگاه {deleteTarget?.workshop_title} اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
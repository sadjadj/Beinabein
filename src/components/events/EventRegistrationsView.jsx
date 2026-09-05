import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, RotateCcw } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort } from '@/lib/jalali';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import PlanOverflowDialog from '@/components/PlanOverflowDialog';
import { getPlanBounds, isFreePlan, isAmountPaid, formatPlanRange } from '@/lib/planPricing';
import { TableSkeleton } from '@/components/SkeletonPatterns';

const blankForm = { person_name: '', person_phone: '', price: '', purchase_date: todayGregorian(), payment_method: 'cash', how_met: 'other', donation: '', plan_id: '' };

export default function EventRegistrationsView({ event, plans }) {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [dupWarning, setDupWarning] = useState('');
  const [overflow, setOverflow] = useState(null);
  const [form, setForm] = useState(blankForm);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.EventPurchase.list('-purchase_date', 1000);
      setPurchases(all.filter(p => p.event_id === event.id));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPurchases(); }, [event.id]);

  const eventPlans = plans.filter(p => p.event_id === event.id);
  const selectedPlan = eventPlans.find(p => p.id === form.plan_id);
  const computedPaid = selectedPlan ? isAmountPaid(form.price, selectedPlan) : false;

  const handlePlanChange = (planId) => {
    const plan = eventPlans.find(p => p.id === planId);
    setForm(prev => ({ ...prev, plan_id: planId, price: plan ? getPlanBounds(plan).min : '', payment_method: isFreePlan(plan) ? 'free' : 'cash' }));
  };

  const resetForm = () => {
    setForm({ ...blankForm, purchase_date: todayGregorian() });
    setFormError('');
    setDupWarning('');
  };

  const addRegistration = async () => {
    if (!form.plan_id) { setFormError('انتخاب مدل ثبت‌نام الزامی است'); return; }
    if (!form.person_name) { setFormError('نام مشتری الزامی است'); return; }
    if (!form.person_phone) { setFormError('شماره تلفن الزامی است'); return; }
    setFormError('');
    const dup = purchases.find(p => p.person_phone === form.person_phone);
    if (dup) { setDupWarning('این شخص قبلاً در این رخداد ثبت‌نام شده است.'); return; }
    setDupWarning('');
    const plan = eventPlans.find(p => p.id === form.plan_id);
    const { min, max } = getPlanBounds(plan);
    const amount = Number(form.price) || 0;
    const donation = Number(form.donation) || 0;
    if (amount > max) { setOverflow({ amount, max, donation }); return; }
    await doAddRegistration(amount, donation, amount >= min);
  };

  const acceptOverflow = () => {
    const { amount, max, donation } = overflow;
    setOverflow(null);
    doAddRegistration(max, donation + (amount - max), true);
  };

  const doAddRegistration = async (amount, donation, isPaid) => {
    setSubmitting(true);
    try {
      await findOrCreatePerson(form.person_phone, form.person_name);
      const created = await base44.entities.EventPurchase.create({
        event_id: event.id,
        event_title: event.title,
        person_name: form.person_name,
        person_phone: form.person_phone,
        price: amount,
        quantity: 1,
        purchase_date: form.purchase_date,
        payment_method: isFreePlan(eventPlans.find(p => p.id === form.plan_id)) ? 'free' : form.payment_method,
        how_met: form.how_met || 'other',
        is_paid: isPaid,
        donation: donation,
        plan_name: eventPlans.find(p => p.id === form.plan_id)?.name || ''
      });
      setPurchases(prev => [created, ...prev]);
      resetForm();
    } finally { setSubmitting(false); }
  };

  const togglePaid = async (p) => {
    setPurchases(prev => prev.map(x => x.id === p.id ? { ...x, is_paid: !p.is_paid } : x));
    await base44.entities.EventPurchase.update(p.id, { is_paid: !p.is_paid });
  };

  const deleteReg = async (id) => {
    setPurchases(prev => prev.filter(x => x.id !== id));
    await base44.entities.EventPurchase.delete(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-semibold">ثبت‌نامی‌های «{event.title}» ({toPersianNum(purchases.length)}{event.capacity ? ` از ${toPersianNum(event.capacity)}` : ''})</h3>
      </div>

      {/* Registration form */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h4 className="text-sm font-semibold mb-4">ثبت‌نام جدید</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل ثبت‌نام *</label>
            <select value={form.plan_id} onChange={e => handlePlanChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
              <option value="">انتخاب مدل...</option>
              {eventPlans.map(p => <option key={p.id} value={p.id}>{p.name} — {formatPlanRange(p)}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام و شماره تلفن مشتری *</label>
            <PersonSearch personName={form.person_name} personPhone={form.person_phone} onNameChange={v => setForm({ ...form, person_name: v })} onPhoneChange={v => setForm({ ...form, person_phone: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان)</label>
            <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">دونیشن (تومان)</label>
            <PriceInput value={form.donation} onChange={v => setForm({ ...form, donation: v })} placeholder="اختیاری" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ ثبت</label>
            <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} max={todayGregorian()} />
          </div>
          {!computedPaid && (
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
          <div className="flex items-end">
            <span className={`text-xs font-medium px-2 py-1.5 rounded ${computedPaid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}>
              {computedPaid ? 'پرداخت شده' : 'پرداخت نشده'}
            </span>
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

      {/* Registrations list */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : purchases.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">هنوز ثبت‌نامی وجود ندارد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">مدل ثبت‌نام</th>
                  <th className="text-center p-3 font-medium">تلفن</th>
                  <th className="text-center p-3 font-medium">تاریخ</th>
                  <th className="text-center p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">پرداخت</th>
                  <th className="text-center p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {purchases.map(p => (
                  <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{p.person_name || '-'}</td>
                    <td className="p-3 text-xs">{p.plan_name || '-'}</td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap text-center" dir="ltr">{p.person_phone || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">{p.purchase_date ? formatJalaliShort(p.purchase_date) : '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">
                      {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0))}
                      {Number(p.donation) > 0 && <span className="block text-[10px] text-[#8CB9C0]">شامل {formatCurrency(Number(p.donation))} دونیشن</span>}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => togglePaid(p)} className={`text-xs font-medium px-2 py-1 rounded ${p.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}>{p.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => deleteReg(p.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PlanOverflowDialog payload={overflow} onAccept={acceptOverflow} onClose={() => setOverflow(null)} />
    </div>
  );
}
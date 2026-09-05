import React, { useState } from 'react';
import { Trash2, Check, X, Plus } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import JalaliDateInput from '@/components/JalaliDateInput';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import { dayLabels, dayOrder } from '@/lib/labels';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function GroupForm({
  initialForm,
  initialPlans = [],
  facilitators = [],
  spaces = [],
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'ثبت گروه',
  showDelete = false,
  onDelete
}) {
  const [form, setForm] = useState(initialForm);
  const [plans, setPlans] = useState(
    (initialPlans || []).map(p => ({ id: p.id || '', name: p.name || '', price: p.price ?? '', is_active: p.is_active !== false }))
  );
  const [newPlan, setNewPlan] = useState({ name: '', price: '' });
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const schedule = form.schedule || [];

  const toggleDay = (day) => {
    const exists = schedule.find(s => s.day === day);
    if (exists) {
      setForm({ ...form, schedule: schedule.filter(s => s.day !== day) });
    } else {
      setForm({ ...form, schedule: [...schedule, { day, start_time: '', end_time: '' }] });
    }
  };

  const updateSlot = (day, field, value) => {
    setForm({
      ...form,
      schedule: schedule.map(s => s.day === day ? { ...s, [field]: value } : s)
    });
  };

  const handleAddPlan = () => {
    if (!newPlan.name || newPlan.price === '' || newPlan.price === null) {
      setError('برای افزودن مدل ثبت‌نام، نام و قیمت الزامی است');
      return;
    }
    setError('');
    setPlans(prev => [...prev, { id: '', name: newPlan.name, price: newPlan.price, is_active: true }]);
    setNewPlan({ name: '', price: '' });
  };
  const togglePlanActive = (i) => setPlans(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: !p.is_active } : p));
  const removePlan = (i) => setPlans(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    if ((form.schedule || []).length === 0) { setError('انتخاب حداقل یک روز هفته الزامی است'); return; }
    const missingTime = (form.schedule || []).some(s => !s.start_time || !s.end_time);
    if (missingTime) { setError('ساعت شروع و پایان برای همه روزهای انتخاب شده الزامی است'); return; }
    if (!form.start_date) { setError('تاریخ شروع الزامی است'); return; }
    if (plans.length === 0) { setError('افزودن حداقل یک مدل ثبت‌نام الزامی است'); return; }
    setError('');
    onSubmit(form, plans);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">اسم گروه</label>
            <input type="text" placeholder="اسم گروه" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">درصد تسهیلگر</label>
            <PersianNumberInput value={form.facilitator_percentage} onChange={v => setForm({ ...form, facilitator_percentage: v })} placeholder="درصد" className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-20 text-right" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تگ گروه (موضوعات)</label>
            <input type="text" placeholder="موضوعات" value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-32" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
            <PersianNumberInput value={form.capacity} onChange={v => setForm({ ...form, capacity: v })} placeholder="ظرفیت" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24 text-right" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">فضای برگزاری</label>
            <select value={form.space || ''} onChange={e => setForm({ ...form, space: e.target.value })} className="px-4 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
              <option value="">انتخاب فضا...</option>
              {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Weekly schedule */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">روزهای برگزاری هفتگی (برای هر روز، ساعت شروع و پایان الزامی است)</label>
          <div className="border border-border rounded-lg divide-y divide-border">
            {dayOrder.map(day => {
              const slot = schedule.find(s => s.day === day);
              const included = !!slot;
              return (
                <div key={day} className="flex flex-wrap items-center gap-3 p-2.5">
                  <button type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${included ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                    {dayLabels[day]}
                  </button>
                  {included && (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">از</span>
                        <input type="time" value={slot.start_time || ''} onChange={e => updateSlot(day, 'start_time', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-sm" required />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-muted-foreground">تا</span>
                        <input type="time" value={slot.end_time || ''} onChange={e => updateSlot(day, 'end_time', e.target.value)} className="px-2 py-1.5 rounded-lg border border-input bg-background text-sm" required />
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع</label>
            <div className="w-44"><JalaliDateInput value={form.start_date || ''} onChange={v => setForm({ ...form, start_date: v })} required /></div>
          </div>
        </div>

        <textarea placeholder="توضیحات گروه" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <div>
          <label className="text-xs text-muted-foreground block mb-2">تسهیلگران:</label>
          <FacilitatorMultiSearch selectedIds={form.facilitator_ids || []} onChange={ids => setForm({ ...form, facilitator_ids: ids })} />
        </div>

        {/* Plans section */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">مدل‌های ثبت‌نام (حداقل یک مدل الزامی است)</label>
          <div className="flex items-end gap-2 mb-3 flex-wrap">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">نام مدل</label>
              <input type="text" placeholder="مثلاً ماهانه" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">قیمت (تومان)</label>
              <PriceInput value={newPlan.price} onChange={v => setNewPlan({ ...newPlan, price: v })} />
            </div>
            <button type="button" onClick={handleAddPlan} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
              <Plus className="w-4 h-4" /> افزودن مدل ثبت‌نام
            </button>
          </div>
          {plans.length > 0 && (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2.5 font-medium">نام مدل</th>
                    <th className="text-right p-2.5 font-medium">قیمت</th>
                    <th className="text-center p-2.5 font-medium">وضعیت</th>
                    <th className="text-center p-2.5 font-medium">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((pl, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2.5 font-medium">{pl.name || '-'}</td>
                      <td className="p-2.5">{(pl.price !== '' && pl.price !== null) ? formatCurrency(Number(pl.price)) : '-'}</td>
                      <td className="p-2.5 text-center">
                        <button type="button" onClick={() => togglePlanActive(i)} className={`text-xs px-2 py-1 rounded-full ${pl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{pl.is_active ? 'فعال' : 'غیرفعال'}</button>
                      </td>
                      <td className="p-2.5 text-center">
                        <button type="button" onClick={() => removePlan(i)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>
        )}
        <div className="flex justify-between gap-2">
          {showDelete && onDelete && (
            <button type="button" onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> حذف گروه
            </button>
          )}
          <div className="flex gap-2 mr-auto">
            <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              <Check className="w-4 h-4" /> {submitting ? 'در حال ذخیره...' : submitLabel}
            </button>
            <button type="button" onClick={onCancel} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
              <X className="w-4 h-4" /> انصراف
            </button>
          </div>
        </div>
      </form>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف گروه</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف این گروه و تمام ثبت‌نام‌ها و جلسات وابسته به آن اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowDeleteConfirm(false); onDelete(); }}
              className="bg-red-600 hover:bg-red-700 text-white mx-2"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
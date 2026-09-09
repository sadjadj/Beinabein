import React, { useState } from 'react';
import { Trash2, Check, X, Plus } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatPlanRange } from '@/lib/planPricing';
import { toJalaliStr } from '@/lib/jalali';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import WorkshopCalendarPicker, { computeWorkshopFieldsFromDates } from '@/components/WorkshopCalendarPicker';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function WorkshopForm({
  initialForm,
  initialPlans = [],
  facilitators = [],
  spaces = [],
  isAdmin = true,
  attendanceByDate = {},
  onSubmit,
  onCancel,
  submitting = false,
  submitLabel = 'ثبت کارگاه',
  showDelete = false,
  onDelete
}) {
  const [form, setForm] = useState(initialForm);
  const [plans, setPlans] = useState(
    (initialPlans || []).map(p => ({ id: p.id || '', name: p.name || '', price_min: p.price_min ?? '', price_max: p.price_max ?? '', is_active: p.is_active !== false }))
  );
  const [newPlan, setNewPlan] = useState({ name: '', price_min: '', price_max: '' });
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDatesChange = (dates) => {
    const computed = computeWorkshopFieldsFromDates(dates);
    setForm(prev => ({ ...prev, ...computed }));
  };

  const handleAddPlan = () => {
    if (!newPlan.name || newPlan.price_min === '' || newPlan.price_min === null || newPlan.price_max === '' || newPlan.price_max === null) {
      setError('برای افزودن مدل ثبت‌نام، نام و هر دو کران قیمت الزامی است');
      return;
    }
    if (Number(newPlan.price_min) > Number(newPlan.price_max)) {
      setError('کران پایین قیمت باید کوچکتر یا مساوی کران بالای قیمت باشد');
      return;
    }
    setError('');
    setPlans(prev => [...prev, { id: '', name: newPlan.name, price_min: newPlan.price_min, price_max: newPlan.price_max, is_active: true }]);
    setNewPlan({ name: '', price_min: '', price_max: '' });
  };
  const togglePlanActive = (i) => setPlans(prev => prev.map((p, idx) => idx === i ? { ...p, is_active: !p.is_active } : p));
  const removePlan = (i) => setPlans(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.start_time || !form.end_time) { setError('ساعت شروع و پایان الزامی است'); return; }
    if (plans.length === 0) { setError('افزودن حداقل یک مدل ثبت‌نام الزامی است'); return; }
    setError('');
    onSubmit(form, plans);
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">اسم کارگاه</label>
            <input type="text" placeholder="اسم کارگاه" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">درصد تسهیلگر</label>
            <PersianNumberInput value={form.facilitator_percentage} onChange={v => setForm({ ...form, facilitator_percentage: v })} placeholder="درصد" className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-20 text-right" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تگ کارگاه (موضوعات)</label>
            <input type="text" placeholder="موضوعات" value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-32" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
            <PersianNumberInput value={form.capacity} onChange={v => setForm({ ...form, capacity: v })} placeholder="ظرفیت" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24 text-right" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ساعت شروع *</label>
            <input type="time" value={form.start_time || ''} onChange={e => setForm({ ...form, start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ساعت پایان *</label>
            <input type="time" value={form.end_time || ''} onChange={e => setForm({ ...form, end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">فضای برگزاری</label>
            <select value={form.space || ''} onChange={e => setForm({ ...form, space: e.target.value })} className="px-4 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
              <option value="">انتخاب فضا...</option>
              {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </div>
        </div>
        {/* Workshop Calendar Picker */}
        <WorkshopCalendarPicker
          selectedDates={form.session_dates || []}
          onChange={handleDatesChange}
          isAdmin={isAdmin}
          attendanceByDate={attendanceByDate}
        />
        {/* Auto-filled read-only fields */}
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
            <div className="px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm whitespace-nowrap w-fit min-w-[140px]">
              {form.day_of_week || '—'}
            </div>
          </div>
        </div>
        <textarea placeholder="توضیحات کارگاه" value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        <div>
          <label className="text-xs text-muted-foreground block mb-2">تسهیلگران:</label>
          <FacilitatorMultiSearch selectedIds={form.facilitator_ids || []} onChange={ids => setForm({ ...form, facilitator_ids: ids })} />
        </div>
        {/* Plans section */}
        <div>
          <label className="text-xs text-muted-foreground block mb-2">مدل‌های ثبت‌نام (حداقل یک مدل الزامی است)</label>
          {/* Add new plan form */}
          <div className="flex items-end gap-2 mb-3 flex-wrap">
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">نام مدل</label>
              <input type="text" placeholder="مثلاً ثبت‌نام کامل" value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">کران پایین قیمت (تومان)</label>
              <PriceInput value={newPlan.price_min} onChange={v => setNewPlan({ ...newPlan, price_min: v })} placeholder="حداقل" />
            </div>
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">کران بالای قیمت (تومان)</label>
              <PriceInput value={newPlan.price_max} onChange={v => setNewPlan({ ...newPlan, price_max: v })} placeholder="حداکثر" />
            </div>
            <button type="button" onClick={handleAddPlan} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
              <Plus className="w-4 h-4" /> افزودن مدل ثبت‌نام
            </button>
          </div>
          {/* Plans table */}
          {plans.length > 0 && (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-2.5 font-medium">نام مدل</th>
                    <th className="text-right p-2.5 font-medium">کران قیمت</th>
                    <th className="text-center p-2.5 font-medium">وضعیت</th>
                    <th className="text-center p-2.5 font-medium">حذف</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((pl, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="p-2.5 font-medium">{pl.name || '-'}</td>
                      <td className="p-2.5">{formatPlanRange(pl)}</td>
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
              <Trash2 className="w-4 h-4" /> حذف کارگاه
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
            <AlertDialogTitle className="text-center">حذف کارگاه</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف این کارگاه و تمام ثبت‌نام‌ها و جلسات وابسته به آن اطمینان دارید؟ این عملیات قابل بازگشت نیست.
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
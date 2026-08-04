import React, { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { toJalaliStr } from '@/lib/jalali';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import WorkshopCalendarPicker, { computeWorkshopFieldsFromDates } from '@/components/WorkshopCalendarPicker';

export default function WorkshopForm({
  initialForm,
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

  const handleDatesChange = (dates) => {
    const computed = computeWorkshopFieldsFromDates(dates);
    setForm(prev => ({ ...prev, ...computed }));
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(form); }} className="space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">اسم کارگاه</label>
            <input type="text" placeholder="اسم کارگاه" value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
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
            <input type="text" placeholder="موضوعات" value={form.tags || ''} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-32" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
            <PersianNumberInput value={form.capacity} onChange={v => setForm({ ...form, capacity: v })} placeholder="ظرفیت" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24 text-right" />
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ساعت شروع</label>
            <input type="time" value={form.start_time || ''} onChange={e => setForm({ ...form, start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ساعت پایان</label>
            <input type="time" value={form.end_time || ''} onChange={e => setForm({ ...form, end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.is_permanent || false} onChange={e => setForm({ ...form, is_permanent: e.target.checked })} className="w-4 h-4" />
          کارگاه دائمی
        </label>
        <div className="flex justify-between gap-2">
          {showDelete && onDelete && (
            <button type="button" onClick={onDelete} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
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
    </div>
  );
}
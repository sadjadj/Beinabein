import React from 'react';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import WorkshopCalendarPicker, { computeWorkshopFieldsFromDates } from '@/components/WorkshopCalendarPicker';
import { toPersianNum } from '@/lib/stats';
import { toJalaliStr } from '@/lib/jalali';

export default function WorkshopFormFields({ form, setForm, spaces, isAdmin, existingSessions, onAttendanceWarning }) {
  return (
    <>
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
      {/* Workshop Calendar Picker */}
      <div className="relative">
        <WorkshopCalendarPicker
          selectedDates={form.session_dates || []}
          onChange={(dates) => {
            const computed = computeWorkshopFieldsFromDates(dates);
            setForm(prev => ({ ...prev, ...computed }));
          }}
          isAdmin={isAdmin}
          existingSessions={existingSessions}
          onAttendanceWarning={onAttendanceWarning}
        />
      </div>
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
    </>
  );
}
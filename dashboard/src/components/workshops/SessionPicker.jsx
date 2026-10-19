import React from 'react';
import { Check } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatJalaliShort } from '@/lib/jalali';
import { toggleSession } from '@/lib/registrationSessions';

// Session chips of both workshop registration forms. Sessions the person
// already holds (`held`) are ticked and locked; `limit` is the plan's session
// count (0 = no cap). `prior` = this person's earlier registrations here.
export default function SessionPicker({ workshop, selected, onChange, held, limit = 0, prior = [], personName = '', className = '' }) {
  const total = workshop?.session_dates?.length || workshop?.session_count || 0;
  if (!total) return null;
  const capped = limit > 1 && selected.length >= limit;
  const priorPlans = [...new Set(prior.map(p => p.plan_name).filter(Boolean))].map(n => `«${n}»`).join('، ');
  return (
    <div className={className}>
      {prior.length > 0 && (
        <div className="mb-3 p-3 bg-[#FBF3EC] border border-[#E8D5C0] rounded-lg text-xs text-[#7A4F1F]">
          {personName || 'این شخص'} قبلاً {priorPlans && `با مدل ${priorPlans} `}در این کارگاه ثبت‌نام کرده است.
        </div>
      )}
      <label className="text-xs text-muted-foreground block mb-2">جلسات *</label>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: total }, (_, i) => i + 1).map(s => {
          const isHeld = held.has(s);
          const isSelected = selected.includes(s);
          const dateLabel = workshop.session_dates?.[s - 1] ? formatJalaliShort(workshop.session_dates[s - 1]) : `جلسه ${toPersianNum(s)}`;
          return (
            <button
              key={s}
              type="button"
              disabled={isHeld || (capped && !isSelected)}
              onClick={() => onChange(toggleSession(selected, s, limit))}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed ${
                isHeld ? 'bg-muted border border-dashed border-border text-muted-foreground'
                  : isSelected ? 'bg-[#B74B40] text-white'
                  : 'bg-white border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 disabled:hover:bg-white'
              }`}
            >
              {isHeld && <Check className="w-3.5 h-3.5" />}
              {dateLabel}
            </button>
          );
        })}
      </div>
      <p className={`text-xs mt-2 ${limit && selected.length < limit ? 'text-[#B9834B]' : 'text-muted-foreground'}`}>
        {limit
          ? `${toPersianNum(selected.length)} از ${toPersianNum(limit)} جلسهٔ این مدل انتخاب شده`
          : `تعداد جلسات انتخابی: ${toPersianNum(selected.length)}`}
        {held.size > 0 && ' · جلسات تیک‌خورده قبلاً برای این شخص ثبت شده‌اند'}
      </p>
    </div>
  );
}

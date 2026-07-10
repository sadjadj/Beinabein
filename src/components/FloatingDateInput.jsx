import React from 'react';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';

export default function FloatingDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ', compact = false }) {
  const hasValue = !!value;
  const setToday = (e) => { e.preventDefault(); onChange(todayGregorian()); };

  return (
    <div className="relative flex-shrink-0 w-full">
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        className={`w-full ${compact ? 'py-2' : 'py-2'} pl-16 pr-3 rounded-lg border border-input bg-background text-transparent caret-transparent focus:outline-none focus:border-[#B74B40]`}
      />
      <span className={`pointer-events-none absolute right-3 transition-all duration-200 text-muted-foreground ${
        hasValue
          ? 'top-0.5 text-[10px] text-[#B74B40] font-medium'
          : 'top-1/2 -translate-y-1/2 text-sm'
      }`}>
        {hasValue ? toJalaliStr(value) : placeholder}
      </span>
      <button type="button" onClick={setToday} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap z-10">
        امروز
      </button>
    </div>
  );
}
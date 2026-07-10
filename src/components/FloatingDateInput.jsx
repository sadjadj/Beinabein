import React from 'react';
import { toJalaliStr, todayJalali, todayGregorian } from '@/lib/jalali';

export default function FloatingDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ', compact = false }) {
  const hasValue = !!value;
  const setToday = () => onChange(todayGregorian());

  return (
    <div className="flex flex-col gap-1 flex-shrink-0">
      <div className="relative">
        <input
          type="date"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          required={required}
          className={`peer w-full ${compact ? 'py-3' : 'py-3.5'} pl-9 pr-3 rounded-lg border border-input bg-background text-transparent caret-transparent focus:outline-none focus:border-[#B74B40]`}
        />
        <span className={`pointer-events-none absolute right-3 transition-all duration-200 text-muted-foreground ${
          hasValue
            ? 'top-1 text-[10px] text-[#B74B40] font-medium'
            : 'top-1/2 -translate-y-1/2 text-sm'
        }`}>
          {hasValue ? toJalaliStr(value) : placeholder}
        </span>
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </div>
      <button type="button" onClick={setToday} className="self-start text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap">
        امروز: {todayJalali()}
      </button>
    </div>
  );
}
import React from 'react';
import { todayGregorian } from '@/lib/jalali';

export default function JalaliDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ', showToday = true }) {
  const setToday = (e) => { e.preventDefault(); onChange(todayGregorian()); };

  return (
    <div className="relative w-full">
      <input
        type="date"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        required={required}
        className="w-full py-2 pl-16 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:border-[#B74B40]"
      />
      {showToday && (
        <button type="button" onClick={setToday} className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap z-10">
          امروز
        </button>
      )}
    </div>
  );
}
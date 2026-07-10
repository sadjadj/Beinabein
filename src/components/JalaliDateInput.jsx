import React, { useState } from 'react';
import { toJalaliStr, todayJalali, todayGregorian } from '@/lib/jalali';

export default function JalaliDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ', compact = false, showToday = true }) {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const setToday = () => {
    onChange(todayGregorian());
  };

  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      {showToday && (
        <button type="button" onClick={setToday} className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap flex-shrink-0">
          امروز
        </button>
      )}
      <div className="relative flex-1 min-w-[120px]">
        <input
          type="date"
          value={value || ''}
          onChange={handleChange}
          required={required}
          className="px-2 py-2 rounded-lg border border-input bg-background text-sm w-full"
        />
      </div>
      <span className="text-[11px] text-muted-foreground whitespace-nowrap min-w-[70px]">
        {value ? toJalaliStr(value) : placeholder}
      </span>
    </div>
  );
}
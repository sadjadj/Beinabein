import React, { useState } from 'react';
import { toJalaliStr, fromJalaliStr, todayJalali, todayGregorian } from '@/lib/jalali';
import { Calendar } from 'lucide-react';

export default function JalaliDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ' }) {
  const [jalaliValue, setJalaliValue] = useState(value ? toJalaliStr(value) : '');

  const handleChange = (e) => {
    const gregorian = e.target.value;
    onChange(gregorian);
    setJalaliValue(gregorian ? toJalaliStr(gregorian) : '');
  };

  const setToday = () => {
    const today = todayGregorian();
    onChange(today);
    setJalaliValue(todayJalali());
  };

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <div className="relative flex-1 min-w-[140px]">
        <Calendar className="w-4 h-4 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="date"
          value={value || ''}
          onChange={handleChange}
          required={required}
          className="pr-8 pl-2 py-2 rounded-lg border border-input bg-background text-sm w-full"
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px]">
        {value ? toJalaliStr(value) : placeholder}
      </span>
      <button type="button" onClick={setToday} className="text-xs px-2.5 py-2 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap flex-shrink-0">
        امروز
      </button>
    </div>
  );
}
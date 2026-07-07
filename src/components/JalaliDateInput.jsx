import React, { useState } from 'react';
import { toJalaliStr, fromJalaliStr, todayJalali, todayGregorian } from '@/lib/jalali';

export default function JalaliDateInput({ value, onChange, required, placeholder = 'تاریخ' }) {
  const [jalaliValue, setJalaliValue] = useState(value ? toJalaliStr(value) : '');
  const [manual, setManual] = useState(false);

  const handleChange = (e) => {
    const jv = e.target.value;
    setJalaliValue(jv);
    const gregorian = fromJalaliStr(jv);
    if (gregorian) {
      onChange(gregorian);
    }
  };

  const setToday = () => {
    const today = todayGregorian();
    setJalaliValue(todayJalali());
    onChange(today);
  };

  if (manual) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={jalaliValue}
          onChange={handleChange}
          placeholder="۱۴۰۵/۰۴/۱۶"
          required={required}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-full"
          dir="ltr"
        />
        <button type="button" onClick={() => setManual(false)} className="text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted whitespace-nowrap">
          تقویم
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setJalaliValue(e.target.value ? toJalaliStr(e.target.value) : '');
        }}
        required={required}
        className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-full"
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[80px]">
        {value ? toJalaliStr(value) : placeholder}
      </span>
      <button type="button" onClick={() => setManual(true)} className="text-xs px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted whitespace-nowrap">
        دستی
      </button>
      <button type="button" onClick={setToday} className="text-xs px-2 py-1 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap">
        امروز
      </button>
    </div>
  );
}
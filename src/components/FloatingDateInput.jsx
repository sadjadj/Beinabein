import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliCalendar from './JalaliCalendar';

export default function FloatingDateInput({ value, onChange, required, placeholder = 'انتخاب تاریخ', showToday = true, max }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const hasValue = !!value;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const setToday = (e) => { e.preventDefault(); onChange(todayGregorian()); };

  return (
    <div className="relative w-full" ref={ref}>
      <div className="flex items-center w-full py-2 rounded-lg border border-input bg-background focus-within:border-[#B74B40]">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex-1 flex items-center gap-2 px-3 text-sm min-w-0"
        >
          <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className={`truncate ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>
            {hasValue ? toJalaliStr(value) : placeholder}
          </span>
        </button>
        {showToday && (
          <button
            type="button"
            onClick={setToday}
            className="text-[11px] px-2 py-1 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 whitespace-nowrap ml-1 flex-shrink-0"
          >
            امروز
          </button>
        )}
        {hasValue && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); onChange(''); }}
            className="text-muted-foreground hover:text-foreground p-1 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 top-full mt-1 right-0">
          <JalaliCalendar value={value} onChange={onChange} onClose={() => setOpen(false)} max={max} />
        </div>
      )}
    </div>
  );
}
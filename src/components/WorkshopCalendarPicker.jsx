import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X, Trash2 } from 'lucide-react';
import { toJalaliStr, getJalaliParts } from '@/lib/jalali';
import { dayLabels, dayOrder } from '@/lib/labels';
import JalaliMultiCalendar from './JalaliMultiCalendar';

const jsDayToKey = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

export default function WorkshopCalendarPicker({ selectedDates = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const sorted = [...selectedDates].sort();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggleDate = (newDates) => { onChange(newDates); };
  const removeDate = (date) => { onChange(selectedDates.filter(d => d !== date)); };

  // Compute unique day names from selected dates
  const dayNames = [];
  const dayKeys = new Set();
  sorted.forEach(d => {
    const dt = new Date(d);
    const key = jsDayToKey[dt.getDay()];
    if (key && !dayKeys.has(key)) {
      dayKeys.add(key);
      dayNames.push(dayLabels[key]);
    }
  });
  // Sort by dayOrder
  dayNames.sort((a, b) => {
    const ka = Object.entries(dayLabels).find(([k, v]) => v === a)?.[0];
    const kb = Object.entries(dayLabels).find(([k, v]) => v === b)?.[0];
    return dayOrder.indexOf(ka) - dayOrder.indexOf(kb);
  });
  const dayOfWeekText = dayNames.join(' - ');
  const startDate = sorted[0] || '';
  const endDate = sorted[sorted.length - 1] || '';
  const sessionCount = sorted.length;

  return (
    <div className="w-full" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] w-full justify-center"
      >
        <CalendarIcon className="w-4 h-4" /> تقویم کارگاه
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 right-0">
          <JalaliMultiCalendar
            selectedDates={selectedDates}
            onToggle={toggleDate}
            onConfirm={() => setOpen(false)}
          />
        </div>
      )}
      {sorted.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">جلسات انتخاب شده ({sorted.length}):</p>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30">
                <tr>
                  <th className="text-right p-2 font-medium text-xs">نام جلسه</th>
                  <th className="text-right p-2 font-medium text-xs">تاریخ برگزاری</th>
                  <th className="text-center p-2 font-medium text-xs w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((date, i) => (
                  <tr key={date} className="border-t border-border">
                    <td className="p-2 text-xs font-medium">جلسه {i + 1}</td>
                    <td className="p-2 text-xs text-muted-foreground">{toJalaliStr(date)}</td>
                    <td className="p-2 text-center">
                      <button type="button" onClick={() => removeDate(date)} className="text-muted-foreground hover:text-red-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to compute auto-filled fields from selected dates
export function computeWorkshopFieldsFromDates(dates) {
  const sorted = [...dates].sort();
  const dayKeys = new Set();
  sorted.forEach(d => {
    const dt = new Date(d);
    const key = jsDayToKey[dt.getDay()];
    if (key) dayKeys.add(key);
  });
  const dayNames = dayOrder.filter(k => dayKeys.has(k)).map(k => dayLabels[k]);
  return {
    session_dates: sorted,
    session_count: sorted.length,
    start_date: sorted[0] || '',
    end_date: sorted[sorted.length - 1] || '',
    day_of_week: dayNames.join(' - '),
  };
}
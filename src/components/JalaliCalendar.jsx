import React, { useState } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { getJalaliParts, jalaliDaysInMonth, jalaliFirstWeekday, jalaliToGregorianStr, toPersianDigits, todayGregorian } from '@/lib/jalali';

const jMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const weekDayLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export default function JalaliCalendar({ value, onChange, onClose, max }) {
  const todayParts = getJalaliParts(todayGregorian());
  const maxParts = max ? getJalaliParts(max) : null;
  const selectedParts = value ? getJalaliParts(value) : null;
  const [viewYear, setViewYear] = useState(selectedParts?.jy || todayParts?.jy || 1404);
  const [viewMonth, setViewMonth] = useState(selectedParts?.jm || todayParts?.jm || 1);

  const daysInMonth = jalaliDaysInMonth(viewYear, viewMonth);
  const firstWeekday = jalaliFirstWeekday(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Is the given (jy, jm, day) strictly after max?
  const isAfterMax = (jy, jm, day) => {
    if (!maxParts) return false;
    if (jy > maxParts.jy) return true;
    if (jy < maxParts.jy) return false;
    if (jm > maxParts.jm) return true;
    if (jm < maxParts.jm) return false;
    return day > maxParts.jd;
  };

  // Can we navigate to next month? No if next month's first day is after max.
  const nextMonthAfterMax = (() => {
    if (!maxParts) return false;
    const nextJm = viewMonth === 12 ? 1 : viewMonth + 1;
    const nextJy = viewMonth === 12 ? viewYear + 1 : viewYear;
    return isAfterMax(nextJy, nextJm, 1);
  })();

  const selectDay = (day) => {
    if (isAfterMax(viewYear, viewMonth, day)) return;
    const greg = jalaliToGregorianStr(viewYear, viewMonth, day);
    if (greg) onChange(greg);
    onClose();
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg border border-border shadow-lg p-3 w-[280px]" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-muted rounded-md"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-sm font-medium">{jMonthNames[viewMonth - 1]} {toPersianDigits(viewYear)}</span>
        <button type="button" onClick={nextMonth} disabled={nextMonthAfterMax} className={`p-1 rounded-md ${nextMonthAfterMax ? 'opacity-30 cursor-not-allowed' : 'hover:bg-muted'}`}><ChevronLeft className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDayLabels.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const isSelected = selectedParts?.jy === viewYear && selectedParts?.jm === viewMonth && selectedParts?.jd === day;
          const isToday = todayParts?.jy === viewYear && todayParts?.jm === viewMonth && todayParts?.jd === day;
          const disabled = isAfterMax(viewYear, viewMonth, day);
          return (
            <button
              key={i}
              type="button"
              onClick={() => selectDay(day)}
              disabled={disabled}
              className={`w-9 h-9 rounded-lg text-sm transition-colors
                ${isSelected ? 'bg-[#B74B40] text-white font-medium' : 'hover:bg-muted text-foreground'}
                ${isToday && !isSelected ? 'ring-1 ring-[#B74B40] text-[#B74B40] font-medium' : ''}
                ${disabled ? 'opacity-30 cursor-not-allowed hover:bg-transparent' : ''}
              `}
            >
              {toPersianDigits(day)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
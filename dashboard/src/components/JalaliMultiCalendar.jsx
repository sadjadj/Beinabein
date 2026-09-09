import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { getJalaliParts, jalaliDaysInMonth, jalaliFirstWeekday, jalaliToGregorianStr, toPersianDigits } from '@/lib/jalali';

const jMonthNames = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const weekDayLabels = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

export default function JalaliMultiCalendar({ selectedDates = [], onToggle, onConfirm }) {
  const todayParts = getJalaliParts(new Date().toISOString().split('T')[0]);
  const [viewYear, setViewYear] = useState(todayParts?.jy || 1404);
  const [viewMonth, setViewMonth] = useState(todayParts?.jm || 1);

  const daysInMonth = jalaliDaysInMonth(viewYear, viewMonth);
  const firstWeekday = jalaliFirstWeekday(viewYear, viewMonth);
  const selectedSet = new Set(selectedDates);

  const prevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const toggleDay = (day) => {
    const greg = jalaliToGregorianStr(viewYear, viewMonth, day);
    if (!greg) return;
    if (selectedSet.has(greg)) {
      onToggle(selectedDates.filter(d => d !== greg));
    } else {
      onToggle([...selectedDates, greg].sort());
    }
  };

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white rounded-lg border border-border shadow-lg p-3 w-[300px]" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prevMonth} className="p-1 hover:bg-muted rounded-md"><ChevronRight className="w-4 h-4" /></button>
        <span className="text-sm font-medium">{jMonthNames[viewMonth - 1]} {toPersianDigits(viewYear)}</span>
        <button type="button" onClick={nextMonth} className="p-1 hover:bg-muted rounded-md"><ChevronLeft className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {weekDayLabels.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const greg = jalaliToGregorianStr(viewYear, viewMonth, day);
          const isSelected = selectedSet.has(greg);
          const isToday = todayParts?.jy === viewYear && todayParts?.jm === viewMonth && todayParts?.jd === day;
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(day)}
              className={`w-9 h-9 rounded-lg text-sm transition-colors flex items-center justify-center
                ${isSelected ? 'bg-[#B74B40] text-white font-medium' : 'hover:bg-muted text-foreground'}
                ${isToday && !isSelected ? 'ring-1 ring-[#B74B40] text-[#B74B40] font-medium' : ''}
              `}
            >
              {isSelected ? <Check className="w-4 h-4" /> : toPersianDigits(day)}
            </button>
          );
        })}
      </div>
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{toPersianDigits(selectedDates.length)} روز انتخاب شده</span>
        <button type="button" onClick={onConfirm} className="px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-xs font-medium hover:bg-[#A03D34]">
          تایید
        </button>
      </div>
    </div>
  );
}
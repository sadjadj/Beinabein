import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import { dayLabels, dayOrder } from '@/lib/labels';
import JalaliMultiCalendar from './JalaliMultiCalendar';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const jsDayToKey = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };

export default function WorkshopCalendarPicker({ selectedDates = [], onChange, isAdmin = true, attendanceByDate = {} }) {
  const [open, setOpen] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');
  const [pendingRemove, setPendingRemove] = useState(null);
  const ref = useRef(null);
  const sorted = [...selectedDates].sort();

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = (newDates) => {
    const oldSet = new Set(selectedDates);
    const newSet = new Set(newDates);
    const added = newDates.filter(d => !oldSet.has(d));
    const removed = selectedDates.filter(d => !newSet.has(d));
    const today = todayGregorian();

    for (const d of added) {
      if (d < today && !isAdmin) {
        setAlertMsg('افزودن جلسه در تاریخ گذشته فقط برای ادمین امکان‌پذیر است.');
        return;
      }
    }
    for (const d of removed) {
      if (d < today && !isAdmin) {
        setAlertMsg('حذف جلسه گذشته فقط برای ادمین امکان‌پذیر است.');
        return;
      }
      if ((attendanceByDate[d] || 0) > 0) {
        setPendingRemove({ date: d, newDates });
        return;
      }
    }
    onChange(newDates);
  };

  const removeDate = (date) => {
    handleToggle(selectedDates.filter(d => d !== date));
  };

  const confirmRemoveWithAttendance = () => {
    if (pendingRemove) {
      onChange(pendingRemove.newDates);
    }
    setPendingRemove(null);
  };

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
  dayNames.sort((a, b) => {
    const ka = Object.entries(dayLabels).find(([k, v]) => v === a)?.[0];
    const kb = Object.entries(dayLabels).find(([k, v]) => v === b)?.[0];
    return dayOrder.indexOf(ka) - dayOrder.indexOf(kb);
  });

  return (
    <div className="w-full" ref={ref}>
      <div className="relative">
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
              onToggle={handleToggle}
              onConfirm={() => setOpen(false)}
            />
          </div>
        )}
      </div>

      {alertMsg && (
        <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 flex items-center justify-between gap-2">
          <span>{alertMsg}</span>
          <button type="button" onClick={() => setAlertMsg('')} className="text-amber-700 hover:text-amber-900 flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {sorted.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground mb-2">جلسات انتخاب شده ({sorted.length}):</p>
          <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 sticky top-0">
                <tr>
                  <th className="text-right p-2 font-medium text-xs">نام جلسه</th>
                  <th className="text-right p-2 font-medium text-xs">تاریخ برگزاری</th>
                  <th className="text-center p-2 font-medium text-xs w-10"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((date, i) => {
                  const hasAttendance = (attendanceByDate[date] || 0) > 0;
                  return (
                    <tr key={date} className="border-t border-border">
                      <td className="p-2 text-xs font-medium">جلسه {i + 1}</td>
                      <td className="p-2 text-xs text-muted-foreground">
                        {toJalaliStr(date)}
                        {hasAttendance && <span className="text-[10px] text-[#B9834B] block">حضور و غیاب ثبت شده</span>}
                      </td>
                      <td className="p-2 text-center">
                        <button type="button" onClick={() => removeDate(date)} className="text-muted-foreground hover:text-red-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!pendingRemove} onOpenChange={(o) => { if (!o) setPendingRemove(null); }}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف جلسه دارای حضور و غیاب</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              برای تاریخ {pendingRemove ? toJalaliStr(pendingRemove.date) : ''} داده‌های حضور و غیاب ثبت شده است. با حذف این جلسه، تمام داده‌های حضور و غیاب آن نیز پاک خواهد شد. آیا مطمئن هستید؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveWithAttendance} className="bg-red-600 hover:bg-red-700 text-white mx-2">
              حذف جلسه
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
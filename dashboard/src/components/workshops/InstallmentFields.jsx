import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, Check, X } from 'lucide-react';
import JalaliMultiCalendar from '@/components/JalaliMultiCalendar';
import PriceInput from '@/components/PriceInput';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { formatJalali } from '@/lib/jalali';
import { paymentMethodLabels } from '@/lib/labels';
import { splitEvenly } from '@/lib/installments';

// Last day an instalment may fall due: the workshop's last session
export const lastSessionDate = (workshop) => [...(workshop?.session_dates || [])].sort().pop() || workshop?.end_date || '';

// «پرداخت قسطی» tick + per-person instalment rows for the two workshop
// registration forms. Renders nothing unless the workshop allows instalments.
// value = { on, rows: [{ due_date, amount }], firstPaid } (blankInstallmentForm).
// `compact` stacks each instalment in its own box for the narrow form on the workshop page.
export default function InstallmentFields({ value, onChange, total, workshop, method, onMethod, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!workshop?.allow_installments) return null;

  const amount = Number(total) || 0;
  const { rows } = value;
  const sum = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const paidNow = value.firstPaid && rows[0] ? Number(rows[0].amount) || 0 : 0;

  // The picked dates are the instalments: one row per date, split evenly
  const setDates = (dates) => {
    const parts = splitEvenly(amount, dates.length);
    onChange({ ...value, rows: dates.map((d, i) => ({ due_date: d, amount: parts[i] })) });
  };
  const setAmount = (i, v) => onChange({ ...value, rows: rows.map((r, idx) => (idx === i ? { ...r, amount: v } : r)) });

  return (
    <div className="space-y-3">
      <label className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border text-sm font-bold cursor-pointer ${value.on ? 'border-[#B74B40] bg-[#FDF2F1] text-[#8F342B]' : 'border-border text-muted-foreground'}`}>
        <input type="checkbox" checked={value.on} onChange={e => onChange({ ...value, on: e.target.checked })} className="w-4 h-4 accent-[#B74B40]" />
        پرداخت قسطی
      </label>

      {value.on && (
        <div className={`rounded-lg border border-border space-y-3 ${compact ? 'bg-white p-3' : 'bg-muted/30 p-4'}`}>
          <div className="flex flex-wrap items-end gap-2">
            <div className={`relative ${compact ? 'flex-1 min-w-[200px]' : 'w-72'}`} ref={ref}>
              <label className="text-xs text-muted-foreground block mb-1">سررسید اقساط</label>
              <button type="button" onClick={() => setOpen(!open)} className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border bg-background text-sm ${open ? 'border-[#B74B40]' : 'border-input'}`}>
                <CalendarIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className={rows.length ? 'text-foreground' : 'text-muted-foreground'}>
                  {rows.length ? `${toPersianNum(rows.length)} تاریخ انتخاب شده` : 'انتخاب تاریخ‌ها'}
                </span>
              </button>
              {open && (
                <div className="absolute z-50 top-full mt-1 right-0">
                  <JalaliMultiCalendar
                    selectedDates={rows.map(r => r.due_date)}
                    onToggle={setDates}
                    onConfirm={() => setOpen(false)}
                    max={lastSessionDate(workshop) || undefined}
                    markedDates={workshop.session_dates || []}
                  />
                </div>
              )}
            </div>
            <button type="button" onClick={() => setDates(rows.map(r => r.due_date))} disabled={rows.length === 0} className="px-3.5 py-2 rounded-lg border border-border bg-white text-xs disabled:opacity-50">
              تقسیم مساوی مبلغ
            </button>
          </div>

          {rows.map((r, i) => (
            <div key={r.due_date} className={compact
              ? `grid grid-cols-2 gap-2 p-2.5 rounded-lg border ${i === 0 && value.firstPaid ? 'border-[#B74B40]' : 'border-border'}`
              : 'grid grid-cols-[4rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.5fr)] gap-3 items-center'}>
              <div className={`text-sm font-medium ${compact ? 'col-span-2' : ''}`}>قسط {toPersianNum(i + 1)}</div>
              <div className="flex items-center justify-between gap-2 pr-3 pl-1 py-1 rounded-lg border border-input bg-background text-sm">
                <span>{formatJalali(r.due_date)}</span>
                <button type="button" onClick={() => setDates(rows.filter((_, idx) => idx !== i).map(x => x.due_date))} aria-label={`حذف قسط ${toPersianNum(i + 1)}`} className="p-1.5 text-muted-foreground hover:text-red-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="[&>input]:w-full">
                <PriceInput value={r.amount} onChange={v => setAmount(i, v)} placeholder="مبلغ قسط" />
              </div>
              {i === 0 ? (
                <div className={`flex flex-wrap items-center gap-2 ${compact ? 'col-span-2' : ''}`}>
                  <label className="flex items-center gap-2 text-sm font-medium text-[#8F342B] cursor-pointer">
                    <input type="checkbox" checked={value.firstPaid} onChange={e => onChange({ ...value, firstPaid: e.target.checked })} className="w-4 h-4 accent-[#B74B40]" />
                    همین حالا پرداخت شد
                  </label>
                  {value.firstPaid && (
                    <select value={method} onChange={e => onMethod(e.target.value)} aria-label="مدل پرداخت قسط اول" className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                      {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  )}
                </div>
              ) : !compact && (
                <div className="text-xs text-muted-foreground">پرداخت‌نشده</div>
              )}
            </div>
          ))}

          {rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 pt-3 border-t border-border text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span>جمع اقساط: <strong>{formatCurrency(sum)}</strong> از {formatCurrency(amount)}</span>
                {sum === amount ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700"><Check className="w-3.5 h-3.5" /> برابر با مبلغ کل</span>
                ) : (
                  <span className="text-xs font-medium text-red-600">برابر با مبلغ کل نیست</span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span>پرداختی امروز: <strong>{formatCurrency(paidNow)}</strong></span>
                <span>مانده: <strong>{formatCurrency(sum - paidNow)}</strong></span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

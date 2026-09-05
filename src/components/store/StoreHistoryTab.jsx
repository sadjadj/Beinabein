import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import JalaliDateInput from '@/components/JalaliDateInput';
import HistoryInvoiceList from '@/components/store/HistoryInvoiceList';
import { toPersianNum } from '@/lib/stats';
import { todayGregorian, getJalaliParts, jalaliMonthNames } from '@/lib/jalali';
import { getRangeStart } from '@/lib/reportUtils';
import { storeSourceFilters } from '@/lib/storeInvoices';

const PAGE_SIZE = 30;

export default function StoreHistoryTab({ groups }) {
  const [startDate, setStartDate] = useState(getRangeStart('month'));
  const [endDate, setEndDate] = useState(todayGregorian());
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(1);

  const onStartChange = (v) => {
    setStartDate(v); setPage(1);
    setDateError(v && endDate && v >= endDate ? '"از تاریخ" باید از "تا تاریخ" کوچکتر باشد' : '');
  };
  const onEndChange = (v) => {
    setEndDate(v); setPage(1);
    setDateError(v && startDate && v <= startDate ? '"تا تاریخ" باید بزرگتر از "از تاریخ" باشد' : '');
  };

  const filtered = useMemo(() => groups.filter(g =>
    g.purchase_date &&
    g.purchase_date >= startDate && g.purchase_date <= endDate &&
    (sourceFilter === 'all' || g.source === sourceFilter)
  ), [groups, startDate, endDate, sourceFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const monthName = jalaliMonthNames[getJalaliParts(todayGregorian()).jm - 1];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground mb-3">پیش‌فرض: از ابتدای ماه {monthName}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">از تاریخ</label>
            <JalaliDateInput value={startDate} onChange={onStartChange} showToday={false} max={todayGregorian()} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تا تاریخ</label>
            <JalaliDateInput value={endDate} onChange={onEndChange} showToday={true} max={todayGregorian()} />
          </div>
        </div>
        {dateError && <p className="text-xs text-red-600 mt-2">{dateError}</p>}
        <div className="flex items-center gap-2 flex-wrap mt-4">
          <span className="text-xs text-muted-foreground">بخش:</span>
          {storeSourceFilters.map(f => (
            <button
              key={f.key}
              onClick={() => { setSourceFilter(f.key); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${sourceFilter === f.key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">فاکتورهای بازه انتخاب شده ({toPersianNum(filtered.length)})</h3>
        </div>
        <HistoryInvoiceList groups={paginated} />
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحه {toPersianNum(safePage)} از {toPersianNum(totalPages)}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
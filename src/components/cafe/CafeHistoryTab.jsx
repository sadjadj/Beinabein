import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import JalaliDateInput from '@/components/JalaliDateInput';
import InvoiceList from '@/components/cafe/InvoiceList';
import ExportButton from '@/components/ExportButton';
import { toJalaliStr, toPersianDigits, todayGregorian } from '@/lib/jalali';
import { paymentMethodLabels } from '@/lib/labels';
import { toPersianNum } from '@/lib/stats';

const cafeExportColumns = [
  { key: 'date', label: 'تاریخ' },
  { key: 'invoice', label: 'شماره فاکتور' },
  { key: 'name', label: 'نام' },
  { key: 'phone', label: 'شماره' },
  { key: 'items', label: 'آیتم‌ها' },
  { key: 'count', label: 'تعداد آیتم' },
  { key: 'method', label: 'مدل پرداخت' },
  { key: 'status', label: 'وضعیت' },
  { key: 'total', label: 'مبلغ کل' },
];

const PAGE_SIZE = 30;

export default function CafeHistoryTab({ invoiceGroups, people, historyRange, setHistoryRange, monthName, onTogglePaid, onSaveEdit, onDelete }) {
  const [filters, setFilters] = useState({ paidStatus: 'all', customerName: '', paymentMethod: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const [rangeError, setRangeError] = useState('');

  const handleStartChange = (v) => {
    setHistoryRange({ ...historyRange, start: v });
    setCurrentPage(1);
    if (v && historyRange.end && v >= historyRange.end) setRangeError('"از تاریخ" باید از "تا تاریخ" کوچکتر باشد');
    else setRangeError('');
  };
  const handleEndChange = (v) => {
    setHistoryRange({ ...historyRange, end: v });
    setCurrentPage(1);
    if (v && historyRange.start && historyRange.start >= v) setRangeError('"از تاریخ" باید از "تا تاریخ" کوچکتر باشد');
    else setRangeError('');
  };

  const filteredGroups = useMemo(() => {
    return invoiceGroups.filter(g => {
      if (!g.purchase_date) return false;
      if (g.purchase_date < historyRange.start || g.purchase_date > historyRange.end) return false;
      if (filters.paidStatus === 'paid' && !g.is_paid) return false;
      if (filters.paidStatus === 'unpaid' && g.is_paid) return false;
      if (filters.customerName && !(g.person_name || '').includes(filters.customerName)) return false;
      if (filters.paymentMethod !== 'all' && g.payment_method !== filters.paymentMethod) return false;
      return true;
    });
  }, [invoiceGroups, historyRange, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedGroups = filteredGroups.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportRows = filteredGroups.map(g => ({
    date: g.purchase_date ? toJalaliStr(g.purchase_date) : '',
    invoice: g.invoiceId || '',
    name: g.person_name || '',
    phone: g.person_phone || '',
    items: g.items.map(i => `${i.item_name} ×${i.quantity}`).join('، '),
    count: g.itemCount,
    method: paymentMethodLabels[g.payment_method] || g.payment_method || '',
    status: g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده',
    total: g.totalAmount,
  }));

  const resetPage = () => setCurrentPage(1);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground mb-3">پیش‌فرض: از ابتدای ماه {monthName}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">از تاریخ</label>
            <JalaliDateInput value={historyRange.start} onChange={handleStartChange} showToday={false} maxDate={todayGregorian()} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تا تاریخ</label>
            <JalaliDateInput value={historyRange.end} onChange={handleEndChange} maxDate={todayGregorian()} />
          </div>
        </div>
        {rangeError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{rangeError}</div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">وضعیت پرداخت</label>
            <select value={filters.paidStatus} onChange={e => { setFilters({ ...filters, paidStatus: e.target.value }); resetPage(); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="all">همه</option>
              <option value="paid">پرداخت شده</option>
              <option value="unpaid">پرداخت‌نشده</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
            <input type="text" placeholder="جستجو نام..." value={filters.customerName} onChange={e => { setFilters({ ...filters, customerName: e.target.value }); resetPage(); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
            <select value={filters.paymentMethod} onChange={e => { setFilters({ ...filters, paymentMethod: e.target.value }); resetPage(); }} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="all">همه</option>
              {Object.entries(paymentMethodLabels).filter(([k]) => k !== 'azno').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورهای بازه انتخاب شده ({toPersianNum(filteredGroups.length)})</h3>
          {filteredGroups.length > 0 && <ExportButton filename="فاکتورهای-کافه-تاریخچه" columns={cafeExportColumns} rows={exportRows} />}
        </div>
        <InvoiceList
          groups={paginatedGroups}
          people={people}
          onTogglePaid={onTogglePaid}
          onSaveEdit={onSaveEdit}
          onDelete={onDelete}
          emptyMessage="در این بازه فاکتوری ثبت نشده است"
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">
              صفحه {toPersianNum(safePage)} از {toPersianNum(totalPages)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
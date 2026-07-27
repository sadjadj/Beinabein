import React from 'react';
import JalaliDateInput from '@/components/JalaliDateInput';
import InvoiceList from '@/components/cafe/InvoiceList';
import ExportButton from '@/components/ExportButton';
import { toJalaliStr } from '@/lib/jalali';
import { paymentMethodLabels } from '@/lib/labels';

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

export default function CafeHistoryTab({ invoiceGroups, people, historyRange, setHistoryRange, monthName, onTogglePaid, onSaveEdit, onDelete }) {
  const filteredGroups = invoiceGroups.filter(g => {
    if (!g.purchase_date) return false;
    return g.purchase_date >= historyRange.start && g.purchase_date <= historyRange.end;
  });

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

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4">
        <p className="text-xs text-muted-foreground mb-3">پیش‌فرض: از ابتدای ماه {monthName}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">از تاریخ</label>
            <JalaliDateInput value={historyRange.start} onChange={v => setHistoryRange({ ...historyRange, start: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تا تاریخ</label>
            <JalaliDateInput value={historyRange.end} onChange={v => setHistoryRange({ ...historyRange, end: v })} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورهای تاریخچه</h3>
          {filteredGroups.length > 0 && <ExportButton filename="فاکتورهای-کافه-تاریخچه" columns={cafeExportColumns} rows={exportRows} />}
        </div>
        <InvoiceList
          groups={filteredGroups}
          people={people}
          onTogglePaid={onTogglePaid}
          onSaveEdit={onSaveEdit}
          onDelete={onDelete}
          emptyMessage="در این بازه فاکتوری ثبت نشده است"
        />
      </div>
    </div>
  );
}
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function StoreInvoiceList({ groups, onTogglePaid, onDelete, emptyMessage = 'امروز فروشی ثبت نشده است' }) {
  const [expanded, setExpanded] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const getGroupKey = (g) => g.invoiceId || `no-inv-${g.items[0]?.id}`;

  const confirmDelete = async () => { if (deleteTarget) { await onDelete(deleteTarget); setDeleteTarget(null); } };

  if (groups.length === 0) return <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>;

  return (
    <>
      <div className="divide-y divide-border">
        {groups.map((group) => {
          const key = getGroupKey(group);
          const isExpanded = expanded === key;
          return (
            <div key={key} className="p-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-3 text-sm">
                  <button onClick={() => setExpanded(isExpanded ? null : key)} className="text-muted-foreground hover:text-foreground">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{group.purchase_date ? toJalaliStr(group.purchase_date) : '-'}</span>
                  <span className="font-medium">{group.person_name || '-'}</span>
                  <span className="text-xs text-muted-foreground">{toPersianNum(group.itemCount)} آیتم</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{paymentMethodLabels[group.payment_method] || group.payment_method}</span>
                  <button onClick={() => onTogglePaid(group)} className={`text-xs ${group.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{group.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</button>
                  <span className="font-medium text-sm">{formatCurrency(group.totalAmount)}</span>
                  <button onClick={() => setDeleteTarget(group)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {isExpanded && (
                <div className="mt-2 pr-8 space-y-1">
                  {group.items.map((it) => (
                    <div key={it.id} className="flex items-center justify-between text-xs text-muted-foreground py-1">
                      <span>{it.item_name} ×{toPersianNum(it.quantity)}{it.discount ? ` (${toPersianNum(it.discount)}٪ تخفیف)` : ''}</span>
                      <span>{formatCurrency((it.item_price || 0) * (it.quantity || 1) * (1 - (it.discount || 0) / 100))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف فاکتور</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف این فاکتور اطمینان دارید؟ موجودی آیتم‌ها به استور بازگردانده می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
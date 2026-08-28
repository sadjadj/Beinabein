import React from 'react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { toJalaliStr } from '@/lib/jalali';

export default function ShopSaleList({ groups, onTogglePaid, emptyMessage = 'فروشی ثبت نشده است' }) {
  if (groups.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">{emptyMessage}</div>;
  }
  return (
    <div className="divide-y divide-border">
      {groups.map(g => (
        <div key={g.invoiceId || `${g.buyer_phone}-${g.sale_date}`} className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-sm font-medium">{g.buyer_name || '-'}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">{g.buyer_phone} — {g.sale_date ? toJalaliStr(g.sale_date) : '-'}</p>
            </div>
            <div className="text-left flex items-center gap-3">
              <span className="text-sm font-bold text-[#B74B40]">{formatCurrency(g.totalAmount)}</span>
              {onTogglePaid ? (
                <button
                  onClick={() => onTogglePaid(g)}
                  className={`text-xs font-medium px-2 py-1 rounded ${g.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}
                >
                  {g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                </button>
              ) : (
                <span className={`text-xs font-medium px-2 py-1 rounded ${g.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}>
                  {g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                </span>
              )}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {g.items.map((it, idx) => (
              <span key={idx} className="text-xs bg-muted/40 px-2 py-1 rounded">{it.item_name} ×{toPersianNum(it.quantity)}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
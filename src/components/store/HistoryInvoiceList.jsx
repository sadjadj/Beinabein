import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';
import { storeSourceLabels } from '@/lib/storeInvoices';

export default function HistoryInvoiceList({ groups, emptyMessage = 'در این بازه فاکتوری ثبت نشده است' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(null);

  if (groups.length === 0) return <div className="p-8 text-center text-muted-foreground">{emptyMessage}</div>;

  return (
    <div className="divide-y divide-border">
      {groups.map(g => {
        const isExpanded = expanded === g.key;
        return (
          <div key={g.key} className="p-3">
            <div
              className="flex items-center justify-between gap-2 flex-wrap cursor-pointer hover:bg-muted/30"
              onClick={() => navigate(`/accounting/${g.invoiceType}/${g.items[0].id}`, { state: { from: location.pathname } })}
            >
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(isExpanded ? null : g.key); }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{g.purchase_date ? toJalaliStr(g.purchase_date) : '-'}</span>
                <span className="font-medium">{g.person_name || '-'}</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{storeSourceLabels[g.source]}</span>
                {g.event_title && <span className="text-xs text-[#B9834B]">— {g.event_title}</span>}
                <span className="text-xs text-muted-foreground">{toPersianNum(g.itemCount)} آیتم</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{paymentMethodLabels[g.payment_method] || g.payment_method}</span>
                <span className={`text-xs ${g.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{g.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}</span>
                <span className="font-medium text-sm">{formatCurrency(g.totalAmount)}</span>
              </div>
            </div>
            {isExpanded && (
              <div className="mt-2 pr-8 space-y-1">
                {g.items.map(it => (
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
  );
}
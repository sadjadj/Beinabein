import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import JalaliDateInput from '@/components/JalaliDateInput';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { formatJalaliShort, todayGregorian } from '@/lib/jalali';
import { paymentMethodLabels } from '@/lib/labels';
import { installmentStatus, paidCount, withInstallmentPaid, daysBetween } from '@/lib/installments';

const chipStyles = {
  paid: 'border border-green-200 bg-green-50 text-green-800',
  overdue: 'border border-[#B74B40] bg-[#B74B40] text-white',
  due_today: 'border border-[#F5C9C3] bg-[#FDF2F1] text-[#8F342B]',
  upcoming: 'border border-neutral-300 bg-white text-neutral-700',
};

// «قسطی — X از Y پرداخت شده» link to the follow-up tab. Shown wherever a
// registration would otherwise have the paid/unpaid toggle, so is_paid can't be
// flipped by hand out of sync with the instalments.
export function InstallmentPill({ purchase }) {
  const settled = paidCount(purchase) === purchase.installments.length;
  return (
    <Link to="/finance?tab=installments" onClick={e => e.stopPropagation()} className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${settled ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' : 'bg-[#FBF3EC] border-[#E8D5C0] text-[#7A4F1F] hover:bg-[#F6E9DC]'}`}>
      قسطی — {toPersianNum(paidCount(purchase))} از {toPersianNum(purchase.installments.length)} پرداخت شده
    </Link>
  );
}

// One chip per instalment of a registration; clicking one selects it (the
// parent renders <InstallmentPayForm> for the selected index).
export default function InstallmentChips({ purchase, selected, onSelect }) {
  const today = todayGregorian();
  return (
    <div className="flex flex-wrap gap-2">
      {purchase.installments.map((inst, i) => {
        const status = installmentStatus(inst, today);
        const isSelected = selected === i;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : i); }}
            aria-pressed={isSelected}
            className={`px-3 py-1.5 rounded-lg text-xs text-right ${chipStyles[status]} ${isSelected ? 'ring-2 ring-[#B74B40] ring-offset-1' : ''}`}
          >
            <span className="block font-bold">{toPersianNum(inst.amount)} · سررسید {formatJalaliShort(inst.due_date)}</span>
            <span className="block">
              {status === 'paid' && `✓ پرداخت شد — ${formatJalaliShort(inst.paid_date)}، ${paymentMethodLabels[inst.payment_method] || ''}`}
              {status === 'due_today' && 'پرداخت‌نشده — امروز'}
              {status === 'overdue' && `پرداخت‌نشده — ${toPersianNum(daysBetween(inst.due_date, today))} روز گذشته`}
              {status === 'upcoming' && 'پرداخت‌نشده'}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Records the payment of one instalment (or undoes it, for a paid one).
// ponytail: writes the whole installments array back, so two admins saving the
// same registration at the same moment = last write wins. Move instalments to
// their own rows if that ever bites.
export function InstallmentPayForm({ purchase, index, onSaved, onCancel }) {
  const inst = purchase.installments[index];
  const [date, setDate] = useState(todayGregorian());
  const [method, setMethod] = useState('card_to_card');
  const [saving, setSaving] = useState(false);

  const save = async (payment) => {
    setSaving(true);
    try {
      const patch = withInstallmentPaid(purchase, index, payment);
      await base44.entities.WorkshopPurchase.update(purchase.id, patch);
      window.dispatchEvent(new Event('installments-changed'));
      onSaved({ ...purchase, ...patch });
    } finally { setSaving(false); }
  };

  return (
    <div className="p-4 bg-white border border-border rounded-lg space-y-3 cursor-default" onClick={e => e.stopPropagation()}>
      <div className="text-sm font-bold">
        {inst.paid_date ? 'قسط' : 'ثبت پرداخت قسط'} {toPersianNum(index + 1)} — {purchase.person_name}
      </div>
      {inst.paid_date ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {formatCurrency(inst.amount)} در {formatJalaliShort(inst.paid_date)} پرداخت شده ({paymentMethodLabels[inst.payment_method] || '-'})
          </span>
          <button type="button" onClick={() => save(null)} disabled={saving} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 disabled:opacity-50">
            لغو پرداخت
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
        </div>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44">
            <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان)</label>
            <input type="text" value={Number(inst.amount).toLocaleString('en-US')} disabled dir="ltr" className="w-full px-3 py-2 rounded-lg border border-input bg-muted/50 text-sm text-right text-muted-foreground" />
          </div>
          <div className="w-56">
            <label className="text-xs text-muted-foreground block mb-1">تاریخ پرداخت</label>
            <JalaliDateInput value={date} onChange={setDate} max={todayGregorian()} />
          </div>
          <div className="w-44">
            <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
            <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <button type="button" onClick={() => save({ paid_date: date, payment_method: method })} disabled={saving || !date} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {saving ? 'در حال ثبت...' : 'ثبت پرداخت'}
          </button>
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
        </div>
      )}
    </div>
  );
}

import React from 'react';
import JalaliDateInput from '@/components/JalaliDateInput';
import { todayGregorian } from '@/lib/jalali';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';

export default function PurchaseEditForm({ form, setForm, onSave, onCancel, saving, showHowMet = false }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">تاریخ خرید</label>
        <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} showToday={false} max={todayGregorian()} />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
        <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {showHowMet && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
          <select value={form.how_met || 'other'} onChange={e => setForm({ ...form, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm pb-2.5">
        <input type="checkbox" checked={!!form.is_paid} onChange={e => setForm({ ...form, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
      </label>
      <div className="flex items-center gap-2 sm:col-span-2 lg:col-span-4">
        <button onClick={onSave} disabled={saving} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
          {saving ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
      </div>
    </div>
  );
}
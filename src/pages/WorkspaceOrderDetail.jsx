import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Check, Trash2 } from 'lucide-react';
import { findOrCreatePerson, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';
import FloatingDateInput from '@/components/FloatingDateInput';
import PersonSearch from '@/components/PersonSearch';

export default function WorkspaceOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [o, subs] = await Promise.all([
        base44.entities.WorkspaceOrder.get(id),
        base44.entities.WorkspaceSubscription.list('-created_date', 100)
      ]);
      setOrder(o);
      setSubscriptions(subs);
      setForm({ ...o, how_met: o.how_met || '' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await findOrCreatePerson(form.person_phone, form.person_name);
      const sub = subscriptions.find(s => s.id === form.subscription_id);
      await base44.entities.WorkspaceOrder.update(id, {
        ...form,
        subscription_name: sub?.name || form.subscription_name,
        price: sub?.price || form.price,
        quantity: Number(form.quantity) || 1,
        how_met: form.how_met || 'other'
      });
      fetchData();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await base44.entities.WorkspaceOrder.delete(id);
    navigate('/workspace');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!order) return <div className="p-6 text-center text-muted-foreground">سفارشی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <button onClick={() => navigate('/workspace')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فضای کار
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <h1 className="text-xl font-bold mb-1">ویرایش سفارش</h1>
        <p className="text-sm text-muted-foreground mb-6">{toJalaliStr(order.purchase_date)} • {order.subscription_name || '-'}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
            <PersonSearch
              personName={form.person_name || ''}
              personPhone={form.person_phone || ''}
              onNameChange={v => setForm({ ...form, person_name: v })}
              onPhoneChange={v => setForm({ ...form, person_phone: v })}
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل اشتراک</label>
            <select value={form.subscription_id || ''} onChange={e => setForm({ ...form, subscription_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">انتخاب اشتراک...</option>
              {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
            <input type="number" value={form.quantity || 1} onChange={e => setForm({ ...form, quantity: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ خرید</label>
            <FloatingDateInput value={form.purchase_date || ''} onChange={v => setForm({ ...form, purchase_date: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تاریخ استفاده</label>
            <FloatingDateInput value={form.usage_date || ''} onChange={v => setForm({ ...form, usage_date: v })} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">زمان ورود</label>
            <input type="time" value={form.entry_time || ''} onChange={e => setForm({ ...form, entry_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
            <select value={form.payment_method || 'cash'} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">مدل آشنایی</label>
            <select value={form.how_met || ''} onChange={e => setForm({ ...form, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">انتخاب...</option>
              {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">وضعیت پرداخت</label>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_paid: !form.is_paid })}
              className={`w-full px-3 py-2 rounded-lg border text-sm font-medium ${form.is_paid ? 'border-green-500 text-green-600 bg-green-50' : 'border-[#E8D5C0] text-[#B9834B] bg-[#FBF3EC]'}`}
            >
              {form.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button onClick={handleDelete} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
            <Trash2 className="w-4 h-4" /> حذف سفارش
          </button>
          <div className="flex gap-2">
            <button onClick={() => navigate('/workspace')} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              <Check className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
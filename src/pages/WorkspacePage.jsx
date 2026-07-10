import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Briefcase, Users, Repeat, Plus, Pencil, Check, X } from 'lucide-react';
import { computeWorkspaceStats, findOrCreatePerson, toPersianNum, formatCurrency } from '@/lib/stats';
import { itemTypeLabels, paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function WorkspacePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ item_type: 'daily_chair', price: '', person_name: '', person_phone: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', entry_time: '', usage_date: todayGregorian(), how_met: 'other' });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.WorkspaceOrder.list('-purchase_date', 200);
      setRecords(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.person_phone || !form.purchase_date) return;
    setSubmitting(true); setMessage(null);
    try {
      await findOrCreatePerson(form.person_phone, form.person_name);
      await base44.entities.WorkspaceOrder.create({
        ...form, price: Number(form.price) || 0, quantity: Number(form.quantity) || 1,
        entry_time: form.entry_time || nowTime()
      });
      setMessage({ type: 'success', text: 'سفارش ثبت شد' });
      setForm({ item_type: 'daily_chair', price: '', person_name: '', person_phone: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', entry_time: '', usage_date: todayGregorian(), how_met: 'other' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const startEdit = (r) => {
    setEditingId(r.id);
    setEditForm({ ...r });
  };

  const saveEdit = async () => {
    await base44.entities.WorkspaceOrder.update(editingId, {
      ...editForm, price: Number(editForm.price) || 0, quantity: Number(editForm.quantity) || 1
    });
    setEditingId(null);
    fetchData();
  };

  const togglePaid = async (r) => {
    await base44.entities.WorkspaceOrder.update(r.id, { is_paid: !r.is_paid });
    fetchData();
  };

  const stats = computeWorkspaceStats(records, null);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فضای کار</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت سفارش و گزارش فضای کار</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="مجموع سفارش‌ها" value={toPersianNum(stats.totalOrders)} icon={Briefcase} color="terracotta" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="teal" />
        <StatCard label="افراد تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="ochre" />
        <StatCard label="درآمد کل" value={formatCurrency(stats.totalRevenue)} icon={Briefcase} color="pink" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت سفارش جدید</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select value={form.item_type} onChange={e => setForm({ ...form, item_type: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(itemTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" placeholder="قیمت (تومان)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="text" placeholder="نام مشتری" value={form.person_name} onChange={e => setForm({ ...form, person_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="tel" placeholder="شماره تلفن" value={form.person_phone} onChange={e => setForm({ ...form, person_phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="number" placeholder="تعداد" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <JalaliDateInput value={form.purchase_date} onChange={v => setForm({ ...form, purchase_date: v })} required />
          <input type="time" value={form.entry_time} onChange={e => setForm({ ...form, entry_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <JalaliDateInput value={form.usage_date} onChange={v => setForm({ ...form, usage_date: v })} />
          <div className="sm:col-span-2 lg:col-span-4 flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت'}
            </button>
            {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">سفارش‌های اخیر</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز سفارشی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">نوع</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">ورود</th>
                  <th className="text-right p-3 font-medium">پرداخت</th>
                  <th className="text-right p-3 font-medium">قیمت</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                  <th className="text-center p-3 font-medium">ویرایش</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <React.Fragment key={r.id}>
                    <tr className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">{toJalaliStr(r.purchase_date)}</td>
                      <td className="p-3">{itemTypeLabels[r.item_type] || r.item_type}</td>
                      <td className="p-3">{r.person_name || '-'}</td>
                      <td className="p-3 text-muted-foreground">{r.person_phone}</td>
                      <td className="p-3">{r.entry_time || '-'}</td>
                      <td className="p-3 text-xs">{paymentMethodLabels[r.payment_method] || r.payment_method}</td>
                      <td className="p-3">{formatCurrency(r.price)}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => togglePaid(r)} className={`text-xs ${r.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                          {r.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => startEdit(r)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    {editingId === r.id && (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={9} className="p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            <select value={editForm.item_type} onChange={e => setEditForm({ ...editForm, item_type: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                              {Object.entries(itemTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <input type="number" placeholder="قیمت" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                            <input type="text" placeholder="نام" value={editForm.person_name} onChange={e => setEditForm({ ...editForm, person_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                            <input type="tel" placeholder="شماره" value={editForm.person_phone} onChange={e => setEditForm({ ...editForm, person_phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                            <input type="time" value={editForm.entry_time || ''} onChange={e => setEditForm({ ...editForm, entry_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                            <select value={editForm.payment_method} onChange={e => setEditForm({ ...editForm, payment_method: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <select value={editForm.how_met} onChange={e => setEditForm({ ...editForm, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                              {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                            <JalaliDateInput value={editForm.usage_date} onChange={v => setEditForm({ ...editForm, usage_date: v })} />
                            <div className="flex gap-2">
                              <button onClick={saveEdit} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-[#B74B40] text-white text-sm"><Check className="w-4 h-4" /> ذخیره</button>
                              <button onClick={() => setEditingId(null)} className="px-3 py-2 rounded-lg border border-border text-sm"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
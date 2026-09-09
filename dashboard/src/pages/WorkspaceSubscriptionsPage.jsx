import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, ArrowRight } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';

export default function WorkspaceSubscriptionsPage() {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subForm, setSubForm] = useState({ name: '', price: '', subscription_days: '' });
  const [editingSubId, setEditingSubId] = useState(null);
  const [editSubForm, setEditSubForm] = useState({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const subs = await base44.entities.WorkspaceSubscription.list('-created_date', 100);
      setSubscriptions(subs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubSubmit = async (e) => {
    e.preventDefault();
    const activeForm = editingSubId ? editSubForm : subForm;
    if (!activeForm.name) return;
    setSubmitting(true);
    try {
      if (editingSubId) {
        await base44.entities.WorkspaceSubscription.update(editingSubId, {
          name: editSubForm.name,
          price: Number(editSubForm.price) || 0,
          subscription_days: Number(editSubForm.subscription_days) || 1
        });
        setEditingSubId(null);
        setEditSubForm({});
      } else {
        await base44.entities.WorkspaceSubscription.create({
          name: subForm.name,
          price: Number(subForm.price) || 0,
          subscription_days: Number(subForm.subscription_days) || 1
        });
        setSubForm({ name: '', price: '', subscription_days: '' });
      }
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEditSub = (s) => {
    setEditingSubId(s.id);
    setEditSubForm({ name: s.name, price: s.price, subscription_days: s.subscription_days ?? '' });
  };

  const deleteSub = async (id) => {
    await base44.entities.WorkspaceSubscription.delete(id);
    fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/workspace')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فضای کار
      </button>

      <div>
        <h1 className="text-2xl font-bold">انواع اشتراک‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت اشتراک‌های تعریف‌شده برای فضای کار</p>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> {editingSubId ? 'ویرایش اشتراک' : 'افزودن اشتراک جدید'}</h3>
            <form onSubmit={handleSubSubmit} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام اشتراک</label>
                <input type="text" placeholder="مثلاً صندلی روزانه" value={editingSubId ? editSubForm.name : subForm.name} onChange={e => editingSubId ? setEditSubForm({ ...editSubForm, name: e.target.value }) : setSubForm({ ...subForm, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
                <PriceInput value={editingSubId ? editSubForm.price : subForm.price} onChange={v => editingSubId ? setEditSubForm({ ...editSubForm, price: v }) : setSubForm({ ...subForm, price: v })} required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تعداد روزهای اشتراک</label>
                <PersianNumberInput value={editingSubId ? editSubForm.subscription_days : subForm.subscription_days} onChange={v => editingSubId ? setEditSubForm({ ...editSubForm, subscription_days: v }) : setSubForm({ ...subForm, subscription_days: v })} placeholder="مثلاً ۱" className="w-28 px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" required />
              </div>
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : editingSubId ? 'ذخیره' : 'افزودن'}
              </button>
              {editingSubId && <button type="button" onClick={() => setEditingSubId(null)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>}
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">اشتراک‌های تعریف شده ({toPersianNum(subscriptions.length)})</h3></div>
            {subscriptions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">هنوز اشتراکی ثبت نشده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-right p-3 font-medium">نام اشتراک</th>
                      <th className="text-right p-3 font-medium">قیمت</th>
                      <th className="text-right p-3 font-medium">تعداد روزهای اشتراک</th>
                      <th className="text-center p-3 font-medium">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map(s => (
                      <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                        <td className="p-3 font-medium">{s.name}</td>
                        <td className="p-3">{formatCurrency(s.price)}</td>
                        <td className="p-3">{s.subscription_days ? toPersianNum(s.subscription_days) : toPersianNum(1)}</td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => startEditSub(s)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => deleteSub(s.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
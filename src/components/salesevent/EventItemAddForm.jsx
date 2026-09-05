import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil } from 'lucide-react';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';

export default function EventItemAddForm({ eventId, eventTitle, categories, onAdd }) {
  const [form, setForm] = useState({ name: '', category: '', add_quantity: '', price: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.category || form.add_quantity === '' || form.price === '' || form.price === null || form.price === undefined) return;
    setSubmitting(true);
    try {
      await onAdd(form);
      setForm({ name: '', category: '', add_quantity: '', price: '' });
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> افزودن آیتم جدید برای ایونت {eventTitle}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">نام آیتم</label>
          <input type="text" placeholder="نام آیتم" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">کتگوری</label>
            <Link to={`/store/event-categories/${eventId}`} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
              <Pencil className="w-3 h-3" /> ویرایش کتگوری
            </Link>
          </div>
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
            <option value="">کتگوری...</option>
            {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">تعداد افزایش</label>
          <PersianNumberInput value={form.add_quantity} onChange={v => setForm({ ...form, add_quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" required />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
          <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} required />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : 'افزودن'}
          </button>
        </div>
      </form>
    </div>
  );
}
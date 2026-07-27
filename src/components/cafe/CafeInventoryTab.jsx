import React, { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import PriceInput from '@/components/PriceInput';

export default function CafeInventoryTab({ items, categories, onItemSubmit, onDeleteItem }) {
  const [itemForm, setItemForm] = useState({ name: '', category: '', price: '', brand: '' });
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItemForm, setEditItemForm] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = editingItemId ? editItemForm : itemForm;
    if (!form.name || form.price === '' || form.price === null || form.price === undefined) return;
    setSubmitting(true);
    try {
      await onItemSubmit(form, editingItemId);
      if (editingItemId) {
        setEditingItemId(null);
        setEditItemForm({});
      } else {
        setItemForm({ name: '', category: '', price: '', brand: '' });
      }
    } finally { setSubmitting(false); }
  };

  const startEdit = (item) => {
    setEditingItemId(item.id);
    setEditItemForm({ ...item });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> {editingItemId ? 'ویرایش آیتم' : 'افزودن آیتم جدید'}</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">اسم آیتم</label>
            <input type="text" placeholder="اسم آیتم" value={editingItemId ? editItemForm.name : itemForm.name} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, name: e.target.value }) : setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">کتگوری</label>
            <select value={editingItemId ? editItemForm.category : itemForm.category} onChange={e => editingItemId ? setEditItemForm({ ...editItemForm, category: e.target.value }) : setItemForm({ ...itemForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">کتگوری...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
            <PriceInput value={editingItemId ? editItemForm.price : itemForm.price} onChange={v => editingItemId ? setEditItemForm({ ...editItemForm, price: v }) : setItemForm({ ...itemForm, price: v })} required />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : editingItemId ? 'ذخیره' : 'افزودن'}
            </button>
            {editingItemId && <button type="button" onClick={() => { setEditingItemId(null); setEditItemForm({}); }} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">آیتم‌های انبار ({toPersianNum(items.length)})</h3></div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز آیتمی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">اسم</th>
                  <th className="text-right p-3 font-medium">کتگوری</th>
                  <th className="text-right p-3 font-medium">قیمت</th>
                  <th className="text-right p-3 font-medium">برند</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{item.name}</td>
                    <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                    <td className="p-3">{formatCurrency(item.price)}</td>
                    <td className="p-3">{item.brand || '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteItem(item.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
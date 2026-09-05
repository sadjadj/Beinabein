import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function StoreInventoryTab({ items, categories, onItemSubmit, onDeleteItem, onToggleVisible, onEditCategories, sectionName = 'استور', showBrand = true }) {
  const [itemForm, setItemForm] = useState({ name: '', category: '', add_quantity: '', price: '' });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const confirmDelete = async () => { if (deleteTarget) { await onDeleteItem(deleteTarget); setDeleteTarget(null); } };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!itemForm.name || !itemForm.category || itemForm.add_quantity === '' || itemForm.price === '' || itemForm.price === null || itemForm.price === undefined) return;
    setSubmitting(true);
    try { await onItemSubmit(itemForm, null); setItemForm({ name: '', category: '', add_quantity: '', price: '' }); } finally { setSubmitting(false); }
  };

  const startEdit = (item) => { setEditingId(item.id); setEditForm({ ...item, stock_quantity: item.stock_quantity || 0 }); };
  const cancelEdit = () => { setEditingId(null); setEditForm({}); };
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name || editForm.price === '' || editForm.price === null || editForm.price === undefined) return;
    setSubmitting(true);
    try { await onItemSubmit(editForm, editingId); cancelEdit(); } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> افزودن آیتم جدید برای {sectionName}</h3>
        <form onSubmit={handleAddSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام آیتم</label>
            <input type="text" placeholder="نام آیتم" value={itemForm.name} onChange={e => setItemForm({ ...itemForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-muted-foreground">کتگوری</label>
              <button type="button" onClick={onEditCategories} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
                <Pencil className="w-3 h-3" /> ویرایش کتگوری
              </button>
            </div>
            <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
              <option value="">کتگوری...</option>
              {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تعداد افزایش</label>
            <PersianNumberInput value={itemForm.add_quantity} onChange={v => setItemForm({ ...itemForm, add_quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
            <PriceInput value={itemForm.price} onChange={v => setItemForm({ ...itemForm, price: v })} required />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'افزودن'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">فهرست آیتم‌های {sectionName} ({toPersianNum(items.length)})</h3></div>
        {items.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز آیتمی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام آیتم</th>
                  <th className="text-right p-3 font-medium">کتگوری</th>
                  <th className="text-right p-3 font-medium">قیمت به تومان</th>
                  {showBrand && <th className="text-right p-3 font-medium">برند</th>}
                  <th className="text-center p-3 font-medium">تعداد باقی مانده</th>
                  <th className="text-center p-3 font-medium">نمایش</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="border-t border-border hover:bg-muted/30">
                      <td className="p-3 font-medium">{item.name}</td>
                      <td className="p-3 text-muted-foreground">{item.category || '-'}</td>
                      <td className="p-3">{formatCurrency(item.price)}</td>
                      {showBrand && <td className="p-3">{item.brand || '-'}</td>}
                      <td className="p-3 text-center">{toPersianNum(item.stock_quantity || 0)}</td>
                      <td className="p-3 text-center">
                        <input type="checkbox" checked={item.is_visible !== false} onChange={() => onToggleVisible(item.id, item.is_visible !== false)} className="w-4 h-4 cursor-pointer" />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => startEdit(item)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeleteTarget(item)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    {editingId === item.id && (
                      <tr className="border-t border-border bg-muted/20">
                        <td colSpan={showBrand ? 7 : 6} className="p-4">
                          <form onSubmit={saveEdit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">نام آیتم</label>
                              <input type="text" value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">کتگوری</label>
                              <select value={editForm.category || ''} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                                <option value="">کتگوری...</option>
                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
                              <PriceInput value={editForm.price} onChange={v => setEditForm({ ...editForm, price: v })} required />
                            </div>
                            {showBrand && (
                              <div>
                                <label className="text-xs text-muted-foreground block mb-1">برند</label>
                                <input type="text" value={editForm.brand || ''} onChange={e => setEditForm({ ...editForm, brand: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                              </div>
                            )}
                            <div>
                              <label className="text-xs text-muted-foreground block mb-1">موجودی</label>
                              <PersianNumberInput value={editForm.stock_quantity || 0} onChange={v => setEditForm({ ...editForm, stock_quantity: v })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-5 flex gap-2">
                              <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                                <Check className="w-4 h-4" /> {submitting ? 'در حال ذخیره...' : 'ذخیره'}
                              </button>
                              <button type="button" onClick={cancelEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted">
                                <X className="w-4 h-4" /> انصراف
                              </button>
                            </div>
                          </form>
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف آیتم</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف این آیتم اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
import React, { useState } from 'react';
import { FolderPlus, Pencil, Trash2, Check, X } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

export default function StoreCategoryTab({ categories, onCategorySubmit, onUpdateCategory, onDeleteCategory }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try { await onCategorySubmit(name); setName(''); } finally { setSubmitting(false); }
  };
  const startEdit = (c) => { setEditingId(c.id); setEditName(c.name); };
  const saveEdit = async (c) => { if (editName) { await onUpdateCategory(c.id, editName); setEditingId(null); } };
  const confirmDelete = async () => { if (deleteTarget) { await onDeleteCategory(deleteTarget); setDeleteTarget(null); } };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <form onSubmit={handleAdd} className="flex items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام کتگوری</label>
            <input type="text" placeholder="مثلاً کتاب" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
          </div>
          <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            <FolderPlus className="w-4 h-4" /> افزودن
          </button>
        </form>
      </div>
      {categories.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">هنوز کتگوری ثبت نشده است</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">نام کتگوری</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">
                    {editingId === c.id ? (
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="px-2 py-1 rounded-lg border border-input bg-background text-sm w-48" autoFocus />
                    ) : c.name}
                  </td>
                  <td className="p-3 text-center">
                    {editingId === c.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => saveEdit(c)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(c)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(c)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف کتگوری</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">آیا از حذف این کتگوری اطمینان دارید؟</AlertDialogDescription>
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
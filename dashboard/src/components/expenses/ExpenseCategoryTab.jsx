import React, { useState } from 'react';
import { FolderPlus, Trash2, Pencil, Check, X } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip';

// Same layout as CafeCategoryTab, plus rename and an in-use guard: expenses
// store the category id, so a used category can't be deleted (the API
// enforces this too) but can be renamed freely.
export default function ExpenseCategoryTab({ categories, usage, onCategorySubmit, onRenameCategory, onDeleteCategory }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCategorySubmit(name.trim());
      setName('');
    } finally { setSubmitting(false); }
  };

  const saveRename = async () => {
    if (!editName.trim()) return;
    await onRenameCategory(editId, editName.trim());
    setEditId(null);
  };

  return (
    <TooltipProvider delayDuration={0}>
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام دسته‌بندی</label>
            <input type="text" placeholder="مثلاً حمل و نقل" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
          </div>
          <button type="submit" disabled={submitting} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            <FolderPlus className="w-4 h-4" /> افزودن
          </button>
        </form>
      </div>
      {categories.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">هنوز دسته‌بندی ثبت نشده است</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-right p-3 font-medium">نام دسته‌بندی</th>
                <th className="text-center p-3 font-medium">تعداد هزینه‌ها</th>
                <th className="text-center p-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {categories.map(c => {
                const count = usage[c.id] || 0;
                const locked = c.id === 'facilitator_payment' || count > 0;
                return (
                  <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {editId === c.id ? (
                        <input autoFocus value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setEditId(null); }} className="px-2 py-1 rounded-lg border border-input bg-background text-sm w-48" />
                      ) : c.name}
                    </td>
                    <td className="p-3 text-center text-muted-foreground">{toPersianNum(count)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editId === c.id ? (
                          <>
                            <button onClick={saveRename} className="text-muted-foreground hover:text-green-600"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditId(null)} className="text-muted-foreground hover:text-red-600"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditId(c.id); setEditName(c.name); }} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                            {locked ? (
                              // Disabled buttons swallow hover events, so the tooltip hangs off a wrapper.
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex cursor-not-allowed" tabIndex={0}>
                                    <button disabled className="text-muted-foreground opacity-30 pointer-events-none"><Trash2 className="w-4 h-4" /></button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {count ? `در ${toPersianNum(count)} هزینه استفاده شده و قابل حذف نیست` : 'دسته‌بندی پیش‌فرض است و قابل حذف نیست'}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <button onClick={() => onDeleteCategory(c.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

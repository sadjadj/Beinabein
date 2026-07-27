import React, { useState } from 'react';
import { FolderPlus, Trash2 } from 'lucide-react';

export default function CafeCategoryTab({ categories, onCategorySubmit, onDeleteCategory }) {
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) return;
    setSubmitting(true);
    try {
      await onCategorySubmit(name);
      setName('');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="p-4 border-b border-border">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام کتگوری</label>
            <input type="text" placeholder="مثلاً نوشیدنی" value={name} onChange={e => setName(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
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
              {categories.map(c => (
                <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => onDeleteCategory(c.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, MapPin } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { TableSkeleton } from '@/components/SkeletonPatterns';

export default function SpacesPage() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', normal_capacity: '', plus_capacity: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Space.list('-created_date', 100);
      setSpaces(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        normal_capacity: Number(form.normal_capacity) || 0,
        plus_capacity: Number(form.plus_capacity) || 0
      };
      if (editingId) {
        await base44.entities.Space.update(editingId, payload);
        setEditingId(null);
      } else {
        await base44.entities.Space.create(payload);
      }
      setForm({ name: '', normal_capacity: '', plus_capacity: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({ name: s.name, normal_capacity: s.normal_capacity || '', plus_capacity: s.plus_capacity || '' });
  };

  const handleDelete = async (id) => {
    await base44.entities.Space.delete(id);
    fetchData();
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فضاها</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت فضاهای برگزاری</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#B74B40]" /> {editingId ? 'ویرایش فضا' : 'افزودن فضا'}
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">نام فضا *</label>
            <input type="text" placeholder="مثلاً سالن اصلی" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ظرفیت عادی</label>
            <input type="number" placeholder="۰" value={form.normal_capacity} onChange={e => setForm({ ...form, normal_capacity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-28" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">ظرفیت پلاس</label>
            <input type="number" placeholder="۰" value={form.plus_capacity} onChange={e => setForm({ ...form, plus_capacity: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-28" />
          </div>
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : editingId ? 'ذخیره' : 'افزودن'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', normal_capacity: '', plus_capacity: '' }); }} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">فضاها ({toPersianNum(spaces.length)})</h3></div>
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : spaces.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز فضایی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام فضا</th>
                  <th className="text-right p-3 font-medium">ظرفیت عادی</th>
                  <th className="text-right p-3 font-medium">ظرفیت پلاس</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map(s => (
                  <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium"><span className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-muted-foreground" /> {s.name}</span></td>
                    <td className="p-3">{s.normal_capacity ? toPersianNum(s.normal_capacity) : '-'}</td>
                    <td className="p-3">{s.plus_capacity ? toPersianNum(s.plus_capacity) : '-'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
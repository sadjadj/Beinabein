import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Palette, Plus, Search } from 'lucide-react';
import { toPersianNum, countNewThisMonth } from '@/lib/stats';
import { sanitizePhone, sanitizeName } from '@/lib/inputUtils';

export default function ArtistsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', phone: '', social_id: '', brand_name: '', description: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Artist.list('-created_date', 500);
      setRecords(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name) return;
    setSubmitting(true);
    try {
      await base44.entities.Artist.create(form);
      setForm({ full_name: '', phone: '', social_id: '', brand_name: '', description: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.full_name || '').toLowerCase().includes(s) ||
      (r.brand_name || '').toLowerCase().includes(s) ||
      (r.phone || '').includes(s);
  });

  const newThisMonth = countNewThisMonth(records);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">آرتیست‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">فهرست آرتیست‌های بینابین</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت آرتیست
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:gap-4">
        <StatCard label="کل آرتیست‌ها" value={toPersianNum(records.length)} icon={Palette} color="terracotta" />
        <StatCard label="افراد اضافه شده در این ماه" value={toPersianNum(newThisMonth)} icon={Palette} color="ochre" />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => setForm({ ...form, full_name: sanitizeName(e.target.value) })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="tel" placeholder="شماره تماس" value={form.phone} onChange={e => setForm({ ...form, phone: sanitizePhone(e.target.value) })} dir="ltr" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            <input type="text" placeholder="آیدی شبکه اجتماعی" value={form.social_id} onChange={e => setForm({ ...form, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="نام برند" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <textarea placeholder="توضیحات و معرفی" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="sm:col-span-2 lg:col-span-3 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">فهرست آرتیست‌ها</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">آرتیستی یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">نام برند</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">
                      <Link to={`/artists/${r.id}`} className="font-medium hover:text-[#B74B40]">{r.full_name}</Link>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.phone || '-'}</td>
                    <td className="p-3">{r.brand_name || '-'}</td>
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
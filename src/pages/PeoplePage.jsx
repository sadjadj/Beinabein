import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search } from 'lucide-react';
import { computePersonActivity, toPersianNum } from '@/lib/stats';

export default function PeoplePage() {
  const [people, setPeople] = useState([]);
  const [allData, setAllData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', full_name: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [persons, wsVisits, cafePurchases, workshops, events] = await Promise.all([
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkspaceVisit.list('-visit_date', 500),
        base44.entities.CafePurchase.list('-purchase_date', 500),
        base44.entities.Workshop.list('-date', 500),
        base44.entities.BigEvent.list('-date', 500)
      ]);
      setPeople(persons);
      setAllData({ workspaceVisits: wsVisits, cafePurchases, workshops, events });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone) return;
    setSubmitting(true); setMessage(null);
    try {
      await base44.entities.Person.create({ phone: form.phone, full_name: form.full_name });
      setMessage({ type: 'success', text: 'فرد ثبت شد' });
      setForm({ phone: '', full_name: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const filtered = people.filter(p => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.phone || '').includes(s) || (p.full_name || '').toLowerCase().includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">افراد</h1>
        <p className="text-sm text-muted-foreground mt-1">فهرست افراد بینابین</p>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-600" /> ثبت فرد جدید</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <input type="tel" placeholder="شماره تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : 'ثبت'}
          </button>
          {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">فهرست افراد ({toPersianNum(people.length)} نفر)</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-48" />
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search ? 'نتیجه‌ای یافت نشد' : 'هنوز فردی ثبت نشده است'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-center p-3 font-medium">فضای کار</th>
                  <th className="text-center p-3 font-medium">کافه</th>
                  <th className="text-center p-3 font-medium">کارگاه</th>
                  <th className="text-center p-3 font-medium">رویداد</th>
                  <th className="text-center p-3 font-medium">کل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const activity = computePersonActivity(p, allData.workspaceVisits, allData.cafePurchases, allData.workshops, allData.events);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">{p.full_name || '-'}</td>
                      <td className="p-3">{p.phone}</td>
                      <td className="p-3 text-center">{activity.workspace > 0 ? toPersianNum(activity.workspace) : '-'}</td>
                      <td className="p-3 text-center">{activity.cafe > 0 ? toPersianNum(activity.cafe) : '-'}</td>
                      <td className="p-3 text-center">{activity.workshop > 0 ? toPersianNum(activity.workshop) : '-'}</td>
                      <td className="p-3 text-center">{activity.event > 0 ? toPersianNum(activity.event) : '-'}</td>
                      <td className="p-3 text-center font-semibold">{toPersianNum(activity.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
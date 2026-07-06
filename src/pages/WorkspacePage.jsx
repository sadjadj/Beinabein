import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Briefcase, Users, Repeat, Clock, Plus } from 'lucide-react';
import { computeWorkspaceStats, findOrCreatePerson, calcHours, toPersianNum } from '@/lib/stats';

export default function WorkspacePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', name: '', visit_date: new Date().toISOString().split('T')[0], entry_time: '', exit_time: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.WorkspaceVisit.list('-visit_date', 200);
      setRecords(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.visit_date) return;
    setSubmitting(true); setMessage(null);
    try {
      await findOrCreatePerson(form.phone, form.name);
      const hours = calcHours(form.entry_time, form.exit_time);
      await base44.entities.WorkspaceVisit.create({
        person_phone: form.phone, person_name: form.name,
        visit_date: form.visit_date, entry_time: form.entry_time, exit_time: form.exit_time,
        hours_spent: hours
      });
      setMessage({ type: 'success', text: 'حضور ثبت شد' });
      setForm({ phone: '', name: '', visit_date: new Date().toISOString().split('T')[0], entry_time: '', exit_time: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const stats = computeWorkspaceStats(records, null);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فضای کار</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت حضور و گزارش فضای کار</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="مجموع حضورها" value={toPersianNum(stats.totalVisits)} icon={Briefcase} color="amber" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="blue" />
        <StatCard label="افراد تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="green" />
        <StatCard label="مجموع ساعت" value={toPersianNum(stats.totalHours)} icon={Clock} color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-gray-700" /> ثبت حضور جدید</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input type="tel" placeholder="شماره تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="text" placeholder="نام" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="date" value={form.visit_date} onChange={e => setForm({ ...form, visit_date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="time" value={form.entry_time} onChange={e => setForm({ ...form, entry_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="time" value={form.exit_time} onChange={e => setForm({ ...form, exit_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت'}
            </button>
            {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">حضورهای اخیر</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز حضور ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">ورود</th>
                  <th className="text-right p-3 font-medium">خروج</th>
                  <th className="text-right p-3 font-medium">ساعت</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{new Date(r.visit_date).toLocaleDateString('fa-IR')}</td>
                    <td className="p-3">{r.person_phone}</td>
                    <td className="p-3">{r.person_name || '-'}</td>
                    <td className="p-3">{r.entry_time || '-'}</td>
                    <td className="p-3">{r.exit_time || '-'}</td>
                    <td className="p-3">{toPersianNum(r.hours_spent || 0)}</td>
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
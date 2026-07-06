import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Repeat, Plus } from 'lucide-react';
import { computeWorkshopStats, bulkCreatePersons, toPersianNum } from '@/lib/stats';

export default function WorkshopsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ title: '', date: new Date().toISOString().split('T')[0], participants: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Workshop.list('-date', 200);
      setRecords(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setSubmitting(true); setMessage(null);
    try {
      const phones = form.participants.split(/[\n,;]/).map(p => p.trim()).filter(Boolean);
      await base44.entities.Workshop.create({
        title: form.title, date: form.date,
        participant_phones: phones, participant_count: phones.length
      });
      await bulkCreatePersons(phones);
      setMessage({ type: 'success', text: `کارگاه با ${toPersianNum(phones.length)} شرکت‌کننده ثبت شد` });
      setForm({ title: '', date: new Date().toISOString().split('T')[0], participants: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const stats = computeWorkshopStats(records, null);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">کارگاه‌های کوچک</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت کارگاه و شرکت‌کنندگان</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد کارگاه" value={toPersianNum(stats.totalWorkshops)} icon={GraduationCap} color="amber" />
        <StatCard label="مجموع شرکت‌کنندگان" value={toPersianNum(stats.totalParticipants)} icon={Users} color="blue" />
        <StatCard label="یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="green" />
        <StatCard label="تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="purple" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-amber-600" /> ثبت کارگاه جدید</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" placeholder="عنوان کارگاه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <textarea placeholder="شماره تلفن شرکت‌کنندگان (هر خط یک شماره)" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <div className="flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {submitting ? 'در حال ثبت...' : 'ثبت کارگاه'}
            </button>
            {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">کارگاه‌های اخیر</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز کارگاه ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">عنوان</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">تعداد</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{r.title}</td>
                    <td className="p-3">{new Date(r.date).toLocaleDateString('fa-IR')}</td>
                    <td className="p-3">{toPersianNum(r.participant_count || 0)}</td>
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
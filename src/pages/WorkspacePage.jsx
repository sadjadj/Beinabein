import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Briefcase, Users, Repeat, Plus, MapPin } from 'lucide-react';
import { computeWorkspaceStats, findOrCreatePerson, toPersianNum } from '@/lib/stats';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

const sourceLabels = { referral: 'ریفرال', azno: 'ازنو', instagram: 'اینستاگرام', telegram: 'تلگرام', other: 'سایر' };

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function WorkspacePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', name: '', visit_date: todayGregorian(), entry_time: '', entry_source: 'other' });

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
      await base44.entities.WorkspaceVisit.create({
        person_phone: form.phone, person_name: form.name,
        visit_date: form.visit_date, entry_time: form.entry_time || nowTime(),
        entry_source: form.entry_source
      });
      setMessage({ type: 'success', text: 'حضور ثبت شد' });
      setForm({ phone: '', name: '', visit_date: todayGregorian(), entry_time: '', entry_source: 'other' });
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

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="مجموع حضورها" value={toPersianNum(stats.totalVisits)} icon={Briefcase} color="terracotta" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="teal" />
        <StatCard label="افراد تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="ochre" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت حضور جدید</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input type="tel" placeholder="شماره تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="text" placeholder="نام" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <JalaliDateInput value={form.visit_date} onChange={v => setForm({ ...form, visit_date: v })} required />
          <input type="time" value={form.entry_time} onChange={e => setForm({ ...form, entry_time: e.target.value })} placeholder="ساعت ورود" className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <select value={form.entry_source} onChange={e => setForm({ ...form, entry_source: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(sourceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div className="sm:col-span-2 lg:col-span-5 flex items-center gap-3">
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
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
                  <th className="text-right p-3 font-medium">محل ورود</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{toJalaliStr(r.visit_date)}</td>
                    <td className="p-3">{r.person_phone}</td>
                    <td className="p-3">{r.person_name || '-'}</td>
                    <td className="p-3">{r.entry_time || '-'}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1 text-xs">
                        <MapPin className="w-3 h-3 text-[#8CB9C0]" />
                        {sourceLabels[r.entry_source] || r.entry_source || '-'}
                      </span>
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
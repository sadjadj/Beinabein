import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Repeat, Plus, Sparkles, Loader2 } from 'lucide-react';
import { computeWorkshopStats, bulkCreatePersons, toPersianNum } from '@/lib/stats';

export default function WorkshopsPage() {
  const [records, setRecords] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [message, setMessage] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', topics: '', date: new Date().toISOString().split('T')[0], facilitator_id: '', participants: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [data, facs] = await Promise.all([
        base44.entities.Workshop.list('-date', 200),
        base44.entities.Facilitator.list('-created_date', 200)
      ]);
      setRecords(data);
      setFacilitators(facs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSuggest = async () => {
    if (!form.title || !form.description) {
      setMessage({ type: 'error', text: 'عنوان و توضیحات را وارد کنید' });
      return;
    }
    setSuggesting(true); setSuggestions([]); setMessage(null);
    try {
      const [people, wsVisits, cafePurchases, workshops, events] = await Promise.all([
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkspaceVisit.list('-visit_date', 500),
        base44.entities.CafePurchase.list('-purchase_date', 500),
        base44.entities.Workshop.list('-date', 500),
        base44.entities.BigEvent.list('-date', 500)
      ]);
      const peopleList = people.map(p => {
        const phone = p.phone;
        const ws = wsVisits.filter(v => v.person_phone === phone).length;
        const cafe = cafePurchases.filter(c => c.person_phone === phone).length;
        const wsCount = workshops.filter(w => (w.participant_phones || []).includes(phone)).length;
        const evCount = events.filter(e => (e.participant_phones || []).includes(phone)).length;
        return { name: p.full_name || '', phone: p.phone, activity: { workspace: ws, cafe, workshop: wsCount, event: evCount } };
      });
      const facilitatorName = facilitators.find(f => f.id === form.facilitator_id)?.full_name || 'نامشخص';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `من در حال برگزاری یک کارگاه هستم. بر اساس مشخصات کارگاه و سابقه فعالیت افراد در فضای بینابین، لطفاً کسانی را که مناسب این کارگاه هستند از بین افراد زیر پیشنهاد بده.

عنوان کارگاه: ${form.title}
توضیحات: ${form.description}
موضوعات: ${form.topics}
تسهیلگر: ${facilitatorName}

لیست افراد و سابقه فعالیتشان در بینابین (عدد نشان‌دهنده تعداد دفعات استفاده از هر بخش است):
${JSON.stringify(peopleList)}

فقط افرادی را پیشنهاد بده که در لیست بالا هستند. برای هر نفر دلیل کوتاهی بنویس که چرا مناسب این کارگاه است. حداکثر ۱۰ نفر.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  phone: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });
      setSuggestions(result.suggestions || []);
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در دریافت پیشنهادها' });
    } finally { setSuggesting(false); }
  };

  const addSuggestedToParticipants = () => {
    const phones = suggestions.map(s => s.phone);
    const current = form.participants.split(/[\n,;]/).map(p => p.trim()).filter(Boolean);
    const merged = [...new Set([...current, ...phones])];
    setForm({ ...form, participants: merged.join('\n') });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.date) return;
    setSubmitting(true); setMessage(null);
    try {
      const phones = form.participants.split(/[\n,;]/).map(p => p.trim()).filter(Boolean);
      await base44.entities.Workshop.create({
        title: form.title, description: form.description, topics: form.topics,
        date: form.date, facilitator_id: form.facilitator_id,
        participant_phones: phones, participant_count: phones.length
      });
      await bulkCreatePersons(phones);
      setMessage({ type: 'success', text: `کارگاه با ${toPersianNum(phones.length)} شرکت‌کننده ثبت شد` });
      setForm({ title: '', description: '', topics: '', date: new Date().toISOString().split('T')[0], facilitator_id: '', participants: '' });
      setSuggestions([]);
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const stats = computeWorkshopStats(records, null);
  const getFacilitatorName = (fid) => facilitators.find(f => f.id === fid)?.full_name || '-';

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
          <input type="text" placeholder="عنوان کارگاه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <select value={form.facilitator_id} onChange={e => setForm({ ...form, facilitator_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              <option value="">انتخاب تسهیلگر...</option>
              {facilitators.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
            <input type="text" placeholder="موضوعات (مثلاً محصول، بازاریابی)" value={form.topics} onChange={e => setForm({ ...form, topics: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          </div>
          <textarea placeholder="توضیحات کارگاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />

          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSuggest} disabled={suggesting} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-50 text-purple-700 text-sm font-medium hover:bg-purple-100 disabled:opacity-50 border border-purple-200">
              {suggesting ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال تحلیل...</> : <><Sparkles className="w-4 h-4" /> پیشنهاد شرکت‌کنندگان</>}
            </button>
            {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
          </div>

          {suggestions.length > 0 && (
            <div className="bg-purple-50 rounded-lg border border-purple-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-purple-700">پیشنهاد هوش مصنوعی ({toPersianNum(suggestions.length)} نفر)</p>
                <button type="button" onClick={addSuggestedToParticipants} className="text-xs px-3 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-700">افزودن همه به شرکت‌کنندگان</button>
              </div>
              {suggestions.map((s, i) => (
                <div key={i} className="bg-white rounded-lg p-3 text-sm flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{s.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{s.phone}</p>
                  </div>
                  <p className="text-xs text-muted-foreground text-left max-w-[60%]">{s.reason}</p>
                </div>
              ))}
            </div>
          )}

          <textarea placeholder="شماره تلفن شرکت‌کنندگان (هر خط یک شماره)" value={form.participants} onChange={e => setForm({ ...form, participants: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : 'ثبت کارگاه'}
          </button>
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
                  <th className="text-right p-3 font-medium">تسهیلگر</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">تعداد</th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{r.title}</td>
                    <td className="p-3 text-muted-foreground">{getFacilitatorName(r.facilitator_id)}</td>
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
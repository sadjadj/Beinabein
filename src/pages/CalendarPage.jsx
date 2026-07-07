import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Clock, MapPin, Plus, UserCheck } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';

const dayLabels = { saturday: 'شنبه', sunday: 'یکشنبه', monday: 'دوشنبه', tuesday: 'سه‌شنبه', wednesday: 'چهارشنبه', thursday: 'پنجشنبه', friday: 'جمعه' };
const dayOrder = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
const spaceLabels = { library: 'کتابخانه', lounge: 'نشیمن', main: 'فضای اصلی' };

export default function CalendarPage() {
  const [events, setEvents] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: '', day_of_week: 'saturday', start_time: '', end_time: '', space: 'lounge', description: '', sessions_total: '', is_ongoing: false });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [events, facs] = await Promise.all([
        base44.entities.CalendarEvent.list('-created_date', 200),
        base44.entities.Facilitator.list('-created_date', 500)
      ]);
      setEvents(events);
      setFacilitators(facs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.day_of_week || !form.start_time || !form.end_time) return;
    setSubmitting(true);
    try {
      await base44.entities.CalendarEvent.create({
        ...form,
        sessions_total: Number(form.sessions_total) || null,
        sessions_remaining: Number(form.sessions_total) || null
      });
      setForm({ title: '', day_of_week: 'saturday', start_time: '', end_time: '', space: 'lounge', description: '', sessions_total: '', is_ongoing: false });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const getFacilitatorName = (id) => facilitators.find(f => f.id === id)?.full_name || '';

  // Group events by day
  const byDay = {};
  dayOrder.forEach(d => { byDay[d] = []; });
  events.forEach(e => { if (byDay[e.day_of_week]) byDay[e.day_of_week].push(e); });
  Object.values(byDay).forEach(arr => arr.sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تقویم برنامه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">برنامه زمانی فضاها و کارگاه‌ها</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت برنامه
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /> برنامه‌های فعال</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(events.length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> فضا: نشیمن</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(events.filter(e => e.space === 'lounge').length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /> ادامه‌دار</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(events.filter(e => e.is_ongoing).length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><UserCheck className="w-4 h-4" /> تسهیلگرها</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(facilitators.length)}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="عنوان برنامه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(dayLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={form.space} onChange={e => setForm({ ...form, space: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
              {Object.entries(spaceLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="time" placeholder="شروع" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="time" placeholder="پایان" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="number" placeholder="تعداد جلسات کل" value={form.sessions_total} onChange={e => setForm({ ...form, sessions_total: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_ongoing} onChange={e => setForm({ ...form, is_ongoing: e.target.checked })} className="w-4 h-4" />
              ادامه‌دار
            </label>
            <input type="text" placeholder="توضیحات" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : (
        <div className="space-y-4">
          {dayOrder.map(day => {
            const dayEvents = byDay[day];
            if (dayEvents.length === 0) return null;
            return (
              <div key={day} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold">{dayLabels[day]}</h3>
                </div>
                <div className="divide-y divide-border">
                  {dayEvents.map(ev => (
                    <div key={ev.id} className="p-4 flex items-start gap-4">
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-sm font-medium">{ev.start_time}</span>
                        <span className="text-xs text-muted-foreground">تا</span>
                        <span className="text-sm font-medium">{ev.end_time}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{ev.title}</h4>
                          {ev.is_ongoing && <span className="px-2 py-0.5 rounded-full text-xs bg-[#F0F7F8] text-[#8CB9C0]">ادامه‌دار</span>}
                        </div>
                        {ev.description && <p className="text-xs text-muted-foreground mt-1">{ev.description}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="inline-flex items-center gap-1 text-[#8CB9C0]">
                            <MapPin className="w-3 h-3" /> {spaceLabels[ev.space] || ev.space}
                          </span>
                          {ev.sessions_remaining != null && (
                            <span className="text-muted-foreground">{toPersianNum(ev.sessions_remaining)} جلسه باقیمانده</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
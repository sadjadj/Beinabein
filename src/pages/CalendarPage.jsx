import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Calendar, Clock, MapPin, Plus, X, Layers, GraduationCap, Sparkles } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels, dayOrder } from '@/lib/labels';
import { toJalaliStr, todayGregorian, formatJalaliFull } from '@/lib/jalali';
import { computeGroupSessions, getCurrentWeekRange } from '@/lib/groupSessions';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';
import EventForm from '@/components/EventForm';

export default function CalendarPage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [groups, setGroups] = useState([]);
  const [events, setEvents] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ws, gs, evs, spcs] = await Promise.all([
          base44.entities.Workshop.list('-start_date', 500),
          base44.entities.Group.list('-start_date', 500),
          base44.entities.Event.list('-start_date', 500),
          base44.entities.Space.list('-created_date', 100)
        ]);
        setWorkshops(ws);
        setGroups(gs);
        setEvents(evs);
        setSpaces(spcs);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const week = getCurrentWeekRange();
  const today = todayGregorian();

  // Build a list of all sessions in the current week
  const weekEntries = useMemo(() => {
    const entries = [];
    // Workshops (use stored session_dates)
    workshops.forEach(w => {
      if (w.is_ended) return;
      if (w.end_date && w.end_date < week.start) return;
      (w.session_dates || []).forEach(d => {
        if (d >= week.start && d <= week.end) {
          entries.push({ date: d, day: jsDayKey(d), start_time: w.start_time || '', end_time: w.end_time || '', space: w.space || '', title: w.title, type: 'workshop', id: w.id, link: `/workshops/${w.id}` });
        }
      });
    });
    // Groups (compute sessions from schedule)
    groups.forEach(g => {
      if (g.is_ended) return;
      const sessions = computeGroupSessions(g);
      sessions.forEach(s => {
        if (s.date >= week.start && s.date <= week.end) {
          entries.push({ date: s.date, day: s.day, start_time: s.start_time || '', end_time: s.end_time || '', space: g.space || '', title: g.title, type: 'group', id: g.id, link: `/groups/${g.id}` });
        }
      });
    });
    // Events (use stored session_dates)
    events.forEach(e => {
      if (e.is_ended) return;
      if (e.end_date && e.end_date < week.start) return;
      (e.session_dates || []).forEach(d => {
        if (d >= week.start && d <= week.end) {
          entries.push({ date: d, day: jsDayKey(d), start_time: e.start_time || '', end_time: e.end_time || '', space: e.space || '', title: e.title, type: 'event', id: e.id, link: null });
        }
      });
    });
    return entries.sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.start_time || '').localeCompare(b.start_time || ''));
  }, [workshops, groups, events, week.start, week.end]);

  // Group by date
  const byDate = useMemo(() => {
    const map = {};
    weekEntries.forEach(e => { (map[e.date] = map[e.date] || []).push(e); });
    return map;
  }, [weekEntries]);

  // Build full week dates list (Sat..Fri) to show empty days too
  const weekDates = useMemo(() => {
    const dates = [];
    let cursor = new Date(week.start + 'T00:00:00');
    const endD = new Date(week.end + 'T00:00:00');
    while (cursor <= endD) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
  }, [week.start, week.end]);

  const handleCreateEvent = async (form, plans) => {
    setSubmitting(true);
    try {
      const created = await base44.entities.Event.create({
        ...form,
        price: Number(form.price) || 0,
        session_count: Number(form.session_count) || 0,
        capacity: Number(form.capacity) || null
      });
      const validPlans = (plans || []).filter(p => p.name && p.price !== '' && p.price !== null);
      if (validPlans.length > 0) {
        await base44.entities.EventPlan.bulkCreate(
          validPlans.map(p => ({ event_id: created.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false }))
        );
      }
      await base44.entities.EventPlan.create({ event_id: created.id, name: 'رایگان', price: 0, is_active: false });
      setShowEventForm(false);
      const evs = await base44.entities.Event.list('-start_date', 500);
      setEvents(evs);
    } finally { setSubmitting(false); }
  };

  const blankEventForm = {
    title: '', price: '', session_count: '', description: '', tags: '',
    space: '', start_time: '', end_time: '', day_of_week: '',
    start_date: '', end_date: '', capacity: '', session_dates: []
  };

  const typeMeta = {
    workshop: { label: 'کارگاه', icon: GraduationCap, color: 'text-[#B74B40] bg-[#FDF2F1]' },
    group: { label: 'گروه', icon: Layers, color: 'text-[#3B8A95] bg-[#F0F7F8]' },
    event: { label: 'رخداد', icon: Sparkles, color: 'text-[#B9834B] bg-[#FBF3EC]' },
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">برنامه‌های این هفته</h1>
          <p className="text-sm text-muted-foreground mt-1">کارگاه‌ها، گروه‌ها و رخدادهای هفته جاری</p>
        </div>
        <button onClick={() => setShowEventForm(!showEventForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          {showEventForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showEventForm ? 'بستن' : 'افزودن رخداد'}
        </button>
      </div>

      {showEventForm && (
        <EventForm
          initialForm={blankEventForm}
          initialPlans={[]}
          spaces={spaces}
          onSubmit={handleCreateEvent}
          onCancel={() => setShowEventForm(false)}
          submitting={submitting}
          submitLabel="ثبت رخداد"
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><GraduationCap className="w-4 h-4" /> جلسات کارگاه‌ها</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(weekEntries.filter(e => e.type === 'workshop').length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Layers className="w-4 h-4" /> جلسات گروه‌ها</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(weekEntries.filter(e => e.type === 'group').length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Sparkles className="w-4 h-4" /> رخدادها</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(weekEntries.filter(e => e.type === 'event').length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /> کل این هفته</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(weekEntries.length)}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></div>
          {weekDates.map(d => <Skeleton key={d} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {weekDates.map(date => {
            const dayEntries = byDate[date] || [];
            const isPast = date < today;
            const dayKey = jsDayKey(date);
            return (
              <div key={date} className={`bg-white rounded-xl border border-border overflow-hidden ${isPast ? 'opacity-50' : ''}`}>
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{dayKey ? dayLabels[dayKey] : ''} — {formatJalaliFull(date)}</h3>
                  <span className="text-xs text-muted-foreground">{toPersianNum(dayEntries.length)} برنامه{isPast ? ' (گذشته)' : ''}</span>
                </div>
                {dayEntries.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">برنامه‌ای در این روز نیست</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="text-right p-3 font-medium w-28">ساعت</th>
                        <th className="text-right p-3 font-medium">عنوان</th>
                        <th className="text-right p-3 font-medium">نوع</th>
                        <th className="text-right p-3 font-medium">محل برگزاری</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dayEntries.map((e, i) => {
                        const meta = typeMeta[e.type];
                        const Icon = meta.icon;
                        const content = (
                          <>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{e.start_time || '-'}</span>
                                {e.end_time && <span className="text-xs text-muted-foreground">تا {e.end_time}</span>}
                              </div>
                            </td>
                            <td className="p-3 font-medium">{e.title}</td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                                <Icon className="w-3 h-3" /> {meta.label}
                              </span>
                            </td>
                            <td className="p-3 text-muted-foreground text-xs">
                              {e.space ? <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {e.space}</span> : '-'}
                            </td>
                          </>
                        );
                        return e.link ? (
                          <tr key={`${e.id}-${i}`} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(e.link)}>
                            {content}
                          </tr>
                        ) : (
                          <tr key={`${e.id}-${i}`} className="border-t border-border">{content}</tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {weekEntries.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">هیچ برنامه‌ای برای این هفته ثبت نشده است</div>
          )}
        </div>
      )}
    </div>
  );
}

// JS getDay → Persian week key
function jsDayKey(gregorianStr) {
  const map = { 0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday' };
  const d = new Date(gregorianStr + 'T00:00:00');
  return map[d.getDay()];
}
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Check, X } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian, getJalaliParts } from '@/lib/jalali';
import { computeGroupSessions, gregorianToMonthKey, currentJalaliMonthKey } from '@/lib/groupSessions';

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
function monthLabel(key) {
  if (!key) return '';
  const [jy, jm] = key.split('-').map(Number);
  return `${jMonths[jm - 1]} ${toPersianNum(jy)}`;
}

export default function GroupAttendancePage() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(currentJalaliMonthKey());
  const [activeDate, setActiveDate] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [g, purchs, sess] = await Promise.all([
        base44.entities.Group.get(groupId),
        base44.entities.GroupPurchase.list('-purchase_date', 1000),
        base44.entities.GroupSession.list('-created_date', 1000)
      ]);
      setGroup(g);
      setPurchases(purchs.filter(p => p.group_id === groupId));
      setSessions(sess.filter(s => s.group_id === groupId));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [groupId]);

  // Sessions for this group, computed from schedule
  const allSessions = useMemo(() => group ? computeGroupSessions(group) : [], [group]);

  // Available months from computed sessions
  const availableMonths = useMemo(() => {
    const set = new Set(allSessions.map(s => gregorianToMonthKey(s.date)));
    set.add(currentJalaliMonthKey());
    return [...set].sort();
  }, [allSessions]);

  useEffect(() => {
    if (availableMonths.length > 0 && !availableMonths.includes(monthKey)) {
      setMonthKey(availableMonths[availableMonths.length - 1]);
    }
  }, [availableMonths]);

  // Sessions in selected month
  const monthSessions = useMemo(() => {
    return allSessions.filter(s => gregorianToMonthKey(s.date) === monthKey)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }, [allSessions, monthKey]);

  useEffect(() => {
    if (monthSessions.length > 0 && !monthSessions.find(s => s.date === activeDate)) {
      setActiveDate(monthSessions[0].date);
    }
  }, [monthSessions]);

  // Participants registered for this group in the selected month
  const monthParticipants = purchases.filter(p => p.month === monthKey);

  // Find or create GroupSession record for a date
  const ensureSession = (date, sessionNumber) => {
    let existing = sessions.find(s => s.session_date === date);
    if (existing) return existing;
    // create on demand
    return null;
  };

  const getSessionForDate = (date) => sessions.find(s => s.session_date === date);
  const activeSession = getSessionForDate(activeDate);
  const activeComputed = monthSessions.find(s => s.date === activeDate);

  const toggleAttendance = async (phone) => {
    if (!activeDate) return;
    let session = getSessionForDate(activeDate);
    if (!session) {
      const num = activeComputed?.session_number || 1;
      session = await base44.entities.GroupSession.create({
        group_id: groupId,
        group_title: group.title,
        session_number: num,
        session_date: activeDate,
        month: gregorianToMonthKey(activeDate),
        present_phones: [phone]
      });
      setSessions(prev => [...prev, session]);
      return;
    }
    const present = session.present_phones || [];
    const updated = present.includes(phone) ? present.filter(p => p !== phone) : [...present, phone];
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, present_phones: updated } : s));
    await base44.entities.GroupSession.update(session.id, { present_phones: updated });
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!group) return <div className="p-6 text-center text-muted-foreground">گروهی یافت نشد</div>;

  const presentSet = new Set(activeSession?.present_phones || []);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <Link to={`/groups/${group.id}`} className="text-xl font-bold hover:text-[#B74B40] transition-colors">{group.title}</Link>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
          {(group.schedule || []).map(s => <span key={s.day}>{dayLabels[s.day]} {s.start_time || ''}{s.end_time ? ` تا ${s.end_time}` : ''}</span>)}
          <span>{toPersianNum(monthParticipants.length)} ثبت‌نام در این ماه</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">ماه</label>
          <select value={monthKey} onChange={e => setMonthKey(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
            {availableMonths.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>
      </div>

      {monthSessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          در {monthLabel(monthKey)} جلسه‌ای برای این گروه برگزار نشده است.
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 flex-wrap border-b border-border pb-1 mb-3">
            {monthSessions.map(s => (
              <button
                key={s.date}
                onClick={() => setActiveDate(s.date)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${activeDate === s.date ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}
              >
                {toJalaliStr(s.date)}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{activeDate ? toJalaliStr(activeDate) : ''}</p>
                <p className="text-xs text-muted-foreground">{activeComputed ? dayLabels[activeComputed.day] : ''}</p>
              </div>
              <span className="text-xs text-muted-foreground">{toPersianNum(presentSet.size)} از {toPersianNum(monthParticipants.length)} نفر حاضر</span>
            </div>
            {monthParticipants.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">در این ماه کسی ثبت‌نام نکرده است</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-right p-3 font-medium">نام</th>
                      <th className="text-right p-3 font-medium">شماره تلفن</th>
                      <th className="text-center p-3 font-medium">حضور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthParticipants.map(p => {
                      const isPresent = presentSet.has(p.person_phone);
                      return (
                        <tr key={p.id} className="border-t border-border hover:bg-muted/20">
                          <td className="p-3 font-medium">{p.person_name || '-'}</td>
                          <td className="p-3 text-muted-foreground" dir="ltr">{p.person_phone}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => toggleAttendance(p.person_phone)}
                              className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isPresent ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
                            >
                              {isPresent ? <><Check className="w-3.5 h-3.5" /> حاضر</> : <><X className="w-3.5 h-3.5" /> غایب</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
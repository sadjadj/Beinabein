import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Plus, Check, X, Calendar as CalendarIcon, Users, Trash2 } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

export default function WorkshopAttendancePage() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(todayGregorian());
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess] = await Promise.all([
        base44.entities.Workshop.get(workshopId),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopSession.list('-session_number', 500)
      ]);
      setWorkshop(w);
      setPurchases(purchs.filter(p => p.workshop_id === workshopId));
      setSessions(sess.filter(s => s.workshop_id === workshopId).sort((a, b) => (a.session_number || 0) - (b.session_number || 0)));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [workshopId]);

  const addSession = async () => {
    setSubmitting(true);
    try {
      const nextNumber = (sessions.length > 0 ? Math.max(...sessions.map(s => s.session_number || 0)) : 0) + 1;
      await base44.entities.WorkshopSession.create({
        workshop_id: workshopId,
        workshop_title: workshop.title,
        session_number: nextNumber,
        session_date: newSessionDate,
        present_phones: []
      });
      setShowAddSession(false);
      setNewSessionDate(todayGregorian());
      fetchData();
    } finally { setSubmitting(false); }
  };

  const toggleAttendance = async (session, phone) => {
    const present = session.present_phones || [];
    const updated = present.includes(phone) ? present.filter(p => p !== phone) : [...present, phone];
    await base44.entities.WorkshopSession.update(session.id, { present_phones: updated });
    fetchData();
  };

  const deleteSession = async (sessionId) => {
    await base44.entities.WorkshopSession.delete(sessionId);
    fetchData();
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!workshop) return <div className="p-6 text-center text-muted-foreground">کارگاهی یافت نشد</div>;

  const participants = purchases.map(p => ({ name: p.person_name, phone: p.person_phone }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={() => navigate('/attendance')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست کارگاه‌ها
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{workshop.title}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {workshop.day_of_week && <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {dayLabels[workshop.day_of_week]} {(workshop.start_time || workshop.end_time) && `• ${workshop.start_time || ''}${workshop.end_time ? ' تا ' + workshop.end_time : ''}`}</span>}
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {toPersianNum(participants.length)} ثبت‌نامی</span>
            </div>
          </div>
          <button onClick={() => setShowAddSession(!showAddSession)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> جلسه جدید
          </button>
        </div>
      </div>

      {showAddSession && (
        <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-3">
          <JalaliDateInput value={newSessionDate} onChange={setNewSessionDate} />
          <button onClick={addSession} disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {submitting ? 'در حال افزودن...' : 'افزودن جلسه'}
          </button>
          <button onClick={() => setShowAddSession(false)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          هنوز جلسه‌ای ثبت نشده است. روی «جلسه جدید» کلیک کنید.
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(session => {
            const presentSet = new Set(session.present_phones || []);
            const presentCount = (session.present_phones || []).length;
            return (
              <div key={session.id} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#B74B40] text-white flex items-center justify-center text-sm font-bold">
                      {toPersianNum(session.session_number)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">جلسه {toPersianNum(session.session_number)}</p>
                      <p className="text-xs text-muted-foreground">{toJalaliStr(session.session_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{toPersianNum(presentCount)} از {toPersianNum(participants.length)} نفر حاضر</span>
                    <button onClick={() => deleteSession(session.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {participants.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">هنوز کسی در این کارگاه ثبت‌نام نکرده است</div>
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
                        {participants.map(p => {
                          const isPresent = presentSet.has(p.phone);
                          return (
                            <tr key={p.phone} className="border-t border-border hover:bg-muted/20">
                              <td className="p-3 font-medium">{p.name || '-'}</td>
                              <td className="p-3 text-muted-foreground">{p.phone}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => toggleAttendance(session, p.phone)}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                    isPresent
                                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                      : 'bg-red-50 text-red-600 hover:bg-red-100'
                                  }`}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
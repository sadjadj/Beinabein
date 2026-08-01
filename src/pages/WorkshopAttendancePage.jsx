import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Plus, Check, X, Calendar as CalendarIcon, Users, Trash2, Pencil } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian, formatJalaliShort } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

export default function WorkshopAttendancePage() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [sessionRegs, setSessionRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSessionDate, setNewSessionDate] = useState(todayGregorian());
  const [submitting, setSubmitting] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editSessionDate, setEditSessionDate] = useState('');
  const [activeTab, setActiveTab] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess, sRegs] = await Promise.all([
        base44.entities.Workshop.get(workshopId),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopSession.list('-session_number', 500),
        base44.entities.WorkshopSessionRegistration.list('-created_date', 1000)
      ]);
      setWorkshop(w);
      setPurchases(purchs.filter(p => p.workshop_id === workshopId));
      const wsSessions = sess.filter(s => s.workshop_id === workshopId).sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
      setSessions(wsSessions);
      setSessionRegs(sRegs.filter(r => r.workshop_id === workshopId));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [workshopId]);

  // Default tab = last held session (most recent session_date <= today, else last by number)
  useEffect(() => {
    if (sessions.length === 0) { setActiveTab(null); return; }
    if (activeTab != null && sessions.some(s => s.session_number === activeTab)) return;
    const today = todayGregorian();
    const held = sessions.filter(s => s.session_date && s.session_date <= today);
    const def = held.length > 0 ? held[held.length - 1].session_number : sessions[sessions.length - 1].session_number;
    setActiveTab(def);
  }, [sessions]);

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
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, present_phones: updated } : s));
    try {
      await base44.entities.WorkshopSession.update(session.id, { present_phones: updated });
    } catch (e) {
      fetchData();
    }
  };

  const deleteSession = async (sessionId) => {
    await base44.entities.WorkshopSession.delete(sessionId);
    setEditingSessionId(null);
    fetchData();
  };

  const updateSessionDate = async (sessionId) => {
    await base44.entities.WorkshopSession.update(sessionId, { session_date: editSessionDate });
    setEditingSessionId(null);
    fetchData();
  };

  const startEditSession = (session) => {
    setEditingSessionId(session.id);
    setEditSessionDate(session.session_date || todayGregorian());
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!workshop) return <div className="p-6 text-center text-muted-foreground">کارگاهی یافت نشد</div>;

  const activeSession = sessions.find(s => s.session_number === activeTab);
  const activeParticipants = activeSession
    ? sessionRegs.filter(r => r.session_number === activeSession.session_number)
    : [];

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/workshops');
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to={`/workshops/${workshop.id}`} className="text-xl font-bold hover:text-[#B74B40] transition-colors">{workshop.title}</Link>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {workshop.day_of_week && <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {dayLabels[workshop.day_of_week]} {(workshop.start_time || workshop.end_time) && `• ${workshop.start_time || ''}${workshop.end_time ? ' تا ' + workshop.end_time : ''}`}</span>}
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {toPersianNum(purchases.length)} ثبت‌نامی</span>
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
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="flex flex-wrap gap-2 p-4 border-b border-border">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveTab(session.session_number)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === session.session_number ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}
              >
                جلسه {toPersianNum(session.session_number)}
              </button>
            ))}
          </div>

          {activeSession && (() => {
            const presentSet = new Set(activeSession.present_phones || []);
            const presentCount = (activeSession.present_phones || []).length;
            return (
              <div>
                <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-[#B74B40] text-white flex items-center justify-center text-sm font-bold">
                      {toPersianNum(activeSession.session_number)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">جلسه {toPersianNum(activeSession.session_number)}</p>
                      <p className="text-xs text-muted-foreground">{toJalaliStr(activeSession.session_date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{toPersianNum(presentCount)} از {toPersianNum(activeParticipants.length)} نفر حاضر</span>
                    {editingSessionId === activeSession.id ? (
                      <div className="flex items-center gap-2">
                        <JalaliDateInput value={editSessionDate} onChange={setEditSessionDate} showToday={false} />
                        <button onClick={() => updateSessionDate(activeSession.id)} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingSessionId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startEditSession(activeSession)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => deleteSession(activeSession.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                {activeParticipants.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">هنوز کسی در این جلسه ثبت‌نام نکرده است</div>
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
                        {activeParticipants.map((p, idx) => {
                          const isPresent = presentSet.has(p.person_phone);
                          return (
                            <tr key={idx} className="border-t border-border hover:bg-muted/20">
                              <td className="p-3 font-medium">{p.person_name || '-'}</td>
                              <td className="p-3 text-muted-foreground" dir="ltr">{p.person_phone}</td>
                              <td className="p-3 text-center">
                                <button
                                  onClick={() => toggleAttendance(activeSession, p.person_phone)}
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
          })()}
        </div>
      )}
    </div>
  );
}
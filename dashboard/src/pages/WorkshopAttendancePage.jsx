import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Check, X, Calendar as CalendarIcon, Users, Plus } from 'lucide-react';
import { toPersianNum, findOrCreatePerson } from '@/lib/stats';
import PersonSearch from '@/components/PersonSearch';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import { workshopTimeLabel } from '@/lib/workshopSchedule';

export default function WorkshopAttendancePage() {
  const { workshopId } = useParams();
  const navigate = useNavigate();
  const [workshop, setWorkshop] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [guestForm, setGuestForm] = useState(null); // { person_name, person_phone } while adding a guest

  const fetchData = async () => {
    setLoading(true);
    try {
      const [w, purchs, sess] = await Promise.all([
        base44.entities.Workshop.get(workshopId),
        base44.entities.WorkshopPurchase.list('-purchase_date'),
        base44.entities.WorkshopSession.list('-session_number')
      ]);
      setWorkshop(w);
      setPurchases(purchs.filter(p => p.workshop_id === workshopId));
      const sortedSessions = sess.filter(s => s.workshop_id === workshopId).sort((a, b) => (a.session_number || 0) - (b.session_number || 0));
      setSessions(sortedSessions);

      const today = todayGregorian();
      const pastSessions = sortedSessions.filter(s => s.session_date && s.session_date <= today);
      if (pastSessions.length > 0) {
        const latest = pastSessions.sort((a, b) => (b.session_date || '').localeCompare(a.session_date || ''))[0];
        setActiveSessionId(latest.id);
      } else if (sortedSessions.length > 0) {
        setActiveSessionId(sortedSessions[sortedSessions.length - 1].id);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [workshopId]);

  const toggleAttendance = async (session, phone) => {
    const present = session.present_phones || [];
    const updated = present.includes(phone) ? present.filter(p => p !== phone) : [...present, phone];
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, present_phones: updated } : s));
    await base44.entities.WorkshopSession.update(session.id, { present_phones: updated });
  };

  // Someone who came to this one session without registering: saved on the
  // session (not as a registration), marked present, and added to People.
  const saveGuests = async (session, present_phones, guests) => {
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, present_phones, guests } : s));
    await base44.entities.WorkshopSession.update(session.id, { present_phones, guests });
  };
  const addGuest = async (session) => {
    const { person_name, person_phone } = guestForm;
    if (!person_phone) return;
    await findOrCreatePerson(person_phone, person_name);
    const guests = session.guests || [];
    await saveGuests(session,
      [...new Set([...(session.present_phones || []), person_phone])],
      guests.some(g => g.phone === person_phone) ? guests : [...guests, { name: person_name, phone: person_phone }]);
    setGuestForm(null);
  };
  const removeGuest = (session, phone) => saveGuests(session,
    (session.present_phones || []).filter(p => p !== phone),
    (session.guests || []).filter(g => g.phone !== phone));

  const markAllPresent = async (session, phones) => {
    const updated = [...new Set([...(session.present_phones || []), ...phones])];
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, present_phones: updated } : s));
    await base44.entities.WorkshopSession.update(session.id, { present_phones: updated });
  };

  const isNewWorkshop = workshop?.session_dates && workshop.session_dates.length > 0;
  const getSessionParticipants = (session) => {
    if (isNewWorkshop) {
      return purchases.filter(p => {
        if (p.registration_type === 'full') return true;
        if (p.registration_type === 'single' && p.selected_sessions) {
          return p.selected_sessions.includes(session.session_number);
        }
        return true;
      });
    }
    return purchases;
  };

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const activeParticipants = activeSession ? getSessionParticipants(activeSession) : [];
  const activePhones = [...new Set(activeParticipants.map(p => p.person_phone).filter(Boolean))];
  const registeredPhones = new Set(activePhones);
  const rows = [
    ...activeParticipants.map(p => ({ key: p.id, name: p.person_name, phone: p.person_phone })),
    ...(activeSession?.guests || []).filter(g => !registeredPhones.has(g.phone)).map(g => ({ key: `guest-${g.phone}`, name: g.name, phone: g.phone, guest: true })),
  ];
  const allPresent = activePhones.length > 0 && activePhones.every(ph => (activeSession.present_phones || []).includes(ph));

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!workshop) return <div className="p-6 text-center text-muted-foreground">کارگاهی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link to={`/workshops/${workshop.id}`} className="text-xl font-bold hover:text-[#B74B40] transition-colors">{workshop.title}</Link>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {workshop.day_of_week && <span className="flex items-center gap-1"><CalendarIcon className="w-3.5 h-3.5" /> {dayLabels[workshop.day_of_week] || workshop.day_of_week}</span>}
              {(workshop.start_time || workshop.end_time) && <span>{workshopTimeLabel(workshop, ' تا ')}</span>}
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {toPersianNum(purchases.length)} ثبت‌نامی</span>
            </div>
          </div>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          هنوز جلسه‌ای برای این کارگاه ثبت نشده است. برای افزودن جلسه، از بخش ویرایش کارگاه و تقویم آن استفاده کنید.
        </div>
      ) : (
        <div>
          {/* Session tabs */}
          <div className="flex items-center gap-2 flex-wrap border-b border-border pb-1">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setActiveSessionId(session.id)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  activeSessionId === session.id
                    ? 'bg-[#B74B40] text-white'
                    : 'bg-white border border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                جلسه {toPersianNum(session.session_number)}
              </button>
            ))}
          </div>

          {/* Active session content */}
          {activeSession && (
            <div className="bg-white rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full border-2 border-[#B74B40] text-[#B74B40] flex items-center justify-center text-sm font-bold">
                    {toPersianNum(activeSession.session_number)}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">جلسه {toPersianNum(activeSession.session_number)}</p>
                    <p className="text-xs text-muted-foreground">{toJalaliStr(activeSession.session_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{toPersianNum((activeSession.present_phones || []).length)} از {toPersianNum(rows.length)} نفر حاضر</span>
                  <button onClick={() => setGuestForm({ person_name: '', person_phone: '' })} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium border border-border hover:bg-muted">
                    <Plus className="w-3.5 h-3.5" /> افزودن مهمان
                  </button>
                  {activePhones.length > 0 && (
                    <button
                      onClick={() => markAllPresent(activeSession, activePhones)}
                      disabled={allPresent}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
                    >
                      <Check className="w-3.5 h-3.5" /> {allPresent ? 'همه حاضرند' : 'همه حاضر'}
                    </button>
                  )}
                </div>
              </div>
              {guestForm && (
                <div className="p-4 border-b border-border flex flex-wrap items-end gap-2">
                  <div className="flex-1 min-w-[240px]">
                    <PersonSearch personName={guestForm.person_name} personPhone={guestForm.person_phone} onNameChange={v => setGuestForm(prev => ({ ...prev, person_name: v }))} onPhoneChange={v => setGuestForm(prev => ({ ...prev, person_phone: v }))} />
                  </div>
                  <button onClick={() => addGuest(activeSession)} disabled={!guestForm.person_phone} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">افزودن و حاضر</button>
                  <button onClick={() => setGuestForm(null)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
                </div>
              )}
              {rows.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">هنوز کسی در این جلسه ثبت‌نام نکرده است</div>
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
                      {rows.map(p => {
                        const presentSet = new Set(activeSession.present_phones || []);
                        const isPresent = presentSet.has(p.phone);
                        return (
                          <tr key={p.key} className="border-t border-border hover:bg-muted/20">
                            <td className="p-3 font-medium">
                              {p.name || '-'}
                              {p.guest && <span className="mr-2 px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground">مهمان</span>}
                              {p.guest && <button onClick={() => removeGuest(activeSession, p.phone)} aria-label="حذف مهمان" className="mr-1 align-middle text-muted-foreground hover:text-red-600"><X className="w-3.5 h-3.5 inline" /></button>}
                            </td>
                            <td className="p-3 text-muted-foreground" dir="ltr">{p.phone}</td>
                            <td className="p-3 text-center">
                              <button
                                onClick={() => toggleAttendance(activeSession, p.phone)}
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
          )}
        </div>
      )}
    </div>
  );
}
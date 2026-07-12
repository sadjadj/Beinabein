import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck, ArrowRight, Calendar as CalendarIcon, MapPin, Users, Search, CheckCircle2 } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { CardGridSkeleton } from '@/components/SkeletonPatterns';

export default function AttendancePage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ws, purchs, sess] = await Promise.all([
          base44.entities.Workshop.list('-start_date', 500),
          base44.entities.WorkshopPurchase.list('-purchase_date', 500),
          base44.entities.WorkshopSession.list('-created_date', 500)
        ]);
        setWorkshops(ws);
        setPurchases(purchs);
        setSessions(sess);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const getSessionCount = (workshopId) => sessions.filter(s => s.workshop_id === workshopId).length;

  const toggleEnded = async (e, w) => {
    e.stopPropagation();
    await base44.entities.Workshop.update(w.id, { is_ended: !w.is_ended });
    setWorkshops(prev => prev.map(x => x.id === w.id ? { ...x, is_ended: !x.is_ended } : x));
  };

  const filtered = workshops.filter(w => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (w.title || '').toLowerCase().includes(s) ||
      (w.tags || '').toLowerCase().includes(s) ||
      (w.space || '').toLowerCase().includes(s);
  });

  const active = filtered.filter(w => !w.is_ended);
  const ended = filtered.filter(w => w.is_ended);

  const renderCard = (w) => {
    const rev = computeWorkshopRevenue(w, purchases);
    const sessionCount = getSessionCount(w.id);
    return (
      <button
        key={w.id}
        onClick={() => navigate(`/attendance/${w.id}`)}
        className="bg-white rounded-xl border border-border p-5 text-right hover:shadow-md hover:border-[#B74B40]/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/workshops/${w.id}`} className="font-semibold text-sm hover:text-[#B74B40] transition-colors">{w.title}</Link>
            {w.tags && <p className="text-xs text-muted-foreground mt-1">{w.tags}</p>}
          </div>
          <ClipboardCheck className="w-5 h-5 text-[#B74B40] flex-shrink-0" />
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {w.day_of_week && (
            <p className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> {dayLabels[w.day_of_week]} {(w.start_time || w.end_time) && `• ${w.start_time || ''}${w.end_time ? ' تا ' + w.end_time : ''}`}
            </p>
          )}
          {w.space && (
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {w.space}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {toPersianNum(rev.participantCount)} ثبت‌نام
            </span>
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5" /> {toPersianNum(sessionCount)} جلسه
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-xs text-[#B74B40] font-medium">
            مشاهده حضور غیاب <ArrowRight className="w-3.5 h-3.5" />
          </span>
          <button
            onClick={(e) => toggleEnded(e, w)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium border transition-colors ${w.is_ended ? 'border-gray-300 text-gray-600 hover:bg-gray-50' : 'border-[#B9834B] text-[#B9834B] hover:bg-[#FBF3EC]'}`}
          >
            <CheckCircle2 className="w-3 h-3" /> {w.is_ended ? 'پایان‌یافته' : 'پایان کارگاه'}
          </button>
        </div>
      </button>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">حضور غیاب</h1>
          <p className="text-sm text-muted-foreground mt-1">برای ثبت حضور غیاب، روی کارگاه مورد نظر کلیک کنید</p>
        </div>
        <div className="relative flex-1 sm:flex-none min-w-[150px]">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="جستجوی کارگاه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-56" />
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : workshops.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          هنوز کارگاهی ثبت نشده است
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">کارگاه‌های فعال</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(renderCard)}
              </div>
            </div>
          )}
          {ended.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">کارگاه‌های پایان‌یافته</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
                {ended.map(renderCard)}
              </div>
            </div>
          )}
          {active.length === 0 && ended.length === 0 && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">نتیجه‌ای یافت نشد</div>
          )}
        </>
      )}
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ClipboardCheck, ArrowRight, Calendar as CalendarIcon, MapPin, Users, Search, CheckCircle2 } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { CardGridSkeleton } from '@/components/SkeletonPatterns';
import { computeGroupTotalSessions } from '@/lib/groupSessions';

export default function GroupAttendanceListPage({ embedded = false }) {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [gs, purchs] = await Promise.all([
          base44.entities.Group.list('-start_date', 500),
          base44.entities.GroupPurchase.list('-purchase_date', 1000)
        ]);
        setGroups(gs);
        setPurchases(purchs);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const filtered = groups.filter(g => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (g.title || '').toLowerCase().includes(s) ||
      (g.tags || '').toLowerCase().includes(s) ||
      (g.space || '').toLowerCase().includes(s);
  });

  const active = filtered.filter(g => !g.is_ended);
  const ended = filtered.filter(g => g.is_ended);

  const renderCard = (g) => {
    const gPurchases = purchases.filter(p => p.group_id === g.id);
    const totalSessions = computeGroupTotalSessions(g);
    const dayText = (g.schedule || []).map(s => `${dayLabels[s.day]} ${s.start_time || ''}${s.end_time ? ' تا ' + s.end_time : ''}`).join('، ');
    return (
      <button
        key={g.id}
        onClick={() => navigate(`/groups/attendance/${g.id}`)}
        className="bg-white rounded-xl border border-border p-5 text-right hover:shadow-md hover:border-[#B74B40]/30 transition-all"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Link to={`/groups/${g.id}`} className="font-semibold text-sm hover:text-[#B74B40] transition-colors">{g.title}</Link>
            {g.tags && <p className="text-xs text-muted-foreground mt-1">{g.tags}</p>}
          </div>
          <ClipboardCheck className="w-5 h-5 text-[#B74B40] flex-shrink-0" />
        </div>
        <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
          {dayText && (
            <p className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> {dayText}
            </p>
          )}
          {g.space && (
            <p className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> {g.space}
            </p>
          )}
          <div className="flex items-center gap-3 pt-2">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {toPersianNum(gPurchases.length)} ثبت‌نام
            </span>
            <span className="flex items-center gap-1">
              <ClipboardCheck className="w-3.5 h-3.5" /> {toPersianNum(totalSessions)} جلسه
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="flex items-center gap-1 text-xs text-[#B74B40] font-medium">
            مشاهده حضور غیاب <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </button>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold">حضور غیاب گروه‌ها</h1>
            <p className="text-sm text-muted-foreground mt-1">برای ثبت حضور غیاب، روی گروه مورد نظر کلیک کنید</p>
          </div>
        )}
        <div className="relative flex-1 sm:flex-none min-w-[150px]">
          <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="جستجوی گروه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-56" />
        </div>
      </div>

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          هنوز گروهی ثبت نشده است
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">گروه‌های فعال</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map(renderCard)}
              </div>
            </div>
          )}
          {ended.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">گروه‌های پایان‌یافته</h3>
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
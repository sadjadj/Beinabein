import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Layers, Users, Plus, Archive, Calendar, Clock, MapPin, ChevronRight, ChevronLeft, Ban } from 'lucide-react';
import { toPersianNum, formatCurrency, findOrCreatePerson } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort, getJalaliParts } from '@/lib/jalali';
import { computeGroupSessions, computeGroupTotalSessions } from '@/lib/groupSessions';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import GroupForm from '@/components/GroupForm';

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

export default function GroupsPage({ embedded = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [groups, setGroups] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [facilitatorFilter, setFacilitatorFilter] = useState('');
  const [spaceFilter, setSpaceFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [archivedPage, setArchivedPage] = useState(1);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gs, purchs, facs, spcs] = await Promise.all([
        base44.entities.Group.list('-start_date', 500),
        base44.entities.GroupPurchase.list('-purchase_date', 1000),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100)
      ]);
      setGroups(gs);
      setPurchases(purchs);
      setFacilitators(facs);
      setSpaces(spcs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (form, plans) => {
    if (!form.title) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null,
        schedule: (form.schedule || []).map(s => ({ day: s.day, start_time: s.start_time, end_time: s.end_time }))
      };
      const created = await base44.entities.Group.create(payload);
      const validPlans = (plans || []).filter(p => p.name && p.price !== '' && p.price !== null);
      if (validPlans.length > 0) {
        await base44.entities.GroupPlan.bulkCreate(
          validPlans.map(p => ({ group_id: created.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false }))
        );
      }
      await base44.entities.GroupPlan.create({ group_id: created.id, name: 'رایگان', price: 0, is_active: false });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const blankForm = {
    title: '', description: '', tags: '', facilitator_ids: [], space: '',
    schedule: [], start_date: '', capacity: '', facilitator_percentage: ''
  };

  const filteredGroups = groups.filter(g => {
    if (facilitatorFilter && !(g.facilitator_ids || []).includes(facilitatorFilter)) return false;
    if (spaceFilter && g.space !== spaceFilter) return false;
    if (nameFilter && !(g.title || '').toLowerCase().includes(nameFilter.toLowerCase())) return false;
    return true;
  });

  const sortedGroups = [...filteredGroups].sort((a, b) => {
    if (sortBy === 'date_asc') return (a.start_date || '').localeCompare(b.start_date || '');
    if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
    return (b.start_date || '').localeCompare(a.start_date || '');
  });

  const activeGroups = sortedGroups.filter(g => !g.is_ended);
  const archivedGroups = sortedGroups.filter(g => g.is_ended).sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
  const ARCHIVED_PAGE_SIZE = 10;
  const archivedTotalPages = Math.max(1, Math.ceil(archivedGroups.length / ARCHIVED_PAGE_SIZE));
  const currentPage = Math.min(archivedPage, archivedTotalPages);
  const paginatedArchived = archivedGroups.slice((currentPage - 1) * ARCHIVED_PAGE_SIZE, currentPage * ARCHIVED_PAGE_SIZE);

  const monthLabel = (() => { try { return jMonths[getJalaliParts(todayGregorian()).jm - 1]; } catch { return ''; } })();

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!embedded && (
          <div>
            <h1 className="text-2xl font-bold">گروه‌ها</h1>
            <p className="text-sm text-muted-foreground mt-1">مدیریت گروه‌ها و ثبت‌نامی‌ها</p>
          </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت گروه
          </button>
        </div>
      </div>

      {showForm && (
        <GroupForm
          initialForm={blankForm}
          initialPlans={[]}
          facilitators={facilitators}
          spaces={spaces}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
          submitLabel="ثبت گروه"
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" placeholder="فیلتر نام گروه..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm w-40" />
        <select value={facilitatorFilter} onChange={e => setFacilitatorFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
          <option value="">همه تسهیلگرها</option>
          {facilitators.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
        </select>
        <select value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
          <option value="">همه فضاها</option>
          {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
          <option value="date_desc">جدیدترین</option>
          <option value="date_asc">قدیمی‌ترین</option>
          <option value="name_asc">نام (A-Z)</option>
          <option value="name_desc">نام (Z-A)</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">گروه‌های فعال ({toPersianNum(activeGroups.length)})</h3>
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : activeGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">{facilitatorFilter || spaceFilter ? 'نتیجه‌ای یافت نشد' : 'هنوز گروه فعالی ثبت نشده است'}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeGroups.map(g => {
              const gPurchases = purchases.filter(p => p.group_id === g.id);
              const totalAmount = gPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
              const paidAmount = gPurchases.filter(p => p.is_paid).reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
              const facNames = (g.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
              const totalSessions = computeGroupTotalSessions(g);
              const dayText = (g.schedule || []).map(s => dayLabels[s.day]).join('، ');
              return (
                <Link key={g.id} to={`/groups/${g.id}`} className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-[#B74B40]/30 transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{g.title}</h3>
                      {g.tags && <p className="text-xs text-muted-foreground mt-1 truncate">{g.tags}</p>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                    {dayText && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dayText}</span>}
                    {g.space && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {g.space}</span>}
                    {totalSessions > 0 && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {toPersianNum(totalSessions)} جلسه برگزار شده</span>}
                  </div>
                  {facNames && <p className="text-xs text-muted-foreground mt-2 truncate">{facNames}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-sm font-medium">{toPersianNum(gPurchases.length)} ثبت‌نام{g.capacity ? ` از ${toPersianNum(g.capacity)}` : ''}</span>
                    <span className="text-sm font-bold text-[#B74B40]">{formatCurrency(paidAmount)} از {formatCurrency(totalAmount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {archivedGroups.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4 text-muted-foreground" /> گروه‌های پایان‌یافته ({toPersianNum(archivedGroups.length)})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">گروه</th>
                  <th className="text-right p-3 font-medium">تسهیلگر</th>
                  <th className="text-right p-3 font-medium">روز</th>
                  <th className="text-right p-3 font-medium">شروع</th>
                  <th className="text-right p-3 font-medium">پایان</th>
                  <th className="text-right p-3 font-medium">فضا</th>
                  <th className="text-center p-3 font-medium">ثبت‌نامی</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArchived.map(g => {
                  const gPurchases = purchases.filter(p => p.group_id === g.id);
                  const facNames = (g.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
                  const dayText = (g.schedule || []).map(s => dayLabels[s.day]).join('، ');
                  return (
                    <tr key={g.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/groups/${g.id}`} className="font-medium text-muted-foreground hover:text-[#B74B40]">{g.title}</Link>
                        {g.tags && <p className="text-xs text-muted-foreground mt-0.5">{g.tags}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{facNames || '-'}</td>
                      <td className="p-3 text-xs">{dayText || '-'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{g.start_date ? formatJalaliShort(g.start_date) : '-'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{g.ended_at ? formatJalaliShort(g.ended_at) : '-'}</td>
                      <td className="p-3 text-xs">{g.space || '-'}</td>
                      <td className="p-3 text-center font-medium">{toPersianNum(gPurchases.length)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {archivedTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-3 border-t border-border">
              <button onClick={() => setArchivedPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="text-sm text-muted-foreground">صفحه {toPersianNum(currentPage)} از {toPersianNum(archivedTotalPages)}</span>
              <button onClick={() => setArchivedPage(Math.min(archivedTotalPages, currentPage + 1))} disabled={currentPage >= archivedTotalPages} className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
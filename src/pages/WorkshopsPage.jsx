import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Plus, Wallet, Archive, Calendar, Clock, MapPin, ChevronRight, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { computeWorkshopRevenue, toPersianNum, formatCurrency, getDateRange } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort } from '@/lib/jalali';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import WorkshopForm from '@/components/WorkshopForm';

export default function WorkshopsPage({ embedded = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [nameFilter, setNameFilter] = useState(searchParams.get('name') || '');
  const [facilitatorFilter, setFacilitatorFilter] = useState(searchParams.get('facilitator') || '');
  const [spaceFilter, setSpaceFilter] = useState(searchParams.get('space') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date_desc');
  const [archivedPage, setArchivedPage] = useState(1);

  // Persist filters to URL
  useEffect(() => {
    const params = {};
    if (nameFilter) params.name = nameFilter;
    if (facilitatorFilter) params.facilitator = facilitatorFilter;
    if (spaceFilter) params.space = spaceFilter;
    if (sortBy !== 'date_desc') params.sort = sortBy;
    setSearchParams(params, { replace: true });
  }, [nameFilter, facilitatorFilter, spaceFilter, sortBy]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ws, purchs, facs, spcs] = await Promise.all([
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Space.list('-created_date', 100)
      ]);
      setWorkshops(ws);
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
        price: Number(form.price) || 0,
        session_count: Number(form.session_count) || null,
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null
      };
      const created = await base44.entities.Workshop.create(payload);
      // Create WorkshopSession records for each selected date
      if ((form.session_dates || []).length > 0) {
        await base44.entities.WorkshopSession.bulkCreate(
          (form.session_dates || []).map((date, i) => ({
            workshop_id: created.id,
            workshop_title: form.title,
            session_number: i + 1,
            session_date: date,
            present_phones: []
          }))
        );
      }
      // Create workshop plans
      const validPlans = (plans || []).filter(p => p.name && p.price !== '' && p.price !== null);
      if (validPlans.length > 0) {
        await base44.entities.WorkshopPlan.bulkCreate(
          validPlans.map(p => ({ workshop_id: created.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false }))
        );
      }
      // Auto-create a default "رایگان" (free) plan, inactive
      await base44.entities.WorkshopPlan.create({ workshop_id: created.id, name: 'رایگان', price: 0, is_active: false });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const blankForm = {
    title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '',
    facilitator_ids: [], space: '', start_time: '', end_time: '', day_of_week: '',
    start_date: '', end_date: '', facilitator_percentage: '', capacity: '', session_dates: []
  };

  // Monthly stats (current Jalali month)
  const monthRange = getDateRange('month', null, null);
  const inMonth = (date) => !!(date && (!monthRange || (date >= monthRange.start && date <= monthRange.end)));
  const monthWorkshops = workshops.filter(w => inMonth(w.start_date));
  const monthPurchases = purchases.filter(p => inMonth(p.purchase_date));
  const monthUniquePhones = new Set(monthPurchases.map(p => p.person_phone));
  const monthRevenue = monthPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);

  const filteredWorkshops = workshops.filter(w => {
    if (facilitatorFilter && !(w.facilitator_ids || []).includes(facilitatorFilter)) return false;
    if (spaceFilter && w.space !== spaceFilter) return false;
    if (nameFilter && !(w.title || '').toLowerCase().includes(nameFilter.toLowerCase())) return false;
    return true;
  });

  const sortedWorkshops = [...filteredWorkshops].sort((a, b) => {
    if (sortBy === 'date_asc') return (a.start_date || '').localeCompare(b.start_date || '');
    if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
    return (b.start_date || '').localeCompare(a.start_date || '');
  });

  const activeWorkshops = sortedWorkshops.filter(w => !w.is_ended);
  const archivedWorkshops = sortedWorkshops.filter(w => w.is_ended).sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
  const ARCHIVED_PAGE_SIZE = 10;
  const archivedTotalPages = Math.max(1, Math.ceil(archivedWorkshops.length / ARCHIVED_PAGE_SIZE));
  const currentPage = Math.min(archivedPage, archivedTotalPages);
  const paginatedArchived = archivedWorkshops.slice((currentPage - 1) * ARCHIVED_PAGE_SIZE, currentPage * ARCHIVED_PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">کارگاه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت کارگاه‌ها و ثبت‌نامی‌ها</p>
        </div>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت کارگاه
          </button>
        </div>
      </div>

      {showForm && (
        <WorkshopForm
          initialForm={blankForm}
          initialPlans={[]}
          facilitators={facilitators}
          spaces={spaces}
          isAdmin={isAdmin}
          attendanceByDate={{}}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          submitting={submitting}
          submitLabel="ثبت کارگاه"
        />
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <input type="text" placeholder="فیلتر نام کارگاه..." value={nameFilter} onChange={e => setNameFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm w-40" />
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

      {/* Active workshops — cards */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">کارگاه‌های فعال ({toPersianNum(activeWorkshops.length)})</h3>
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : activeWorkshops.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">{facilitatorFilter || spaceFilter ? 'نتیجه‌ای یافت نشد' : 'هنوز کارگاه فعالی ثبت نشده است'}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkshops.map(w => {
              const wsPurchases = purchases.filter(p => p.workshop_id === w.id);
              const rev = computeWorkshopRevenue(w, wsPurchases);
              const totalAmount = wsPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
              const paidAmount = wsPurchases.filter(p => p.is_paid).reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
              const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
              return (
                <Link key={w.id} to={`/workshops/${w.id}`} className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-[#B74B40]/30 transition-all flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{w.title}</h3>
                      {w.tags && <p className="text-xs text-muted-foreground mt-1 truncate">{w.tags}</p>}
                    </div>
                    {w.is_permanent && <span className="px-2 py-0.5 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs flex-shrink-0">دائمی</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
                    {w.day_of_week && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dayLabels[w.day_of_week] || w.day_of_week}</span>}
                    {(w.start_time || w.end_time) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {w.start_time}{w.end_time ? ` - ${w.end_time}` : ''}</span>}
                    {w.space && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {w.space}</span>}
                  </div>
                  {facNames && <p className="text-xs text-muted-foreground mt-2 truncate">{facNames}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-sm font-medium">{toPersianNum(rev.purchaseCount)} ثبت‌نام{w.capacity ? ` از ${toPersianNum(w.capacity)}` : ''}</span>
                    <span className="text-sm font-bold text-[#B74B40]">{formatCurrency(paidAmount)} از {formatCurrency(totalAmount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived workshops — table */}
      {archivedWorkshops.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold flex items-center gap-2"><Archive className="w-4 h-4 text-muted-foreground" /> کارگاه‌های آرشیو شده ({toPersianNum(archivedWorkshops.length)})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-right p-3 font-medium">تسهیلگر</th>
                  <th className="text-right p-3 font-medium">روز</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">فضا</th>
                  <th className="text-center p-3 font-medium">ثبت‌نامی</th>
                </tr>
              </thead>
              <tbody>
                {paginatedArchived.map(w => {
                  const rev = computeWorkshopRevenue(w, purchases.filter(p => p.workshop_id === w.id));
                  const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
                  return (
                    <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/workshops/${w.id}`} className="font-medium text-muted-foreground hover:text-[#B74B40]">{w.title}</Link>
                        {w.tags && <p className="text-xs text-muted-foreground mt-0.5">{w.tags}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{facNames || '-'}</td>
                      <td className="p-3 text-xs">{w.day_of_week ? (dayLabels[w.day_of_week] || w.day_of_week) : '-'}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{w.start_date ? formatJalaliShort(w.start_date) : '-'}</td>
                      <td className="p-3 text-xs">{w.space || '-'}</td>
                      <td className="p-3 text-center font-medium">{toPersianNum(rev.purchaseCount)}</td>
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
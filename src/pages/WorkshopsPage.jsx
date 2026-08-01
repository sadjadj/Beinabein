import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Plus, Wallet, Search, Archive, Calendar, Clock, MapPin } from 'lucide-react';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import { Link } from 'react-router-dom';
import { computeWorkshopRevenue, toPersianNum, formatCurrency, getDateRange } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { todayGregorian, formatJalaliShort } from '@/lib/jalali';
import FloatingDateInput from '@/components/FloatingDateInput';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import { TableSkeleton } from '@/components/SkeletonPatterns';

export default function WorkshopsPage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [facilitatorFilter, setFacilitatorFilter] = useState(searchParams.get('fac') || '');
  const [spaceFilter, setSpaceFilter] = useState(searchParams.get('space') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'date_desc');
  const [archivedPage, setArchivedPage] = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    const params = {};
    if (search) params.q = search;
    if (facilitatorFilter) params.fac = facilitatorFilter;
    if (spaceFilter) params.space = spaceFilter;
    if (sortBy !== 'date_desc') params.sort = sortBy;
    setSearchParams(params, { replace: true });
    setArchivedPage(1);
  }, [search, facilitatorFilter, spaceFilter, sortBy]);
  const [form, setForm] = useState({
    title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '',
    facilitator_ids: [], space: '', start_time: '', end_time: '', day_of_week: 'saturday',
    start_date: todayGregorian(), end_date: '', facilitator_percentage: '', capacity: ''
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        session_count: form.is_permanent ? null : (Number(form.session_count) || null),
        facilitator_percentage: Number(form.facilitator_percentage) || 0,
        capacity: Number(form.capacity) || null
      };
      await base44.entities.Workshop.create(payload);
      setForm({ title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '', facilitator_ids: [], space: '', start_time: '', end_time: '', day_of_week: 'saturday', start_date: todayGregorian(), end_date: '', facilitator_percentage: '', capacity: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
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
    if (!search) return true;
    const s = search.toLowerCase();
    const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join(' ');
    return (w.title || '').toLowerCase().includes(s) ||
      (w.tags || '').toLowerCase().includes(s) ||
      facNames.toLowerCase().includes(s);
  });

  const sortedWorkshops = [...filteredWorkshops].sort((a, b) => {
    if (sortBy === 'date_asc') return (a.start_date || '').localeCompare(b.start_date || '');
    if (sortBy === 'name_asc') return (a.title || '').localeCompare(b.title || '');
    if (sortBy === 'name_desc') return (b.title || '').localeCompare(a.title || '');
    return (b.start_date || '').localeCompare(a.start_date || '');
  });

  const activeWorkshops = sortedWorkshops.filter(w => !w.is_ended);
  const archivedWorkshops = [...filteredWorkshops].filter(w => w.is_ended)
    .sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
  const archivedTotalPages = Math.max(1, Math.ceil(archivedWorkshops.length / PAGE_SIZE));
  const archivedPaged = archivedWorkshops.slice((archivedPage - 1) * PAGE_SIZE, archivedPage * PAGE_SIZE);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">کارگاه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت کارگاه‌ها و ثبت‌نامی‌ها</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-56" />
          </div>
          <button onClick={() => { setShowForm(!showForm); setForm({ title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '', facilitator_ids: [], space: '', start_time: '', end_time: '', day_of_week: 'saturday', start_date: todayGregorian(), end_date: '', facilitator_percentage: '', capacity: '' }); }} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت کارگاه
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="کارگاه‌های این ماه" value={toPersianNum(monthWorkshops.length)} icon={GraduationCap} color="terracotta" info="تعداد کارگاه‌هایی که در ماه شمسی جاری آغاز شده‌اند." />
        <StatCard label="ثبت‌نامی این ماه" value={toPersianNum(monthPurchases.length)} icon={Users} color="teal" info="تعداد کل ثبت‌نام‌های انجام‌شده در ماه شمسی جاری." />
        <StatCard label="افراد یونیک این ماه" value={toPersianNum(monthUniquePhones.size)} icon={Users} color="ochre" info="تعداد افراد متمایز (بر اساس شماره تلفن) که در ماه جاری ثبت‌نام کرده‌اند." />
        <StatCard label="درآمد این ماه" value={formatCurrency(monthRevenue)} icon={Wallet} color="pink" info="مجموع درآمد حاصل از ثبت‌نام‌های کارگاه در ماه شمسی جاری (شامل دونیشین)." />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">اسم کارگاه</label>
                <input type="text" placeholder="اسم کارگاه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-48" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">قیمت به تومان</label>
                <PriceInput value={form.price} onChange={v => setForm({ ...form, price: v })} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تعداد جلسه</label>
                <PersianNumberInput value={form.session_count} onChange={v => setForm({ ...form, session_count: v })} placeholder="تعداد جلسه" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-28 text-right disabled:opacity-50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">درصد تسهیلگر</label>
                <PersianNumberInput value={form.facilitator_percentage} onChange={v => setForm({ ...form, facilitator_percentage: v })} placeholder="درصد" className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-20 text-right" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تگ کارگاه (موضوعات)</label>
                <input type="text" placeholder="موضوعات" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-32" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ظرفیت</label>
                <PersianNumberInput value={form.capacity} onChange={v => setForm({ ...form, capacity: v })} placeholder="ظرفیت" required={false} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-24 text-right" />
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ساعت شروع</label>
                <input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">ساعت پایان</label>
                <input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">روز کارگاه</label>
                <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {Object.entries(dayLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">فضای برگزاری</label>
                <select value={form.space} onChange={e => setForm({ ...form, space: e.target.value })} className="px-4 py-2 rounded-lg border border-input bg-background text-sm min-w-[160px]">
                  <option value="">انتخاب فضا...</option>
                  {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع</label>
                  <FloatingDateInput value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} showToday={false} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">تاریخ پایان</label>
                  <FloatingDateInput value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} showToday={false} placeholder="" />
                </div>
              </div>
            </div>
            <textarea placeholder="توضیحات کارگاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div>
              <label className="text-xs text-muted-foreground block mb-2">تسهیلگران:</label>
              <FacilitatorMultiSearch selectedIds={form.facilitator_ids} onChange={ids => setForm({ ...form, facilitator_ids: ids })} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_permanent} onChange={e => setForm({ ...form, is_permanent: e.target.checked })} className="w-4 h-4" />
              کارگاه دائمی
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت کارگاه'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
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
          <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">{search || facilitatorFilter || spaceFilter ? 'نتیجه‌ای یافت نشد' : 'هنوز کارگاه فعالی ثبت نشده است'}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeWorkshops.map(w => {
              const rev = computeWorkshopRevenue(w, purchases.filter(p => p.workshop_id === w.id));
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
                    {w.day_of_week && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dayLabels[w.day_of_week]}</span>}
                    {(w.start_time || w.end_time) && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {w.start_time}{w.end_time ? ` - ${w.end_time}` : ''}</span>}
                    {w.space && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {w.space}</span>}
                  </div>
                  {facNames && <p className="text-xs text-muted-foreground mt-2 truncate">{facNames}</p>}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <span className="text-sm font-medium">{toPersianNum(rev.purchaseCount)} ثبت‌نام{w.capacity ? ` از ${toPersianNum(w.capacity)}` : ''}</span>
                    <span className="text-sm font-bold text-[#B74B40]">{formatCurrency(w.price)}</span>
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
                {archivedPaged.map(w => {
                  const rev = computeWorkshopRevenue(w, purchases.filter(p => p.workshop_id === w.id));
                  const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
                  return (
                    <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/workshops/${w.id}`} className="font-medium text-muted-foreground hover:text-[#B74B40]">{w.title}</Link>
                        {w.tags && <p className="text-xs text-muted-foreground mt-0.5">{w.tags}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{facNames || '-'}</td>
                      <td className="p-3 text-xs">{w.day_of_week ? dayLabels[w.day_of_week] : '-'}</td>
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
              <button onClick={() => setArchivedPage(p => Math.max(1, p - 1))} disabled={archivedPage === 1} className="px-3 py-1 rounded-lg border border-border text-xs disabled:opacity-40">قبلی</button>
              <span className="text-xs text-muted-foreground">صفحه {toPersianNum(archivedPage)} از {toPersianNum(archivedTotalPages)}</span>
              <button onClick={() => setArchivedPage(p => Math.min(archivedTotalPages, p + 1))} disabled={archivedPage === archivedTotalPages} className="px-3 py-1 rounded-lg border border-border text-xs disabled:opacity-40">بعدی</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
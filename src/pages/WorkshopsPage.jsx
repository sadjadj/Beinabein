import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Plus, Wallet, Search } from 'lucide-react';
import FacilitatorMultiSearch from '@/components/FacilitatorMultiSearch';
import { Link } from 'react-router-dom';
import { computeWorkshopStats, computeWorkshopRevenue, toPersianNum, formatCurrency } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian, formatJalaliShort } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import FloatingDateInput from '@/components/FloatingDateInput';
import FacilitatorSearch from '@/components/FacilitatorSearch';
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
  const [search, setSearch] = useState('');
  const [facilitatorFilter, setFacilitatorFilter] = useState('');
  const [spaceFilter, setSpaceFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
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

  const toggleFacilitator = (fid) => {
    setForm(prev => ({
      ...prev, facilitator_ids: prev.facilitator_ids.includes(fid)
        ? prev.facilitator_ids.filter(id => id !== fid)
        : [...prev.facilitator_ids, fid]
    }));
  };

  const stats = computeWorkshopStats(workshops, purchases, null);

  const filteredWorkshops = workshops.filter(w => {
    if (facilitatorFilter && !(w.facilitator_ids || []).includes(facilitatorFilter)) return false;
    if (spaceFilter && w.space !== spaceFilter) return false;
    if (statusFilter === 'active' && w.is_ended) return false;
    if (statusFilter === 'ended' && !w.is_ended) return false;
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
        <StatCard label="تعداد کارگاه" value={toPersianNum(stats.totalWorkshops)} icon={GraduationCap} color="terracotta" />
        <StatCard label="مجموع ثبت‌نامی" value={toPersianNum(stats.totalParticipants)} icon={Users} color="teal" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="ochre" />
        <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">درآمد کل</p>
              <p className="text-lg lg:text-xl font-bold mt-2 text-foreground break-words leading-tight">{formatCurrency(stats.totalRevenue)}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#FBF0F1] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#D98B94]" />
            </div>
          </div>
        </div>
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

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">کارگاه‌ها ({toPersianNum(filteredWorkshops.length)})</h3>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select value={facilitatorFilter} onChange={e => setFacilitatorFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="">همه تسهیلگرها</option>
              {facilitators.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
            </select>
            <select value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="">همه فضاها</option>
              {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <div className="flex items-center gap-1">
              {[['', 'همه'], ['active', 'فعال'], ['ended', 'پایان‌یافته']].map(([val, lbl]) => (
                <button key={val} onClick={() => setStatusFilter(val)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === val ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{lbl}</button>
              ))}
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="date_desc">جدیدترین</option>
              <option value="date_asc">قدیمی‌ترین</option>
              <option value="name_asc">نام (A-Z)</option>
              <option value="name_desc">نام (Z-A)</option>
            </select>
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : filteredWorkshops.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search ? 'نتیجه‌ای یافت نشد' : 'هنوز کارگاهی ثبت نشده است'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-right p-3 font-medium">تسهیلگر</th>
                  <th className="text-right p-3 font-medium">روز</th>
                  <th className="text-right p-3 font-medium">ساعت</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">فضا</th>
                  <th className="text-center p-3 font-medium">ثبت‌نامی</th>
                </tr>
              </thead>
              <tbody>
                {sortedWorkshops.map(w => {
                  const rev = computeWorkshopRevenue(w, purchases.filter(p => p.workshop_id === w.id));
                  const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
                  return (
                    <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <Link to={`/workshops/${w.id}`} className="font-medium hover:text-[#B74B40]">{w.title}</Link>
                        {w.tags && <p className="text-xs text-muted-foreground mt-0.5">{w.tags}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{facNames || '-'}</td>
                      <td className="p-3 text-xs">{w.day_of_week ? dayLabels[w.day_of_week] : '-'}</td>
                      <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">{w.start_time}{w.end_time ? ` - ${w.end_time}` : ''}</td>
                      <td className="p-3 text-xs whitespace-nowrap">{w.start_date ? formatJalaliShort(w.start_date) : '-'}</td>
                      <td className="p-3 text-xs">{w.space || '-'}</td>
                      <td className="p-3 text-center font-medium">{toPersianNum(rev.participantCount)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
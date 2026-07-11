import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, User, Search, GraduationCap } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { toPersianNum, countNewThisMonth } from '@/lib/stats';
import { formatJalaliShort } from '@/lib/jalali';
import PersianNumberInput from '@/components/PersianNumberInput';
import { sanitizePhone, sanitizeName } from '@/lib/inputUtils';

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ full_name: '', phone: '', social_id: '', brand_name: '', card_number: '', sheba_number: '', profit_percentage: '', bio: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facs, ws] = await Promise.all([
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.Workshop.list('-start_date', 500)
      ]);
      setFacilitators(facs);
      setWorkshops(ws);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.full_name || !form.phone) return;
    setSubmitting(true);
    try {
      await base44.entities.Facilitator.create({
        ...form, profit_percentage: Number(form.profit_percentage) || 0
      });
      setForm({ full_name: '', phone: '', social_id: '', brand_name: '', card_number: '', sheba_number: '', profit_percentage: '', bio: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const getLastWorkshop = (facId) => {
    const facWorkshops = workshops.filter(w => (w.facilitator_ids || []).includes(facId));
    if (facWorkshops.length === 0) return null;
    return facWorkshops.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))[0];
  };

  const filtered = facilitators.filter(f => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (f.full_name || '').toLowerCase().includes(s) ||
      (f.brand_name || '').toLowerCase().includes(s) ||
      (f.phone || '').includes(s);
  });

  const newThisMonth = countNewThisMonth(facilitators);
  const withWorkshops = facilitators.filter(f => workshops.some(w => (w.facilitator_ids || []).includes(f.id))).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">تسهیلگرها</h1>
          <p className="text-sm text-muted-foreground mt-1">فهرست تسهیلگرهای بینابین</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجوی تسهیلگر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-48" />
          </div>
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت تسهیلگر
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="کل تسهیلگرها" value={toPersianNum(facilitators.length)} icon={User} color="terracotta" />
        <StatCard label="تسهیلگرهای فعال" value={toPersianNum(withWorkshops)} icon={GraduationCap} color="ochre" sublabel="دارای کارگاه" />
        <StatCard label="افراد اضافه شده در این ماه" value={toPersianNum(newThisMonth)} icon={User} color="teal" />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="نام و نام خانوادگی *" value={form.full_name} onChange={e => setForm({ ...form, full_name: sanitizeName(e.target.value) })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="tel" placeholder="شماره تماس *" value={form.phone} onChange={e => setForm({ ...form, phone: sanitizePhone(e.target.value) })} dir="ltr" placeholder="۰xxxxxxxxxx" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" required />
            <input type="text" placeholder="آیدی شبکه اجتماعی" value={form.social_id} onChange={e => setForm({ ...form, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="نام برند" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره کارت" value={form.card_number} onChange={e => setForm({ ...form, card_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره شبا" value={form.sheba_number} onChange={e => setForm({ ...form, sheba_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <PersianNumberInput value={form.profit_percentage} onChange={v => setForm({ ...form, profit_percentage: v })} placeholder="درصد سود تسهیلگر" className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            <textarea placeholder="معرفی تسهیلگر" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="sm:col-span-2 lg:col-span-3 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">{search ? 'نتیجه‌ای یافت نشد' : 'هنوز تسهیلگری ثبت نشده است'}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(f => {
            const lastWs = getLastWorkshop(f.id);
            return (
              <Link key={f.id} to={`/facilitators/${f.id}`} className="bg-white rounded-xl border border-border p-5 hover:shadow-md hover:border-[#B74B40]/30 transition-all flex flex-col">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-[#B74B40]" />
                  </div>
                  <h3 className="font-semibold text-sm hover:text-[#B74B40] transition-colors leading-snug">{f.full_name}</h3>
                </div>
                <div className="mt-3 pt-3 border-t border-border min-h-[2.5rem] flex items-center">
                  {lastWs ? (
                    <div className="flex items-center gap-2 text-xs w-full">
                      <GraduationCap className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground flex-shrink-0">آخرین کارگاه:</span>
                      <span className="font-medium text-[#B74B40] truncate flex-1 min-w-0">{lastWs.title}</span>
                      <span className="text-muted-foreground flex-shrink-0 whitespace-nowrap">{formatJalaliShort(lastWs.start_date)}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground w-full text-center">هنوز کارگاهی برگزار نکرده است</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
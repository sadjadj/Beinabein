import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, User, Pencil, CreditCard, Percent, Wallet, ArrowLeft } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { computeWorkshopRevenue } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    const facWorkshops = workshops.filter(w => (w.facilitator_ids || []).includes(facId) && w.start_date);
    if (facWorkshops.length === 0) return null;
    return facWorkshops.sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))[0];
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تسهیلگرها</h1>
          <p className="text-sm text-muted-foreground mt-1">فهرست تسهیلگرهای بینابین</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت تسهیلگر
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="tel" placeholder="شماره تماس" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="text" placeholder="آیدی شبکه اجتماعی" value={form.social_id} onChange={e => setForm({ ...form, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="نام برند" value={form.brand_name} onChange={e => setForm({ ...form, brand_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره کارت" value={form.card_number} onChange={e => setForm({ ...form, card_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره شبا" value={form.sheba_number} onChange={e => setForm({ ...form, sheba_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="number" placeholder="درصد سود تسهیلگر" value={form.profit_percentage} onChange={e => setForm({ ...form, profit_percentage: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
      ) : facilitators.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">هنوز تسهیلگری ثبت نشده است</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilitators.map(f => {
            const lastWs = getLastWorkshop(f.id);
            return (
              <Link key={f.id} to={`/facilitators/${f.id}`} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-[#B74B40]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-sm hover:text-[#B74B40]">{f.full_name}</h3>
                    {f.brand_name && <p className="text-xs text-muted-foreground mt-0.5">{f.brand_name}</p>}
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.bio || 'بدون توضیحات'}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-border space-y-1.5">
                  {f.profit_percentage != null && (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> درصد سود</span>
                      <span className="font-medium text-foreground">{toPersianNum(f.profit_percentage)}٪</span>
                    </div>
                  )}
                  {lastWs ? (
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>آخرین کارگاه</span>
                      <Link to="/workshops" className="font-medium text-[#B74B40] hover:underline">{lastWs.title}</Link>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground text-center">هنوز کارگاهی برگزار نکرده است</div>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end gap-1 text-xs text-[#B74B40] font-medium">
                  مشاهده صفحه <ArrowLeft className="w-3.5 h-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
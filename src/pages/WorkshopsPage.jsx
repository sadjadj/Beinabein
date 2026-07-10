import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { GraduationCap, Users, Plus, Pencil, Check, X, Wallet, Calendar as CalendarIcon, MapPin, Clock } from 'lucide-react';
import { computeWorkshopStats, computeWorkshopRevenue, toPersianNum, formatCurrency } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

export default function WorkshopsPage() {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '',
    facilitator_ids: [], space: '', time: '', day_of_week: 'saturday',
    start_date: todayGregorian(), end_date: '', facilitator_percentage: ''
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
        facilitator_percentage: Number(form.facilitator_percentage) || 0
      };
      if (editingId) {
        await base44.entities.Workshop.update(editingId, payload);
        setEditingId(null);
      } else {
        await base44.entities.Workshop.create(payload);
      }
      setForm({ title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '', facilitator_ids: [], space: '', time: '', day_of_week: 'saturday', start_date: todayGregorian(), end_date: '', facilitator_percentage: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEdit = (w) => {
    setEditingId(w.id);
    setForm({
      title: w.title || '', price: w.price || '', session_count: w.session_count || '',
      is_permanent: w.is_permanent || false, description: w.description || '',
      tags: w.tags || '', facilitator_ids: w.facilitator_ids || [],
      space: w.space || '', time: w.time || '', day_of_week: w.day_of_week || 'saturday',
      start_date: w.start_date || todayGregorian(), end_date: w.end_date || '',
      facilitator_percentage: w.facilitator_percentage || ''
    });
    setShowForm(true);
  };

  const toggleFacilitator = (fid) => {
    setForm(prev => ({
      ...prev, facilitator_ids: prev.facilitator_ids.includes(fid)
        ? prev.facilitator_ids.filter(id => id !== fid)
        : [...prev.facilitator_ids, fid]
    }));
  };

  const toggleFacilitatorPaid = async (w) => {
    await base44.entities.Workshop.update(w.id, { facilitator_paid: !w.facilitator_paid });
    fetchData();
  };

  const stats = computeWorkshopStats(workshops, purchases, null);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">کارگاه‌ها</h1>
          <p className="text-sm text-muted-foreground mt-1">مدیریت کارگاه‌ها و ثبت‌نامی‌ها</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', price: '', session_count: '', is_permanent: false, description: '', tags: '', facilitator_ids: [], space: '', time: '', day_of_week: 'saturday', start_date: todayGregorian(), end_date: '', facilitator_percentage: '' }); }} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> {editingId ? 'ویرایش کارگاه' : 'ثبت کارگاه'}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد کارگاه" value={toPersianNum(stats.totalWorkshops)} icon={GraduationCap} color="terracotta" />
        <StatCard label="مجموع ثبت‌نامی" value={toPersianNum(stats.totalParticipants)} icon={Users} color="teal" />
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="ochre" />
        <StatCard label="درآمد کل" value={formatCurrency(stats.totalRevenue)} icon={Wallet} color="pink" />
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="اسم کارگاه" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="number" placeholder="قیمت (تومان)" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="number" placeholder="تعداد جلسه" value={form.session_count} onChange={e => setForm({ ...form, session_count: e.target.value })} disabled={form.is_permanent} className="px-3 py-2 rounded-lg border border-input bg-background text-sm disabled:opacity-50" />
              <input type="text" placeholder="تگ کارگاه (موضوعات)" value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="زمان کارگاه (مثلاً ۱۶:۰۰)" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <select value={form.day_of_week} onChange={e => setForm({ ...form, day_of_week: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(dayLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={form.space} onChange={e => setForm({ ...form, space: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">انتخاب فضا...</option>
                {spaces.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <input type="number" placeholder="درصد تسهیلگر" value={form.facilitator_percentage} onChange={e => setForm({ ...form, facilitator_percentage: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <JalaliDateInput value={form.start_date} onChange={v => setForm({ ...form, start_date: v })} />
              <JalaliDateInput value={form.end_date} onChange={v => setForm({ ...form, end_date: v })} />
            </div>
            <textarea placeholder="توضیحات کارگاه" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div>
              <p className="text-xs text-muted-foreground mb-2">تسهیلگران:</p>
              <div className="flex flex-wrap gap-2">
                {facilitators.map(f => (
                  <button key={f.id} type="button" onClick={() => toggleFacilitator(f.id)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${form.facilitator_ids.includes(f.id) ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
                    {f.full_name}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_permanent} onChange={e => setForm({ ...form, is_permanent: e.target.checked })} className="w-4 h-4" />
              کارگاه دائمی
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : editingId ? 'ذخیره' : 'ثبت کارگاه'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">کارگاه‌ها ({toPersianNum(workshops.length)})</h3></div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : workshops.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز کارگاهی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-right p-3 font-medium">تسهیلگر</th>
                  <th className="text-right p-3 font-medium">روز/ساعت</th>
                  <th className="text-right p-3 font-medium">فضا</th>
                  <th className="text-center p-3 font-medium">ثبت‌نامی</th>
                  <th className="text-right p-3 font-medium">درآمد کل</th>
                  <th className="text-right p-3 font-medium">دریافتی بینابین</th>
                  <th className="text-right p-3 font-medium">دریافتی تسهیلگر</th>
                  <th className="text-center p-3 font-medium">پرداخت تسهیلگر</th>
                  <th className="text-center p-3 font-medium">حضور غیاب</th>
                  <th className="text-center p-3 font-medium">ویرایش</th>
                </tr>
              </thead>
              <tbody>
                {workshops.map(w => {
                  const rev = computeWorkshopRevenue(w, purchases);
                  const facNames = (w.facilitator_ids || []).map(fid => facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
                  return (
                    <tr key={w.id} className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <p className="font-medium">{w.title}</p>
                        {w.tags && <p className="text-xs text-muted-foreground mt-0.5">{w.tags}</p>}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs">{facNames || '-'}</td>
                      <td className="p-3 text-xs">
                        {w.day_of_week && <span>{dayLabels[w.day_of_week]}</span>}
                        {w.time && <span className="text-muted-foreground block">{w.time}</span>}
                      </td>
                      <td className="p-3 text-xs">{w.space || '-'}</td>
                      <td className="p-3 text-center font-medium">{toPersianNum(rev.participantCount)}</td>
                      <td className="p-3">{formatCurrency(rev.totalRevenue)}</td>
                      <td className="p-3 text-[#B74B40] font-medium">{formatCurrency(rev.binabinRevenue)}</td>
                      <td className="p-3 text-[#B9834B]">{formatCurrency(rev.facilitatorRevenue)}</td>
                      <td className="p-3 text-center">
                        <button onClick={() => toggleFacilitatorPaid(w)} className={`text-xs ${w.facilitator_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>
                          {w.facilitator_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                        </button>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => navigate(`/attendance/${w.id}`)} className="text-xs text-[#B74B40] hover:underline">مشاهده</button>
                      </td>
                      <td className="p-3 text-center">
                        <button onClick={() => startEdit(w)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
                      </td>
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
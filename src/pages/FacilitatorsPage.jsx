import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, User, Pencil, Check, X, CreditCard, Percent, Wallet } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ full_name: '', photo_url: '', bio: '', phone: '', social_id: '', studio_name: '', card_number: '', profit_percentage: '', sheba_number: '' });

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
    if (!form.full_name) return;
    setSubmitting(true);
    try {
      const payload = { ...form, profit_percentage: Number(form.profit_percentage) || 0 };
      if (editingId) {
        await base44.entities.Facilitator.update(editingId, payload);
        setEditingId(null);
      } else {
        await base44.entities.Facilitator.create(payload);
      }
      setForm({ full_name: '', photo_url: '', bio: '', phone: '', social_id: '', studio_name: '', card_number: '', profit_percentage: '', sheba_number: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const startEdit = (f) => {
    setEditingId(f.id);
    setForm({ full_name: f.full_name || '', photo_url: f.photo_url || '', bio: f.bio || '', phone: f.phone || '', social_id: f.social_id || '', studio_name: f.studio_name || '', card_number: f.card_number || '', profit_percentage: f.profit_percentage || '', sheba_number: f.sheba_number || '' });
    setShowForm(true);
  };

  const getWorkshopCount = (facilitatorId) => workshops.filter(w => (w.facilitator_ids || []).includes(facilitatorId)).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تسهیلگرها</h1>
          <p className="text-sm text-muted-foreground mt-1">فهرست تسهیلگرهای بینابین</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ full_name: '', photo_url: '', bio: '', phone: '', social_id: '', studio_name: '', card_number: '', profit_percentage: '', sheba_number: '' }); }} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> {editingId ? 'ویرایش' : 'ثبت تسهیلگر'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            <input type="tel" placeholder="شماره تماس" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="آیدی شبکه اجتماعی" value={form.social_id} onChange={e => setForm({ ...form, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="اسم استودیو/برند" value={form.studio_name} onChange={e => setForm({ ...form, studio_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره کارت" value={form.card_number} onChange={e => setForm({ ...form, card_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="شماره شبا" value={form.sheba_number} onChange={e => setForm({ ...form, sheba_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="number" placeholder="درصد سود تسهیلگر" value={form.profit_percentage} onChange={e => setForm({ ...form, profit_percentage: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <input type="text" placeholder="آدرس عکس" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <textarea placeholder="معرفی تسهیلگر" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="sm:col-span-2 lg:col-span-3 w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : editingId ? 'ذخیره' : 'ثبت'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null); }} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
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
          {facilitators.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {f.photo_url ? (
                  <img src={f.photo_url} alt={f.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-[#B74B40]" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <Link to={`/facilitators/${f.id}`} className="font-semibold text-sm hover:text-[#B74B40]">{f.full_name}</Link>
                  {f.studio_name && <p className="text-xs text-muted-foreground mt-0.5">{f.studio_name}</p>}
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.bio || 'بدون توضیحات'}</p>
                </div>
                <button onClick={() => startEdit(f)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-4 h-4" /></button>
              </div>
              <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
                {f.profit_percentage != null && <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> {toPersianNum(f.profit_percentage)}٪</span>}
                {f.card_number && <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {f.card_number.substring(0, 4)}••••</span>}
                <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> {toPersianNum(getWorkshopCount(f.id))} کارگاه</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
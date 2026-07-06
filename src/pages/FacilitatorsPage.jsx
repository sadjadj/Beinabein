import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Plus, User, Sparkles } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';

export default function FacilitatorsPage() {
  const [facilitators, setFacilitators] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ full_name: '', photo_url: '', bio: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [facs, ws] = await Promise.all([
        base44.entities.Facilitator.list('-created_date', 200),
        base44.entities.Workshop.list('-date', 500)
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
      await base44.entities.Facilitator.create(form);
      setForm({ full_name: '', photo_url: '', bio: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const getWorkshopCount = (facilitatorId) => workshops.filter(w => w.facilitator_id === facilitatorId).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">تسهیلگرها</h1>
          <p className="text-sm text-muted-foreground mt-1">فهرست تسهیلگرهای بینابین</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">
          <Plus className="w-4 h-4" /> ثبت تسهیلگر
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="text" placeholder="آدرس عکس (اختیاری)" value={form.photo_url} onChange={e => setForm({ ...form, photo_url: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <textarea placeholder="درباره تسهیلگر" value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            <div className="flex gap-2">
              <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
                {submitting ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : facilitators.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          هنوز تسهیلگری ثبت نشده است
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {facilitators.map(f => (
            <Link key={f.id} to={`/facilitators/${f.id}`} className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3">
                {f.photo_url ? (
                  <img src={f.photo_url} alt={f.full_name} className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User className="w-7 h-7 text-gray-700" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm">{f.full_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.bio || 'بدون توضیحات'}</p>
                  <p className="text-xs text-gray-700 mt-2">{toPersianNum(getWorkshopCount(f.id))} کارگاه</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
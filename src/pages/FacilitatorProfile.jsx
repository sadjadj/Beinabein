import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, User, GraduationCap, Phone, CreditCard, Percent, Wallet, Pencil, Check, X } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum, formatCurrency } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr, formatJalaliShort } from '@/lib/jalali';

export default function FacilitatorProfile() {
  const { id } = useParams();
  const [facilitator, setFacilitator] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [f, allWs, allPurchs] = await Promise.all([
        base44.entities.Facilitator.get(id),
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500)
      ]);
      setFacilitator(f);
      setWorkshops(allWs.filter(w => (w.facilitator_ids || []).includes(id)));
      setPurchases(allPurchs);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    setEditForm({
      full_name: facilitator.full_name || '', phone: facilitator.phone || '',
      social_id: facilitator.social_id || '', brand_name: facilitator.brand_name || '',
      card_number: facilitator.card_number || '', sheba_number: facilitator.sheba_number || '',
      profit_percentage: facilitator.profit_percentage || '', bio: facilitator.bio || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Facilitator.update(id, {
        ...editForm, profit_percentage: Number(editForm.profit_percentage) || 0
      });
      setEditing(false);
      fetchData();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!facilitator) return <div className="p-6 text-center text-muted-foreground">تسهیلگری یافت نشد</div>;

  const totalRevenue = workshops.reduce((s, w) => s + computeWorkshopRevenue(w, purchases).facilitatorRevenue, 0);
  const paidRevenue = workshops.filter(w => w.facilitator_paid).reduce((s, w) => s + computeWorkshopRevenue(w, purchases).facilitatorRevenue, 0);
  const unpaidRevenue = totalRevenue - paidRevenue;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <Link to="/facilitators" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست
      </Link>

      <div className="bg-white rounded-xl border border-border p-6">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="نام و نام خانوادگی" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="tel" placeholder="شماره تماس" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="text" placeholder="آیدی شبکه اجتماعی" value={editForm.social_id} onChange={e => setEditForm({ ...editForm, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="نام برند" value={editForm.brand_name} onChange={e => setEditForm({ ...editForm, brand_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="شماره کارت" value={editForm.card_number} onChange={e => setEditForm({ ...editForm, card_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="شماره شبا" value={editForm.sheba_number} onChange={e => setEditForm({ ...editForm, sheba_number: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="number" placeholder="درصد سود" value={editForm.profit_percentage} onChange={e => setEditForm({ ...editForm, profit_percentage: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <textarea placeholder="معرفی تسهیلگر" value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} rows={3} className="sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
                <X className="w-4 h-4" /> انصراف
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-[#B74B40]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{facilitator.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {facilitator.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {facilitator.phone}</span>}
                {facilitator.brand_name && <span>نام برند: {facilitator.brand_name}</span>}
                {facilitator.profit_percentage != null && <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> {toPersianNum(facilitator.profit_percentage)}٪</span>}
                {facilitator.social_id && <span>آیدی: {facilitator.social_id}</span>}
              </div>
              {facilitator.card_number && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {facilitator.card_number}</p>}
              {facilitator.sheba_number && <p className="text-xs text-muted-foreground mt-1">شبا: {facilitator.sheba_number}</p>}
              {facilitator.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{facilitator.bio}</p>}
            </div>
            <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
              <Pencil className="w-3.5 h-3.5" /> ویرایش
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="w-4 h-4" /> کل درآمد</p>
          <p className="text-xl font-bold mt-1 text-[#B9834B]">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">پرداخت‌شده</p>
          <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(paidRevenue)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <p className="text-sm text-muted-foreground">پرداخت‌نشده</p>
          <p className="text-xl font-bold mt-1 text-[#B74B40]">{formatCurrency(unpaidRevenue)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#B74B40]" /> کارگاه‌های برگزار شده ({toPersianNum(workshops.length)})</h3>
        </div>
        {workshops.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز کارگاهی برگزار نکرده است</div>
        ) : (
          <div className="divide-y divide-border">
            {workshops.map(w => {
              const rev = computeWorkshopRevenue(w, purchases);
              return (
                <div key={w.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to="/workshops" className="font-medium text-sm text-[#B74B40] hover:underline">{w.title}</Link>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {w.day_of_week && <span>{dayLabels[w.day_of_week]}</span>}
                      {w.start_time && <span>شروع: {w.start_time}</span>}
                      {w.end_time && <span>پایان: {w.end_time}</span>}
                      <span>{toPersianNum(rev.participantCount)} ثبت‌نام</span>
                      <span>درصد: {toPersianNum(w.facilitator_percentage || 0)}٪</span>
                    </div>
                  </div>
                  <div className="text-left flex-shrink-0">
                    <p className="font-semibold text-sm text-[#B9834B]">{formatCurrency(rev.facilitatorRevenue)}</p>
                    <p className={`text-xs mt-1 ${w.facilitator_paid ? 'text-green-600' : 'text-[#B74B40]'}`}>
                      {w.facilitator_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
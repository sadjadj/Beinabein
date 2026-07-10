import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, User, GraduationCap, Phone, CreditCard, Percent, Wallet } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum, formatCurrency } from '@/lib/stats';
import { dayLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';

export default function FacilitatorProfile() {
  const { id } = useParams();
  const [facilitator, setFacilitator] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
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
    fetchAll();
  }, [id]);

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
        <div className="flex items-start gap-4">
          {facilitator.photo_url ? (
            <img src={facilitator.photo_url} alt={facilitator.full_name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-[#B74B40]" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{facilitator.full_name}</h1>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {facilitator.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {facilitator.phone}</span>}
              {facilitator.studio_name && <span>استودیو: {facilitator.studio_name}</span>}
              {facilitator.profit_percentage != null && <span className="flex items-center gap-1"><Percent className="w-3.5 h-3.5" /> {toPersianNum(facilitator.profit_percentage)}٪</span>}
            </div>
            {facilitator.card_number && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><CreditCard className="w-3.5 h-3.5" /> {facilitator.card_number}</p>}
            {facilitator.sheba_number && <p className="text-xs text-muted-foreground mt-1">شبا: {facilitator.sheba_number}</p>}
            {facilitator.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{facilitator.bio}</p>}
          </div>
        </div>
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
                    <p className="font-medium text-sm">{w.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {w.day_of_week && <span>{dayLabels[w.day_of_week]} {w.time}</span>}
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
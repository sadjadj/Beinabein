import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Briefcase, Coffee, GraduationCap, Phone, User, Tag } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { howMetLabels, genderLabels, paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import { formatJalali, formatJalaliShort } from '@/lib/jalali';

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [data, setData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const p = await base44.entities.Person.get(id);
        setPerson(p);
        const [wsOrders, itemPurchases, workshopPurchases] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-purchase_date', 500),
          base44.entities.ItemPurchase.list('-purchase_date', 500),
          base44.entities.WorkshopPurchase.list('-purchase_date', 500)
        ]);
        setData({ workspaceOrders: wsOrders, itemPurchases, workshopPurchases });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!person) return <div className="p-6 text-center text-muted-foreground">فردی یافت نشد</div>;

  const phone = person.phone;
  const wsOrders = data.workspaceOrders.filter(o => o.person_phone === phone);
  const cafePurchases = data.itemPurchases.filter(p => p.person_phone === phone);
  const workshopPurchases = data.workshopPurchases.filter(w => w.person_phone === phone);
  const totalCount = wsOrders.length + cafePurchases.length + workshopPurchases.length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/people')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-[#B74B40]" />
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold">{person.full_name || 'بدون نام'}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5" /> {person.phone}</p>
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
              {person.how_met && <span>نحوه آشنایی: {howMetLabels[person.how_met] || person.how_met}</span>}
              {person.age && <span>سن: {toPersianNum(person.age)}</span>}
              {person.gender && <span>جنسیت: {genderLabels[person.gender] || person.gender}</span>}
              {person.first_usage && <span>اولین استفاده: {formatJalaliShort(person.first_usage)}</span>}
            </div>
            {person.tags && person.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {person.tags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#FBF3EC] text-[#B9834B]">{tag}</span>)}
              </div>
            )}
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-[#B74B40]">{toPersianNum(totalCount)}</p>
            <p className="text-xs text-muted-foreground">کل خدمات</p>
          </div>
        </div>
        {person.notes && <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">{person.notes}</div>}
      </div>

      {wsOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#B74B40]" />
            <h3 className="text-sm font-semibold">فضای کار ({toPersianNum(wsOrders.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {wsOrders.map(o => (
              <div key={o.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{formatJalaliShort(o.usage_date || o.purchase_date)}</span>
                  {o.entry_time && <span className="text-muted-foreground mr-2">ورود: {o.entry_time}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{paymentMethodLabels[o.payment_method] || o.payment_method}</span>
                  {o.price > 0 && <span className="font-medium">{formatCurrency(o.price)}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {cafePurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#B9834B]" />
            <h3 className="text-sm font-semibold">کافه ({toPersianNum(cafePurchases.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {cafePurchases.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{p.item_name}</span>
                  {p.quantity > 1 && <span className="text-muted-foreground mr-2">×{toPersianNum(p.quantity)}</span>}
                  <span className="text-xs text-muted-foreground mr-2">{purchaseReasonLabels[p.purchase_reason] || ''}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatJalaliShort(p.purchase_date)}</span>
                  <span className="font-medium">{formatCurrency(p.item_price * p.quantity)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {workshopPurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#8CB9C0]" />
            <h3 className="text-sm font-semibold">کارگاه‌ها ({toPersianNum(workshopPurchases.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {workshopPurchases.map(w => (
              <div key={w.id} className="p-3 flex items-center justify-between text-sm">
                <span className="font-medium">{w.workshop_title || '-'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatJalaliShort(w.purchase_date)}</span>
                  <span className="font-medium">{formatCurrency(w.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          این فرد هنوز از هیچ خدمتی استفاده نکرده است
        </div>
      )}
    </div>
  );
}
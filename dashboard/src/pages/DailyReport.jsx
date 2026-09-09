import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Users, Wallet, Coffee, Briefcase, GraduationCap, ArrowRight } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { howMetLabels, howMetColors, paymentMethodLabels } from '@/lib/labels';
import { todayGregorian, formatJalali } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import { StatCardSkeleton } from '@/components/SkeletonPatterns';

export default function DailyReport() {
  const [searchParams, setSearchParams] = useSearchParams();
  const date = searchParams.get('date') || todayGregorian();
  const [data, setData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [], people: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [wo, ip, wp, ppl] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-purchase_date', 1000),
          base44.entities.ItemPurchase.list('-purchase_date', 1000),
          base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
          base44.entities.Person.list('-created_date', 1000)
        ]);
        setData({
          workspaceOrders: wo.filter(o => o.purchase_date === date),
          itemPurchases: ip.filter(p => p.purchase_date === date),
          workshopPurchases: wp.filter(p => p.purchase_date === date),
          people: ppl
        });
      } finally { setLoading(false); }
    };
    fetchData();
  }, [date]);

  const setDate = (d) => setSearchParams(d ? { date: d } : {});

  const personByPhone = {};
  data.people.forEach(p => { if (p.phone) personByPhone[p.phone] = p; });

  const dayPhones = new Set();
  data.workspaceOrders.forEach(o => o.person_phone && dayPhones.add(o.person_phone));
  data.itemPurchases.forEach(p => p.person_phone && dayPhones.add(p.person_phone));
  data.workshopPurchases.forEach(w => w.person_phone && dayPhones.add(w.person_phone));

  const howMetCounts = {};
  dayPhones.forEach(phone => {
    const person = personByPhone[phone];
    const hm = (person && person.how_met) || 'other';
    howMetCounts[hm] = (howMetCounts[hm] || 0) + 1;
  });
  const howMetSorted = Object.entries(howMetCounts).sort((a, b) => b[1] - a[1]);

  const wsRev = data.workspaceOrders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRev = data.itemPurchases.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const workshopRev = data.workshopPurchases.reduce((s, w) => s + (w.price || 0) * (w.quantity || 1) + (w.donation || 0), 0);
  const totalRev = wsRev + cafeRev + workshopRev;

  const activities = [
    ...data.workspaceOrders.map(o => ({ type: 'workspace', icon: Briefcase, label: o.subscription_name || 'فضای کار', phone: o.person_phone, name: o.person_name, amount: (o.price || 0) * (o.quantity || 1), method: o.payment_method })),
    ...data.itemPurchases.map(p => ({ type: 'cafe', icon: Coffee, label: p.item_name, phone: p.person_phone, name: p.person_name, amount: (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), method: p.payment_method })),
    ...data.workshopPurchases.map(w => ({ type: 'workshop', icon: GraduationCap, label: w.workshop_title, phone: w.person_phone, name: w.person_name, amount: (w.price || 0) * (w.quantity || 1), method: w.payment_method })),
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowRight className="w-4 h-4" /> بازگشت</Link>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">گزارش روز</h1>
          <p className="text-sm text-muted-foreground mt-1">{formatJalali(date)}</p>
        </div>
        <div className="w-full sm:w-56">
          <JalaliDateInput value={date} onChange={setDate} />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <StatCard label="افراد یونیک" value={toPersianNum(dayPhones.size)} icon={Users} color="terracotta" />
            <StatCard label="درآمد روز" value={formatCurrency(totalRev)} icon={Wallet} color="ochre" />
            <StatCard label="تردد فضای کار" value={toPersianNum(data.workspaceOrders.length)} icon={Briefcase} color="teal" />
            <StatCard label="خرید کافه" value={toPersianNum(data.itemPurchases.length)} icon={Coffee} color="pink" />
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4">این افراد از کجا اومدن؟</h3>
            {dayPhones.size === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">در این روز ترددی ثبت نشده است</p>
            ) : (
              <div className="space-y-2.5">
                {howMetSorted.map(([key, count]) => {
                  const pct = (count / dayPhones.size) * 100;
                  return (
                    <div key={key} className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded-md text-xs border text-center ${howMetColors[key] || howMetColors.other} w-28`}>{howMetLabels[key] || key}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-[#B74B40] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-medium w-16 text-left">{toPersianNum(count)} نفر</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5">
            <h3 className="text-sm font-semibold mb-4">تفکیک درآمد</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#FDF2F1] flex items-center justify-center"><Briefcase className="w-4 h-4 text-[#B74B40]" /></div><div><p className="text-xs text-muted-foreground">فضای کار</p><p className="text-sm font-bold">{formatCurrency(wsRev)}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#FBF3EC] flex items-center justify-center"><Coffee className="w-4 h-4 text-[#B9834B]" /></div><div><p className="text-xs text-muted-foreground">کافه</p><p className="text-sm font-bold">{formatCurrency(cafeRev)}</p></div></div>
              <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-lg bg-[#F0F7F8] flex items-center justify-center"><GraduationCap className="w-4 h-4 text-[#8CB9C0]" /></div><div><p className="text-xs text-muted-foreground">کارگاه</p><p className="text-sm font-bold">{formatCurrency(workshopRev)}</p></div></div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">رویدادهای روز ({toPersianNum(activities.length)})</h3></div>
            {activities.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">رویدادی در این روز ثبت نشده است</div>
            ) : (
              <div className="divide-y divide-border">
                {activities.map((a, i) => {
                  const person = personByPhone[a.phone];
                  return (
                    <div key={i} className="p-3 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0"><a.icon className="w-4 h-4 text-muted-foreground" /></div>
                        <div className="min-w-0">
                          {person ? <Link to={`/people/${person.id}`} className="font-medium hover:text-[#B74B40] truncate block">{a.name || '-'}</Link> : <span className="font-medium truncate block">{a.name || '-'}</span>}
                          <p className="text-xs text-muted-foreground truncate">{a.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-muted-foreground">{paymentMethodLabels[a.method] || a.method}</span>
                        <span className="font-medium">{formatCurrency(a.amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
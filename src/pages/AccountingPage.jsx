import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Bell, Search } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum, formatCurrency, currentJalaliMonthKey, gregorianToJalaliMonthKey } from '@/lib/stats';
import { paymentMethodLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

export default function AccountingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hideFinancials = user?.role === 'executive';
  const [workspaceOrders, setWorkspaceOrders] = useState([]);
  const [itemPurchases, setItemPurchases] = useState([]);
  const [workshopPurchases, setWorkshopPurchases] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ws, items, wp, wsList] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-purchase_date', 1000),
          base44.entities.ItemPurchase.list('-purchase_date', 1000),
          base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
          base44.entities.Workshop.list('-start_date', 500)
        ]);
        setWorkspaceOrders(ws);
        setItemPurchases(items);
        setWorkshopPurchases(wp);
        setWorkshops(wsList);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const togglePaid = async (entity, id, current) => {
    await base44.entities[entity].update(id, { is_paid: !current });
    if (entity === 'WorkspaceOrder') setWorkspaceOrders(await base44.entities.WorkspaceOrder.list('-purchase_date', 1000));
    if (entity === 'ItemPurchase') setItemPurchases(await base44.entities.ItemPurchase.list('-purchase_date', 1000));
    if (entity === 'WorkshopPurchase') setWorkshopPurchases(await base44.entities.WorkshopPurchase.list('-purchase_date', 1000));
  };

  const toggleFacilitatorPaid = async (w) => {
    await base44.entities.Workshop.update(w.id, { facilitator_paid: !w.facilitator_paid });
    setWorkshops(await base44.entities.Workshop.list('-start_date', 500));
  };

  // Monthly P&L
  const currentMonth = currentJalaliMonthKey();
  const monthWs = workspaceOrders.filter(o => gregorianToJalaliMonthKey(o.purchase_date) === currentMonth);
  const monthItems = itemPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const monthWp = workshopPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);

  const wsRevenue = monthWs.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRevenue = monthItems.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const workshopRevenue = monthWp.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const totalIncome = wsRevenue + cafeRevenue + workshopRevenue;

  // Facilitator expenses (from all workshops this month)
  const monthWorkshops = workshops.filter(w => gregorianToJalaliMonthKey(w.start_date) === currentMonth);
  const facilitatorExpenses = monthWorkshops.reduce((s, w) => {
    const rev = computeWorkshopRevenue(w, workshopPurchases);
    return s + rev.facilitatorRevenue;
  }, 0);

  const profit = totalIncome - facilitatorExpenses;

  // Unpaid items
  const unpaidWs = workspaceOrders.filter(o => !o.is_paid && o.payment_method !== 'free');
  const unpaidItems = itemPurchases.filter(p => !p.is_paid && p.payment_method !== 'free');
  const unpaidWp = workshopPurchases.filter(p => !p.is_paid && p.payment_method !== 'free');
  const totalUnpaid = unpaidWs.length + unpaidItems.length + unpaidWp.length;
  const totalUnpaidAmount = [...unpaidWs, ...unpaidItems, ...unpaidWp].reduce((s, r) => {
    if (r.price) return s + r.price * (r.quantity || 1) + (r.donation || 0);
    if (r.item_price) return s + r.item_price * (r.quantity || 1) * (1 - (r.discount || 0) / 100);
    return s;
  }, 0);

  // Unpaid facilitator payments
  const unpaidFacilitators = workshops.filter(w => !w.facilitator_paid).map(w => {
    const rev = computeWorkshopRevenue(w, workshopPurchases);
    return { ...w, facilitatorRevenue: rev.facilitatorRevenue, participantCount: rev.participantCount };
  }).filter(w => w.facilitatorRevenue > 0);

  const allTransactions = [
    ...workspaceOrders.map(o => ({ ...o, type: 'workspace', amount: (o.price || 0) * (o.quantity || 1), label: o.subscription_name || '-' })),
    ...itemPurchases.map(p => ({ ...p, type: 'cafe', amount: (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), label: p.item_name })),
    ...workshopPurchases.map(p => ({ ...p, type: 'workshop', amount: (p.price || 0) * (p.quantity || 1) + (p.donation || 0), label: p.workshop_title })),
  ].sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));

  const filtered = allTransactions.filter(t => {
    if (filter === 'paid') return t.is_paid;
    if (filter === 'unpaid') return !t.is_paid && t.payment_method !== 'free';
    return true;
  }).filter(t => {
    if (!search) return true;
    const s = search.trim().toLowerCase();
    return (t.person_name || '').toLowerCase().includes(s) ||
      (t.label || '').toLowerCase().includes(s) ||
      (t.person_phone || '').toLowerCase().includes(s);
  });

  const typeLabels = { workspace: 'فضای کار', cafe: 'کافه', workshop: 'کارگاه' };

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pt-14 md:pt-6">
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">حسابداری</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت درآمد، هزینه‌ها و پرداخت‌ها</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {!hideFinancials && <StatCard label="درآمد این ماه" value={formatCurrency(totalIncome)} icon={TrendingUp} color="terracotta" />}
        {!hideFinancials && <StatCard label="پرداخت تسهیلگران" value={formatCurrency(facilitatorExpenses)} icon={TrendingDown} color="pink" />}
        {!hideFinancials && <StatCard label="سود/زیان این ماه" value={formatCurrency(profit)} sublabel={profit >= 0 ? 'سود' : 'زیان'} icon={Wallet} color={profit >= 0 ? 'teal' : 'pink'} />}
        <StatCard label="پرداخت‌نشده" value={toPersianNum(totalUnpaid)} sublabel={hideFinancials ? undefined : formatCurrency(totalUnpaidAmount)} icon={AlertCircle} color="ochre" />
      </div>

      {unpaidFacilitators.length > 0 && (
        <div className="bg-[#FBF3EC] rounded-xl border border-[#E8D5C0] p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#B9834B]">
            <Bell className="w-4 h-4" /> یادآوری پرداخت تسهیلگران ({toPersianNum(unpaidFacilitators.length)} مورد)
          </h3>
          <div className="space-y-2">
            {unpaidFacilitators.map(w => {
              const settlementDate = w.end_date ? (() => {
                const d = new Date(w.end_date);
                d.setMonth(d.getMonth() + 1, 1);
                return d.toISOString().split('T')[0];
              })() : null;
              const isDue = settlementDate && settlementDate <= new Date().toISOString().split('T')[0];
              return (
                <div key={w.id} className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{toPersianNum(w.participantCount)} ثبت‌نام • درصد: {toPersianNum(w.facilitator_percentage || 0)}٪</p>
                    {settlementDate ? (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${isDue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        <Bell className="w-3 h-3" />
                        {isDue ? 'زمان تسویه فرا رسیده: ' : 'زمان تسویه: '}
                        {toJalaliStr(settlementDate)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">در انتظار پایان کارگاه</p>
                    )}
                  </div>
                  <div className="text-left">
                    {!hideFinancials && <p className="font-semibold text-[#B9834B]">{formatCurrency(w.facilitatorRevenue)}</p>}
                    <button onClick={() => toggleFacilitatorPaid(w)} className="text-xs text-[#B74B40] hover:underline mt-1">ثبت پرداخت</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">فاکتورها</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="جستجو نام / شرح / شماره..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
            </div>
            {['all', 'paid', 'unpaid'].map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
                {f === 'all' ? 'همه' : f === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">تراکنشی یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">نوع</th>
                  <th className="text-right p-3 font-medium">شرح</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">پرداخت</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(t => (
                  <tr key={`${t.type}-${t.id}`} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/accounting/${t.type}/${t.id}`)}>
                    <td className="p-3 whitespace-nowrap">{toJalaliStr(t.purchase_date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${t.type === 'workspace' ? 'bg-[#FDF2F1] text-[#B74B40]' : t.type === 'cafe' ? 'bg-[#FBF3EC] text-[#B9834B]' : 'bg-[#F0F7F8] text-[#8CB9C0]'}`}>
                        {typeLabels[t.type]}
                      </span>
                    </td>
                    <td className="p-3">{t.label || '-'}</td>
                    <td className="p-3">{t.person_name || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{paymentMethodLabels[t.payment_method] || t.payment_method}</td>
                    <td className="p-3 font-medium whitespace-nowrap text-left" dir="ltr">{formatCurrency(t.amount)}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => togglePaid(t.type === 'workspace' ? 'WorkspaceOrder' : t.type === 'cafe' ? 'ItemPurchase' : 'WorkshopPurchase', t.id, t.is_paid)} className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                        {t.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> پرداخت شده</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#B9834B]"><AlertCircle className="w-3.5 h-3.5" /> پرداخت‌نشده</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
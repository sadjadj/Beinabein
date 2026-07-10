import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Bell } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum, formatCurrency } from '@/lib/stats';
import { paymentMethodLabels, itemTypeLabels } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';

export default function AccountingPage() {
  const [workspaceOrders, setWorkspaceOrders] = useState([]);
  const [itemPurchases, setItemPurchases] = useState([]);
  const [workshopPurchases, setWorkshopPurchases] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ws, items, wp, wsList] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-purchase_date', 500),
          base44.entities.ItemPurchase.list('-purchase_date', 500),
          base44.entities.WorkshopPurchase.list('-purchase_date', 500),
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
    const refetch = async () => {
      if (entity === 'WorkspaceOrder') setWorkspaceOrders(await base44.entities.WorkspaceOrder.list('-purchase_date', 500));
      if (entity === 'ItemPurchase') setItemPurchases(await base44.entities.ItemPurchase.list('-purchase_date', 500));
      if (entity === 'WorkshopPurchase') setWorkshopPurchases(await base44.entities.WorkshopPurchase.list('-purchase_date', 500));
    };
    refetch();
  };

  const toggleFacilitatorPaid = async (w) => {
    await base44.entities.Workshop.update(w.id, { facilitator_paid: !w.facilitator_paid });
    setWorkshops(await base44.entities.Workshop.list('-start_date', 500));
  };

  // Monthly P&L
  const currentMonth = new Date().toISOString().substring(0, 7);
  const monthWs = workspaceOrders.filter(o => o.purchase_date?.startsWith(currentMonth));
  const monthItems = itemPurchases.filter(p => p.purchase_date?.startsWith(currentMonth));
  const monthWp = workshopPurchases.filter(p => p.purchase_date?.startsWith(currentMonth));

  const wsRevenue = monthWs.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRevenue = monthItems.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1), 0);
  const workshopRevenue = monthWp.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1), 0);
  const totalIncome = wsRevenue + cafeRevenue + workshopRevenue;

  // Facilitator expenses (from all workshops this month)
  const monthWorkshops = workshops.filter(w => w.start_date?.startsWith(currentMonth));
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
    if (r.price) return s + r.price * (r.quantity || 1);
    if (r.item_price) return s + r.item_price * (r.quantity || 1);
    return s;
  }, 0);

  // Unpaid facilitator payments
  const unpaidFacilitators = workshops.filter(w => !w.facilitator_paid).map(w => {
    const rev = computeWorkshopRevenue(w, workshopPurchases);
    return { ...w, facilitatorRevenue: rev.facilitatorRevenue, participantCount: rev.participantCount };
  }).filter(w => w.facilitatorRevenue > 0);

  const allTransactions = [
    ...workspaceOrders.map(o => ({ ...o, type: 'workspace', amount: (o.price || 0) * (o.quantity || 1), label: itemTypeLabels[o.item_type] || o.item_type })),
    ...itemPurchases.map(p => ({ ...p, type: 'cafe', amount: (p.item_price || 0) * (p.quantity || 1), label: p.item_name })),
    ...workshopPurchases.map(p => ({ ...p, type: 'workshop', amount: (p.price || 0) * (p.quantity || 1), label: p.workshop_title })),
  ].sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));

  const filtered = allTransactions.filter(t => {
    if (filter === 'paid') return t.is_paid;
    if (filter === 'unpaid') return !t.is_paid && t.payment_method !== 'free';
    return true;
  });

  const typeLabels = { workspace: 'فضای کار', cafe: 'کافه', workshop: 'کارگاه' };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">حسابداری</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت درآمد، هزینه‌ها و پرداخت‌ها</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="درآمد این ماه" value={formatCurrency(totalIncome)} icon={TrendingUp} color="terracotta" />
        <StatCard label="پرداخت تسهیلگران" value={formatCurrency(facilitatorExpenses)} icon={TrendingDown} color="pink" />
        <StatCard label="سود/زیان این ماه" value={formatCurrency(profit)} sublabel={profit >= 0 ? 'سود' : 'زیان'} icon={Wallet} color={profit >= 0 ? 'teal' : 'pink'} />
        <StatCard label="پرداخت‌نشده" value={toPersianNum(totalUnpaid)} sublabel={formatCurrency(totalUnpaidAmount)} icon={AlertCircle} color="ochre" />
      </div>

      {unpaidFacilitators.length > 0 && (
        <div className="bg-[#FBF3EC] rounded-xl border border-[#E8D5C0] p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#B9834B]">
            <Bell className="w-4 h-4" /> یادآوری پرداخت تسهیلگران ({toPersianNum(unpaidFacilitators.length)} مورد)
          </h3>
          <div className="space-y-2">
            {unpaidFacilitators.map(w => (
              <div key={w.id} className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{w.title}</p>
                  <p className="text-xs text-muted-foreground">{toPersianNum(w.participantCount)} ثبت‌نام • درصد: {toPersianNum(w.facilitator_percentage || 0)}٪</p>
                </div>
                <div className="text-left">
                  <p className="font-semibold text-[#B9834B]">{formatCurrency(w.facilitatorRevenue)}</p>
                  <button onClick={() => toggleFacilitatorPaid(w)} className="text-xs text-[#B74B40] hover:underline mt-1">ثبت پرداخت</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-2 flex-wrap">
          {['all', 'paid', 'unpaid'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
              {f === 'all' ? 'همه' : f === 'paid' ? 'پرداخت‌شده' : 'پرداخت‌نشده'}
            </button>
          ))}
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
                  <tr key={`${t.type}-${t.id}`} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3">{toJalaliStr(t.purchase_date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${t.type === 'workspace' ? 'bg-[#FDF2F1] text-[#B74B40]' : t.type === 'cafe' ? 'bg-[#FBF3EC] text-[#B9834B]' : 'bg-[#F0F7F8] text-[#8CB9C0]'}`}>
                        {typeLabels[t.type]}
                      </span>
                    </td>
                    <td className="p-3">{t.label || '-'}</td>
                    <td className="p-3">{t.person_name || '-'}</td>
                    <td className="p-3 text-xs">{paymentMethodLabels[t.payment_method] || t.payment_method}</td>
                    <td className="p-3 font-medium">{formatCurrency(t.amount)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => togglePaid(t.type === 'workspace' ? 'WorkspaceOrder' : t.type === 'cafe' ? 'ItemPurchase' : 'WorkshopPurchase', t.id, t.is_paid)} className="inline-flex items-center gap-1 text-xs">
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
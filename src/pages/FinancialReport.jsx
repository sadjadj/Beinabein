import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import { Wallet, TrendingUp, TrendingDown, Users, ChevronDown, GraduationCap } from 'lucide-react';
import { getDateRange, toPersianNum, formatCurrency, formatPercent } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { getJalaliParts, jalaliToGregorianStr, jalaliDaysInMonth } from '@/lib/jalali';
import { StatCardSkeleton } from '@/components/SkeletonPatterns';

const COLORS = ['#B74B40', '#D4A574', '#E8B4B0', '#D98B94', '#8CB9C0'];
const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const presets = [
  { key: 'month', label: 'این ماه' },
  { key: 'last_month', label: 'ماه گذشته' },
  { key: 'quarter', label: 'سه ماه' },
  { key: 'year', label: 'امسال' },
  { key: 'all_time', label: 'کل دوره' },
];

export default function FinancialReport({ embedded = false }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [], expenses: [], workshops: [], facilitators: [], people: [] });
  const [preset, setPreset] = useState('month');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [wo, ip, wp, exp, ws, facs, ppl] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-purchase_date', 1000),
          base44.entities.ItemPurchase.list('-purchase_date', 1000),
          base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
          base44.entities.Expense.list('-date', 1000),
          base44.entities.Workshop.list('-start_date', 500),
          base44.entities.Facilitator.list('-created_date', 500),
          base44.entities.Person.list('-created_date', 1000)
        ]);
        setData({ workspaceOrders: wo, itemPurchases: ip, workshopPurchases: wp, expenses: exp, workshops: ws, facilitators: facs, people: ppl });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const range = getDateRange(preset, null, null);
  const inRange = (d) => !range || (d && d >= range.start && d <= range.end);
  const wo = data.workspaceOrders.filter(o => inRange(o.purchase_date));
  const ip = data.itemPurchases.filter(p => inRange(p.purchase_date));
  const wp = data.workshopPurchases.filter(p => inRange(p.purchase_date));
  const exp = data.expenses.filter(e => inRange(e.date));

  const wsRev = wo.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRev = ip.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const workshopRev = wp.reduce((s, w) => s + (w.price || 0) * (w.quantity || 1) + (w.donation || 0), 0);
  const totalRev = wsRev + cafeRev + workshopRev;
  const totalExp = exp.reduce((s, e) => s + (e.amount || 0), 0);
  const netProfit = totalRev - totalExp;

  const uniquePhones = new Set();
  wo.forEach(o => uniquePhones.add(o.person_phone));
  ip.forEach(p => uniquePhones.add(p.person_phone));
  wp.forEach(w => uniquePhones.add(w.person_phone));

  // Revenue by payment method
  const methodMap = {};
  wo.forEach(o => { const m = o.payment_method || 'cash'; methodMap[m] = (methodMap[m] || 0) + (o.price || 0) * (o.quantity || 1); });
  ip.forEach(p => { const m = p.payment_method || 'cash'; methodMap[m] = (methodMap[m] || 0) + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100); });
  wp.forEach(w => { const m = w.payment_method || 'cash'; methodMap[m] = (methodMap[m] || 0) + (w.price || 0) * (w.quantity || 1) + (w.donation || 0); });
  const byMethod = Object.entries(methodMap).map(([k, v]) => ({ name: paymentMethodLabels[k] || k, value: v })).sort((a, b) => b.value - a.value);

  // Revenue by acquisition channel (how_met)
  const phoneToRev = {};
  wo.forEach(o => { phoneToRev[o.person_phone] = (phoneToRev[o.person_phone] || 0) + (o.price || 0) * (o.quantity || 1); });
  ip.forEach(p => { phoneToRev[p.person_phone] = (phoneToRev[p.person_phone] || 0) + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100); });
  wp.forEach(w => { phoneToRev[w.person_phone] = (phoneToRev[w.person_phone] || 0) + (w.price || 0) * (w.quantity || 1) + (w.donation || 0); });
  const howMetMap = {};
  data.people.forEach(p => {
    if (phoneToRev[p.phone]) {
      const hm = p.how_met || 'other';
      howMetMap[hm] = (howMetMap[hm] || 0) + phoneToRev[p.phone];
    }
  });
  const byHowMet = Object.entries(howMetMap).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: howMetLabels[k] || k, value: v }));

  // Monthly trend (last 6 Jalali months)
  const todayParts = getJalaliParts(new Date().toISOString().split('T')[0]);
  const months = [];
  for (let i = 5; i >= 0; i--) {
    let m = todayParts.jm - i, y = todayParts.jy;
    while (m < 1) { m += 12; y -= 1; }
    months.push({ y, m });
  }
  const trend = months.map(({ y, m }) => {
    const start = jalaliToGregorianStr(y, m, 1);
    const end = jalaliToGregorianStr(y, m, jalaliDaysInMonth(y, m));
    const r = (d) => d && d >= start && d <= end;
    const wr = data.workspaceOrders.filter(o => r(o.purchase_date)).reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
    const cr = data.itemPurchases.filter(p => r(p.purchase_date)).reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
    const wpr = data.workshopPurchases.filter(w => r(w.purchase_date)).reduce((s, w) => s + (w.price || 0) * (w.quantity || 1) + (w.donation || 0), 0);
    const ex = data.expenses.filter(e => r(e.date)).reduce((s, e) => s + (e.amount || 0), 0);
    return { label: jMonths[m - 1], درآمد: wr + cr + wpr, هزینه: ex };
  });

  // Facilitator payments due
  const facilitatorDue = [];
  data.workshops.forEach(w => {
    if (!w.facilitator_percentage) return;
    const purchases = data.workshopPurchases.filter(p => p.workshop_id === w.id && inRange(p.purchase_date));
    if (purchases.length === 0) return;
    const priceRev = purchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1), 0);
    const due = Math.round(priceRev * (w.facilitator_percentage || 0) / 100);
    if (due > 0 && !w.facilitator_paid) {
      const facNames = (w.facilitator_ids || []).map(fid => data.facilitators.find(f => f.id === fid)?.full_name).filter(Boolean).join('، ');
      facilitatorDue.push({ id: w.id, title: w.title, facNames, percent: w.facilitator_percentage, due });
    }
  });
  const totalFacDue = facilitatorDue.reduce((s, f) => s + f.due, 0);

  const currentPreset = presets.find(p => p.key === preset);
  const totalMethod = byMethod.reduce((s, d) => s + d.value, 0) || 1;
  const totalHowMet = byHowMet.reduce((s, d) => s + d.value, 0) || 1;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3"><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></div>
        <div className="h-[340px] bg-white rounded-xl border border-border animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">گزارش مالی</h1>
          <p className="text-sm text-muted-foreground mt-1">تحلیل جامع درآمد، هزینه و سود</p>
        </div>
        )}
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-muted">
            {currentPreset?.label}<ChevronDown className="w-4 h-4" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-44 py-1">
                {presets.map(p => (
                  <button key={p.key} onClick={() => { setPreset(p.key); setDropdownOpen(false); }} className={`w-full text-right px-4 py-2 text-sm hover:bg-muted ${preset === p.key ? 'text-[#B74B40] font-medium' : ''}`}>{p.label}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="درآمد کل" value={formatCurrency(totalRev)} icon={TrendingUp} color="terracotta" info="مجموع درآمد فضای کار، کافه و کارگاه‌ها در بازه انتخاب‌شده (بدون درآمد دلخواه)" />
        <StatCard label="هزینه‌ها" value={formatCurrency(totalExp)} icon={TrendingDown} color="pink" info="مجموع کل هزینه‌های ثبت‌شده در بازه انتخاب‌شده" />
        <StatCard label="سود خالص" value={formatCurrency(netProfit)} icon={Wallet} color={netProfit >= 0 ? 'teal' : 'pink'} info="تفاضل درآمد کل و هزینه‌ها در بازه انتخاب‌شده" />
        <StatCard label="مشتریان یونیک" value={toPersianNum(uniquePhones.size)} icon={Users} color="ochre" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده از خدمات استفاده کرده‌اند" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">روند ۶ ماه اخیر (درآمد در برابر هزینه)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={trend}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={80} />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Legend />
            <Bar dataKey="درآمد" fill="#B74B40" radius={[4, 4, 0, 0]} />
            <Bar dataKey="هزینه" fill="#8CB9C0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">درآمد به تفکیک روش پرداخت</h3>
          {byMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">داده‌ای نیست</p>
          ) : (
            <div className="flex items-center gap-6 flex-wrap">
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={byMethod} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {byMethod.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1 min-w-[160px]">
                {byMethod.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{s.name}</span>
                    <span className="font-medium">{formatCurrency(s.value)} • {formatPercent((s.value / totalMethod) * 100)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">درآمد به تفکیک کانال ورود</h3>
          {byHowMet.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">داده‌ای نیست</p>
          ) : (
            <div className="space-y-2.5">
              {byHowMet.map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className="text-sm w-24 flex-shrink-0">{s.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(s.value / totalHowMet) * 100}%`, background: COLORS[i % COLORS.length] }} />
                  </div>
                  <span className="text-sm font-medium w-28 text-left">{formatCurrency(s.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">تفکیک درآمد و هزینه</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-1">درآمد</p>
            <div className="flex items-center justify-between text-sm"><span>فضای کار</span><span className="font-medium">{formatCurrency(wsRev)}</span></div>
            <div className="flex items-center justify-between text-sm"><span>کافه</span><span className="font-medium">{formatCurrency(cafeRev)}</span></div>
            <div className="flex items-center justify-between text-sm"><span>کارگاه</span><span className="font-medium">{formatCurrency(workshopRev)}</span></div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground mb-1">هزینه</p>
            {exp.length === 0 ? (
              <p className="text-sm text-muted-foreground">هزینه‌ای در این دوره ثبت نشده</p>
            ) : (
              Object.entries(exp.reduce((m, e) => { const c = e.category || 'daily'; m[c] = (m[c] || 0) + (e.amount || 0); return m; }, {})).sort((a, b) => b[1] - a[1]).map(([c, v]) => (
                <div key={c} className="flex items-center justify-between text-sm"><span>{c}</span><span className="font-medium">{formatCurrency(v)}</span></div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2"><GraduationCap className="w-4 h-4 text-[#B74B40]" /> پرداخت‌های معوق تسهیلگران</h3>
          <span className="text-sm font-bold text-[#B9834B]">{formatCurrency(totalFacDue)}</span>
        </div>
        {facilitatorDue.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">پرداخت معوقی نیست</div>
        ) : (
          <div className="divide-y divide-border">
            {facilitatorDue.map(f => (
              <div key={f.id} className="p-3 flex items-center justify-between text-sm">
                <div className="min-w-0">
                  <p className="font-medium truncate">{f.title}</p>
                  <p className="text-xs text-muted-foreground">{f.facNames || '-'} • {toPersianNum(f.percent)}٪</p>
                </div>
                <span className="font-medium text-[#B9834B]">{formatCurrency(f.due)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
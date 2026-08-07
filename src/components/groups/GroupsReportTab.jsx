import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Layers, Users, TrendingUp, AlertCircle, CalendarDays } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import ReportToolbar from '@/components/ReportToolbar';
import { base44 } from '@/api/base44Client';
import { todayGregorian } from '@/lib/jalali';
import { formatCurrency, toPersianNum, currentJalaliMonthKey, gregorianToJalaliMonthKey } from '@/lib/stats';
import { computeGroupSessions, gregorianToMonthKey } from '@/lib/groupSessions';
import ChartTooltip from '@/components/ChartTooltip';
import { getRangeStart, buildDateRange, makeTickFormatter } from '@/lib/reportUtils';

export default function GroupsReportTab() {
  const [groups, setGroups] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  useEffect(() => {
    (async () => {
      try {
        const [grps, purchs] = await Promise.all([
          base44.entities.Group.list('-start_date', 500),
          base44.entities.GroupPurchase.list('-purchase_date', 1000)
        ]);
        setGroups(grps);
        setPurchases(purchs);
      } finally { setLoading(false); }
    })();
  }, []);

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  const rangePurchases = useMemo(() => {
    return purchases.filter(p => p.purchase_date && p.purchase_date >= startDate && p.purchase_date <= endDate);
  }, [purchases, startDate, endDate]);

  const totalReg = rangePurchases.length;
  const uniquePeople = new Set(rangePurchases.map(p => p.person_phone)).size;
  const totalRevenue = rangePurchases.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0), 0);
  const unpaidCount = rangePurchases.filter(p => !p.is_paid && p.payment_method !== 'free').length;

  // Precompute each group's session dates once
  const groupSessionDateSets = useMemo(() => groups.map(g => {
    const set = new Set(computeGroupSessions(g).map(s => s.date));
    return set;
  }), [groups]);

  const currentMonthKey = currentJalaliMonthKey();
  const groupsStartingThisMonth = groups.filter(g => gregorianToJalaliMonthKey(g.start_date) === currentMonthKey).length;
  const groupsHeldThisMonth = groups.filter((g, i) => {
    let inMonth = false;
    groupSessionDateSets[i].forEach(d => { if (gregorianToMonthKey(d) === currentMonthKey) inMonth = true; });
    return inMonth;
  }).length;

  // Today's metrics
  const todayStr = todayGregorian();
  const todayPurchases = purchases.filter(p => p.purchase_date === todayStr);
  const todayRevenue = todayPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const todayParticipants = todayPurchases.reduce((s, p) => s + (p.quantity || 1), 0);
  const todayGroupCount = groupSessionDateSets.filter(set => set.has(todayStr)).length;

  // Charts
  const chartData = useMemo(() => {
    const dates = buildDateRange(startDate, endDate);
    return dates.map(date => {
      const dayPurchases = purchases.filter(p => p.purchase_date === date);
      const revenue = dayPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
      const participants = dayPurchases.reduce((s, p) => s + (p.quantity || 1), 0);
      const groupCount = groupSessionDateSets.filter(set => set.has(date)).length;
      return { date, revenue, participants, groupCount };
    });
  }, [purchases, groupSessionDateSets, startDate, endDate]);

  const tickFormatter = makeTickFormatter(chartData);

  if (loading) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری گزارش...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="تعداد ثبت‌نام‌ها" value={toPersianNum(totalReg)} icon={Users} color="terracotta" info="تعداد کل ثبت‌نام‌های گروه‌ها در بازه انتخاب‌شده (بر اساس تاریخ ثبت‌نام)" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniquePeople)} icon={Users} color="teal" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده در گروه‌ها ثبت‌نام کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع مبالغ تمام فاکتورهای گروه‌ها در بازه انتخاب‌شده (شامل قیمت و دونیشن، بدون در نظر گرفتن وضعیت پرداخت)" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidCount)} icon={AlertCircle} color="pink" info="تعداد فاکتورهای گروه‌ها در بازه انتخاب‌شده که هنوز پرداخت نشده‌اند" />
        <StatCard label="گروه‌هایی که این ماه شروع می‌شوند" value={toPersianNum(groupsStartingThisMonth)} icon={CalendarDays} color="terracotta" info="تعداد گروه‌هایی که تاریخ شروع آن‌ها در ماه جاری شمسی قرار دارد" />
        <StatCard label="گروه‌هایی که این ماه برگزار می‌شوند" value={toPersianNum(groupsHeldThisMonth)} icon={Layers} color="green" info="تعداد گروه‌هایی که در ماه جاری شمسی یک یا چند جلسه از آن‌ها برگزار می‌شود (بر اساس برنامه هفتگی)" />
      </div>

      <ReportToolbar
        rangePreset={rangePreset} setRangePreset={setRangePreset}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
      />

      <ChartCard title="درآمد" info="مجموع درآمد گروه‌ها در هر روز (شامل قیمت و دونیشن، بر اساس تاریخ ثبت‌نام)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={70} />
              <Tooltip content={<ChartTooltip unitLabel="درآمد" formatter={formatCurrency} />} />
              <Bar dataKey="revenue" fill="#B74B40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="تعداد شرکت‌کنندگان" info="مجموع تعداد شرکت‌کنندگان گروه‌هایی که در آن روز ثبت‌نام کرده‌اند (بر اساس تاریخ ثبت‌نام)" todayLabel="شرکت‌کنندگان امروز" todayValue={toPersianNum(todayParticipants)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد شرکت‌کننده" formatter={toPersianNum} />} />
              <Bar dataKey="participants" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="تعداد گروه‌ها" info="تعداد گروه‌هایی که در آن روز جلسه برگزار می‌کنند (بر اساس برنامه هفتگی گروه)" todayLabel="گروه‌های امروز" todayValue={toPersianNum(todayGroupCount)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد گروه" formatter={toPersianNum} />} />
              <Bar dataKey="groupCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
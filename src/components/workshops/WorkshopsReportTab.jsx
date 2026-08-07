import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GraduationCap, Users, TrendingUp, AlertCircle, CalendarDays } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import ReportToolbar from '@/components/ReportToolbar';
import { base44 } from '@/api/base44Client';
import { todayGregorian, getJalaliParts } from '@/lib/jalali';
import { formatCurrency, toPersianNum, currentJalaliMonthKey, gregorianToJalaliMonthKey } from '@/lib/stats';
import ChartTooltip from '@/components/ChartTooltip';
import { getRangeStart, buildDateRange, makeTickFormatter } from '@/lib/reportUtils';

export default function WorkshopsReportTab() {
  const [workshops, setWorkshops] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  useEffect(() => {
    (async () => {
      try {
        const [ws, purchs] = await Promise.all([
          base44.entities.Workshop.list('-start_date', 500),
          base44.entities.WorkshopPurchase.list('-purchase_date', 1000)
        ]);
        setWorkshops(ws);
        setPurchases(purchs);
      } finally { setLoading(false); }
    })();
  }, []);

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  // Cards by purchase_date in range
  const rangePurchases = useMemo(() => {
    return purchases.filter(p => p.purchase_date && p.purchase_date >= startDate && p.purchase_date <= endDate);
  }, [purchases, startDate, endDate]);

  const totalReg = rangePurchases.length;
  const uniquePeople = new Set(rangePurchases.map(p => p.person_phone)).size;
  const totalRevenue = rangePurchases.reduce((s, p) => s + (Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0), 0);
  const unpaidCount = rangePurchases.filter(p => !p.is_paid && p.payment_method !== 'free').length;

  // Current Jalali month
  const currentMonthKey = currentJalaliMonthKey();
  const workshopsStartingThisMonth = workshops.filter(w => gregorianToJalaliMonthKey(w.start_date) === currentMonthKey).length;
  const workshopsHeldThisMonth = workshops.filter(w => {
    const dates = w.session_dates || [];
    return dates.some(d => gregorianToJalaliMonthKey(d) === currentMonthKey);
  }).length;

  // Today's metrics
  const todayStr = todayGregorian();
  const todayPurchases = purchases.filter(p => p.purchase_date === todayStr);
  const todayRevenue = todayPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const todayHeldWorkshops = workshops.filter(w => (w.session_dates || []).includes(todayStr));
  const todayParticipants = todayHeldWorkshops.reduce((s, w) => {
    return s + purchases.filter(p => p.workshop_id === w.id).reduce((ss, p) => ss + (p.quantity || 1), 0);
  }, 0);
  const todayWorkshopCount = todayHeldWorkshops.length;

  // Charts
  const chartData = useMemo(() => {
    const dates = buildDateRange(startDate, endDate);
    return dates.map(date => {
      const dayPurchases = purchases.filter(p => p.purchase_date === date);
      const revenue = dayPurchases.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
      const heldWorkshops = workshops.filter(w => (w.session_dates || []).includes(date));
      const participants = heldWorkshops.reduce((s, w) => {
        return s + purchases.filter(p => p.workshop_id === w.id).reduce((ss, p) => ss + (p.quantity || 1), 0);
      }, 0);
      const workshopCount = heldWorkshops.length;
      return { date, revenue, participants, workshopCount };
    });
  }, [purchases, workshops, startDate, endDate]);

  const tickFormatter = makeTickFormatter(chartData);

  if (loading) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری گزارش...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="تعداد ثبت‌نام‌ها" value={toPersianNum(totalReg)} icon={Users} color="terracotta" info="تعداد کل ثبت‌نام‌های کارگاه‌ها در بازه انتخاب‌شده (بر اساس تاریخ ثبت‌نام)" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniquePeople)} icon={Users} color="teal" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده در کارگاه‌ها ثبت‌نام کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع مبالغ تمام فاکتورهای کارگاه‌ها در بازه انتخاب‌شده (شامل قیمت و دونیشن، بدون در نظر گرفتن وضعیت پرداخت)" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidCount)} icon={AlertCircle} color="pink" info="تعداد فاکتورهای کارگاه‌ها در بازه انتخاب‌شده که هنوز پرداخت نشده‌اند" />
        <StatCard label="کارگاه‌هایی که این ماه شروع می‌شوند" value={toPersianNum(workshopsStartingThisMonth)} icon={CalendarDays} color="terracotta" info="تعداد کارگاه‌هایی که تاریخ شروع آن‌ها در ماه جاری شمسی قرار دارد" />
        <StatCard label="کارگاه‌هایی که این ماه برگزار می‌شوند" value={toPersianNum(workshopsHeldThisMonth)} icon={GraduationCap} color="green" info="تعداد کارگاه‌هایی که در ماه جاری شمسی یک یا چند جلسه از آن‌ها برگزار می‌شود (بر اساس تاریخ جلسات)" />
      </div>

      <ReportToolbar
        rangePreset={rangePreset} setRangePreset={setRangePreset}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
      />

      <ChartCard title="درآمد" info="مجموع درآمد کارگاه‌ها در هر روز (شامل قیمت و دونیشن، بر اساس تاریخ ثبت‌نام)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
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

      <ChartCard title="تعداد شرکت‌کنندگان" info="مجموع تعداد شرکت‌کنندگان کارگاه‌هایی که در آن روز برگزار می‌شوند" todayLabel="شرکت‌کنندگان امروز" todayValue={toPersianNum(todayParticipants)}>
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

      <ChartCard title="تعداد کارگاه‌ها" info="تعداد کارگاه‌هایی که در آن روز برگزار می‌شوند (بر اساس تاریخ جلسات کارگاه)" todayLabel="کارگاه‌های امروز" todayValue={toPersianNum(todayWorkshopCount)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد کارگاه" formatter={toPersianNum} />} />
              <Bar dataKey="workshopCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
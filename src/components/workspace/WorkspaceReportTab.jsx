import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Briefcase, Users, TrendingUp, AlertCircle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import ReportToolbar from '@/components/ReportToolbar';
import { todayGregorian } from '@/lib/jalali';
import { formatCurrency, toPersianNum } from '@/lib/stats';
import { getOrderUsageDates } from '@/lib/workspaceCapacity';
import ChartTooltip from '@/components/ChartTooltip';
import { getRangeStart, buildDateRange, makeTickFormatter } from '@/lib/reportUtils';

export default function WorkspaceReportTab({ orders = [] }) {
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  // Cards based on purchase_date within range
  const rangeOrders = useMemo(() => {
    return orders.filter(o => o.purchase_date && o.purchase_date >= startDate && o.purchase_date <= endDate);
  }, [orders, startDate, endDate]);

  const totalOrders = rangeOrders.length;
  const uniquePeople = new Set(rangeOrders.map(o => o.person_phone)).size;
  const totalRevenue = rangeOrders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const unpaidCount = rangeOrders.filter(o => !o.is_paid && o.payment_method !== 'free').length;

  // Today's metrics (by usage dates)
  const todayStr = todayGregorian();
  const todayOrders = orders.filter(o => getOrderUsageDates(o).includes(todayStr));
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const todaySeats = todayOrders.reduce((s, o) => s + (o.quantity || 0), 0);
  const todayReservations = todayOrders.length;

  // Charts by usage dates
  const chartData = useMemo(() => {
    const dates = buildDateRange(startDate, endDate);
    return dates.map(date => {
      const dayOrders = orders.filter(o => getOrderUsageDates(o).includes(date));
      const revenue = dayOrders.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
      const seats = dayOrders.reduce((s, o) => s + (o.quantity || 0), 0);
      const reservations = dayOrders.length;
      return { date, revenue, seats, reservations };
    });
  }, [orders, startDate, endDate]);

  const tickFormatter = makeTickFormatter(chartData);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد سفارش‌ها" value={toPersianNum(totalOrders)} icon={Briefcase} color="terracotta" info="تعداد کل سفارش‌های فضای کار ثبت‌شده در بازه انتخاب‌شده (بر اساس تاریخ خرید)" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniquePeople)} icon={Users} color="teal" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده از فضای کار سفارش ثبت کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع مبالغ تمام فاکتورهای فضای کار در بازه انتخاب‌شده بدون در نظر گرفتن وضعیت پرداخت" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidCount)} icon={AlertCircle} color="pink" info="تعداد فاکتورهای فضای کار در بازه انتخاب‌شده که هنوز پرداخت نشده‌اند" />
      </div>

      <ReportToolbar
        rangePreset={rangePreset} setRangePreset={setRangePreset}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
      />

      <ChartCard title="درآمد" info="مجموع مبلغ درآمد فضای کار در هر روز (بر اساس روزهای رزرو شده)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
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

      <ChartCard title="تعداد صندلی‌های رزرو شده" info="مجموع تعداد صندلی‌های رزرو شده در هر روز" todayLabel="صندلی‌های امروز" todayValue={toPersianNum(todaySeats)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد صندلی" formatter={toPersianNum} />} />
              <Bar dataKey="seats" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="تعداد رزروها" info="مجموع تعداد رزروهای هر روز بدون در نظر گرفتن تعداد صندلی‌ها" todayLabel="رزروهای امروز" todayValue={toPersianNum(todayReservations)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد رزرو" formatter={toPersianNum} />} />
              <Bar dataKey="reservations" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
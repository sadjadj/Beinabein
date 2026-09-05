import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShoppingBag, Users, TrendingUp, AlertCircle } from 'lucide-react';
import StatCard from '@/components/StatCard';
import ChartCard from '@/components/ChartCard';
import ReportToolbar from '@/components/ReportToolbar';
import ChartTooltip from '@/components/ChartTooltip';
import { todayGregorian } from '@/lib/jalali';
import { formatCurrency, toPersianNum } from '@/lib/stats';
import { getRangeStart, buildDateRange, makeTickFormatter } from '@/lib/reportUtils';
import { storeSourceFilters } from '@/lib/storeInvoices';

export default function StoreReportTab({ groups }) {
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(getRangeStart('month'));
  const [customEnd, setCustomEnd] = useState(todayGregorian());
  const [sourceFilter, setSourceFilter] = useState('all');

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  const sourceFiltered = useMemo(() => groups.filter(g => sourceFilter === 'all' || g.source === sourceFilter), [groups, sourceFilter]);

  const rangeGroups = useMemo(() => sourceFiltered.filter(g =>
    g.purchase_date && g.purchase_date >= startDate && g.purchase_date <= endDate
  ), [sourceFiltered, startDate, endDate]);

  const chartData = useMemo(() => buildDateRange(startDate, endDate).map(date => {
    const dayGroups = rangeGroups.filter(g => g.purchase_date === date);
    return {
      date,
      revenue: dayGroups.reduce((s, g) => s + g.totalAmount, 0),
      itemCount: dayGroups.reduce((s, g) => s + g.itemCount, 0),
      orderCount: dayGroups.length,
    };
  }), [rangeGroups, startDate, endDate]);

  const todayStr = todayGregorian();
  const todayGroups = sourceFiltered.filter(g => g.purchase_date === todayStr);
  const todayRevenue = todayGroups.reduce((s, g) => s + g.totalAmount, 0);
  const todayItemCount = todayGroups.reduce((s, g) => s + g.itemCount, 0);
  const todayOrderCount = todayGroups.length;

  const uniqueBuyers = new Set(rangeGroups.map(g => g.person_phone)).size;
  const totalRevenue = rangeGroups.reduce((s, g) => s + g.totalAmount, 0);
  const unpaidCount = rangeGroups.filter(g => !g.is_paid).length;

  const tickFormatter = makeTickFormatter(chartData);
  const emptyBlock = <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد سفارش‌ها" value={toPersianNum(rangeGroups.length)} icon={ShoppingBag} color="terracotta" info="مجموع تعداد فاکتورهای فروشگاه در بازه انتخاب‌شده" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniqueBuyers)} icon={Users} color="pink" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده از فروشگاه خرید کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع مبالغ تمام فاکتورهای فروشگاه در بازه انتخاب‌شده، بدون در نظر گرفتن وضعیت پرداخت" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidCount)} icon={AlertCircle} color="teal" info="تعداد فاکتورهای فروشگاه در بازه انتخاب‌شده که هنوز پرداخت نشده‌اند" />
      </div>

      <div className="bg-white rounded-xl border border-border p-4 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">بخش:</span>
          {storeSourceFilters.map(f => (
            <button
              key={f.key}
              onClick={() => setSourceFilter(f.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${sourceFilter === f.key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <ReportToolbar
          rangePreset={rangePreset} setRangePreset={setRangePreset}
          customStart={customStart} setCustomStart={setCustomStart}
          customEnd={customEnd} setCustomEnd={setCustomEnd}
        />
      </div>

      <ChartCard title="درآمد" info="مجموع مبلغ درآمد فروشگاه در هر روز (با احتساب تخفیف)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
        {chartData.length === 0 ? emptyBlock : (
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

      <ChartCard title="تعداد آیتم‌های فروخته شده" info="مجموع تعداد آیتم‌های فروخته شده در فروشگاه در هر روز" todayLabel="آیتم‌های امروز" todayValue={toPersianNum(todayItemCount)}>
        {chartData.length === 0 ? emptyBlock : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد آیتم" formatter={toPersianNum} />} />
              <Bar dataKey="itemCount" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <ChartCard title="تعداد سفارش‌ها" info="مجموع تعداد فاکتورهای ثبت‌شده در فروشگاه در هر روز" todayLabel="فاکتورهای امروز" todayValue={toPersianNum(todayOrderCount)}>
        {chartData.length === 0 ? emptyBlock : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد فاکتور" formatter={toPersianNum} />} />
              <Bar dataKey="orderCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
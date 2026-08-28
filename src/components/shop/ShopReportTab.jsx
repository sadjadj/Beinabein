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

const SECTION_FILTERS = [
  { key: 'all', label: 'همه' },
  { key: 'store', label: 'استور' },
  { key: 'event', label: 'ویژه ایونت' },
  { key: 'greenhouse', label: 'گلخانه' },
];

export default function ShopReportTab({ sales }) {
  const [sectionFilter, setSectionFilter] = useState('all');
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  const filteredSales = useMemo(() => sales.filter(s =>
    (sectionFilter === 'all' || s.section === sectionFilter) &&
    s.sale_date && s.sale_date >= startDate && s.sale_date <= endDate
  ), [sales, sectionFilter, startDate, endDate]);

  const totalSales = filteredSales.length;
  const uniqueBuyers = new Set(filteredSales.map(s => s.buyer_phone)).size;
  const totalRevenue = filteredSales.reduce((s, p) => s + (p.unit_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);

  const groups = {};
  filteredSales.forEach(s => {
    const key = s.invoice_id || `no-inv-${s.buyer_phone}-${s.sale_date}`;
    if (!groups[key]) groups[key] = { is_paid: s.is_paid, payment_method: s.payment_method };
    if (!s.is_paid) groups[key].is_paid = false;
  });
  const unpaidInvoiceCount = Object.values(groups).filter(g => !g.is_paid && g.payment_method !== 'free').length;

  const chartData = useMemo(() => {
    const dates = buildDateRange(startDate, endDate);
    return dates.map(date => {
      const daySales = filteredSales.filter(s => s.sale_date === date);
      const revenue = daySales.reduce((s, p) => s + (p.unit_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
      const count = daySales.reduce((s, p) => s + (p.quantity || 1), 0);
      return { date, revenue, count };
    });
  }, [filteredSales, startDate, endDate]);

  const todayStr = todayGregorian();
  const todaySales = sales.filter(s => (sectionFilter === 'all' || s.section === sectionFilter) && s.sale_date === todayStr);
  const todayRevenue = todaySales.reduce((s, p) => s + (p.unit_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const todayCount = todaySales.reduce((s, p) => s + (p.quantity || 1), 0);

  const tickFormatter = makeTickFormatter(chartData);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground ml-1">بخش:</span>
          {SECTION_FILTERS.map(f => (
            <button key={f.key} onClick={() => setSectionFilter(f.key)} className={`px-4 py-2 rounded-lg text-sm font-medium ${sectionFilter === f.key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{f.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد فروش" value={toPersianNum(totalSales)} icon={ShoppingBag} color="terracotta" info="تعداد کل فروش‌های ثبت‌شده در فروشگاه در بازه و بخش انتخاب‌شده" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniqueBuyers)} icon={Users} color="pink" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه و بخش انتخاب‌شده از فروشگاه خرید کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع درآمد فروشگاه در بازه و بخش انتخاب‌شده (با احتساب تخفیف و بدون در نظر گرفتن وضعیت پرداخت)" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidInvoiceCount)} icon={AlertCircle} color="teal" info="تعداد فاکتورهای فروشگاه در بازه و بخش انتخاب‌شده که هنوز پرداخت نشده‌اند" />
      </div>

      <ReportToolbar rangePreset={rangePreset} setRangePreset={setRangePreset} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} />

      <ChartCard title="درآمد فروشگاه" info="مجموع مبلغ درآمد فروشگاه در هر روز (با احتساب تخفیف)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
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

      <ChartCard title="تعداد آیتم‌های فروخته شده" info="مجموع تعداد آیتم‌های فروخته شده در فروشگاه در هر روز" todayLabel="آیتم‌های امروز" todayValue={toPersianNum(todayCount)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد آیتم" formatter={toPersianNum} />} />
              <Bar dataKey="count" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
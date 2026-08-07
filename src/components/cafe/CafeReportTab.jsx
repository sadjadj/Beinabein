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

export default function CafeReportTab({ purchases }) {
  const [rangePreset, setRangePreset] = useState('month');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') return { startDate: customStart, endDate: customEnd };
    return { startDate: getRangeStart(rangePreset), endDate: todayGregorian() };
  }, [rangePreset, customStart, customEnd]);

  const chartData = useMemo(() => {
    const dates = buildDateRange(startDate, endDate);
    return dates.map(date => {
      const dayPurchases = purchases.filter(p => p.purchase_date === date);
      const revenue = dayPurchases.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
      const invoiceIds = new Set();
      const phoneDateKeys = new Set();
      dayPurchases.forEach(p => {
        if (p.invoice_id) invoiceIds.add(p.invoice_id);
        else phoneDateKeys.add(`${p.person_phone}-${p.purchase_date}`);
      });
      const invoiceCount = invoiceIds.size + phoneDateKeys.size;
      const itemCount = dayPurchases.reduce((s, p) => s + (p.quantity || 1), 0);
      return { date, revenue, invoiceCount, itemCount };
    });
  }, [purchases, startDate, endDate]);

  // Today's metrics
  const todayStr = todayGregorian();
  const todayPurchases = purchases.filter(p => p.purchase_date === todayStr);
  const todayRevenue = todayPurchases.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const todayInvoiceIds = new Set();
  const todayPhoneKeys = new Set();
  todayPurchases.forEach(p => {
    if (p.invoice_id) todayInvoiceIds.add(p.invoice_id);
    else todayPhoneKeys.add(`${p.person_phone}-${p.purchase_date}`);
  });
  const todayInvoiceCount = todayInvoiceIds.size + todayPhoneKeys.size;
  const todayItemCount = todayPurchases.reduce((s, p) => s + (p.quantity || 1), 0);

  // Range totals for stat cards
  const rangePurchases = purchases.filter(p => p.purchase_date >= startDate && p.purchase_date <= endDate);
  const totalPurchases = rangePurchases.length;
  const uniqueBuyers = new Set(rangePurchases.map(p => p.person_phone)).size;
  const totalRevenue = rangePurchases.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);

  // Unpaid invoices count in range
  const groups = {};
  rangePurchases.forEach(p => {
    const key = p.invoice_id || `no-inv-${p.person_phone}-${p.purchase_date}`;
    if (!groups[key]) groups[key] = { is_paid: p.is_paid, payment_method: p.payment_method };
    if (!p.is_paid) groups[key].is_paid = false;
  });
  const unpaidInvoiceCount = Object.values(groups).filter(g => !g.is_paid && g.payment_method !== 'free').length;

  const tickFormatter = makeTickFormatter(chartData);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد خرید" value={toPersianNum(totalPurchases)} icon={ShoppingBag} color="terracotta" info="تعداد کل خریدهای ثبت‌شده در کافه در بازه انتخاب‌شده" />
        <StatCard label="افراد یونیک" value={toPersianNum(uniqueBuyers)} icon={Users} color="pink" info="تعداد افراد یکتا بر اساس شماره تلفن که در بازه انتخاب‌شده از کافه خرید کرده‌اند" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" info="مجموع درآمد کافه در بازه انتخاب‌شده (با احتساب تخفیف و بدون در نظر گرفتن وضعیت پرداخت)" />
        <StatCard label="تعداد فاکتورهای پرداخت نشده" value={toPersianNum(unpaidInvoiceCount)} icon={AlertCircle} color="teal" info="تعداد فاکتورهای کافه در بازه انتخاب‌شده که هنوز پرداخت نشده‌اند" />
      </div>

      <ReportToolbar
        rangePreset={rangePreset} setRangePreset={setRangePreset}
        customStart={customStart} setCustomStart={setCustomStart}
        customEnd={customEnd} setCustomEnd={setCustomEnd}
      />

      <ChartCard title="درآمد" info="مجموع مبلغ درآمد کافه در هر روز (با احتساب تخفیف)" todayLabel="درآمد امروز" todayValue={formatCurrency(todayRevenue)}>
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

      <ChartCard title="تعداد آیتم‌ها" info="مجموع تعداد آیتم‌های فروش‌شده در کافه در هر روز" todayLabel="آیتم‌های امروز" todayValue={toPersianNum(todayItemCount)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
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

      <ChartCard title="تعداد سفارش‌ها" info="تعداد فاکتورهای ثبت‌شده در کافه در هر روز" todayLabel="فاکتورهای امروز" todayValue={toPersianNum(todayInvoiceCount)}>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<ChartTooltip unitLabel="تعداد فاکتور" formatter={toPersianNum} />} />
              <Bar dataKey="invoiceCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </div>
  );
}
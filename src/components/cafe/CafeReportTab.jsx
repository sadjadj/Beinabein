import React from 'react';
import { Coffee, Users, TrendingUp } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { computeCafeStats, toPersianNum, formatCurrency } from '@/lib/stats';
import { todayGregorian, toJalaliStr } from '@/lib/jalali';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function CafeReportTab({ purchases }) {
  const stats = computeCafeStats(purchases, null);
  const todaySales = purchases.filter(p => p.purchase_date === todayGregorian()).reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const dailySales = (() => {
    const map = {};
    purchases.forEach(p => {
      const d = p.purchase_date;
      if (!d) return;
      map[d] = (map[d] || 0) + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100);
    });
    return Object.entries(map).map(([date, amount]) => ({ date, amount })).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  })();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد خرید" value={toPersianNum(stats.totalPurchases)} icon={Coffee} color="terracotta" />
        <StatCard label="خریداران یونیک" value={toPersianNum(stats.uniqueBuyerCount)} icon={Users} color="teal" />
        <StatCard label="درآمد کل" value={formatCurrency(stats.totalSales)} icon={TrendingUp} color="ochre" />
        <StatCard label="فروش امروز" value={formatCurrency(todaySales)} icon={TrendingUp} color="pink" />
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">حجم فروش روزانه (۳۰ روز اخیر)</h3>
        {dailySales.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={dailySales}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={toJalaliStr} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={70} />
              <Tooltip labelFormatter={toJalaliStr} formatter={(v) => [formatCurrency(v), 'فروش']} />
              <Bar dataKey="amount" fill="#B74B40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
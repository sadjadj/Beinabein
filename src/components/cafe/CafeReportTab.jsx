import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { todayGregorian, getJalaliParts, jalaliToGregorianStr, toPersianDigits } from '@/lib/jalali';
import { formatCurrency, toPersianNum } from '@/lib/stats';
import JalaliDateInput from '@/components/JalaliDateInput';

const RANGE_PRESETS = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'custom', label: 'بازه دلخواه' },
];

function getRangeStart(preset) {
  const today = todayGregorian();
  const parts = getJalaliParts(today);
  if (preset === 'today') return today;
  if (preset === 'week') {
    const jsDay = new Date().getDay(); // 0=Sunday, 6=Saturday
    const persianDay = (jsDay + 1) % 7; // Saturday=0 ... Friday=6
    const d = new Date();
    d.setDate(d.getDate() - persianDay);
    return d.toISOString().split('T')[0];
  }
  if (preset === 'month') return jalaliToGregorianStr(parts.jy, parts.jm, 1);
  return today;
}

function buildDateRange(start, end) {
  const dates = [];
  if (!start || !end) return dates;
  let cursor = new Date(start + 'T00:00:00');
  const endD = new Date(end + 'T00:00:00');
  while (cursor <= endD) {
    dates.push(cursor.toISOString().split('T')[0]);
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export default function CafeReportTab({ purchases }) {
  const [rangePreset, setRangePreset] = useState('today');
  const [customStart, setCustomStart] = useState(todayGregorian());
  const [customEnd, setCustomEnd] = useState(todayGregorian());

  const { startDate, endDate } = useMemo(() => {
    if (rangePreset === 'custom') {
      return { startDate: customStart, endDate: customEnd };
    }
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

  const allParts = chartData.map(d => getJalaliParts(d.date)).filter(Boolean);
  const sameMonth = allParts.length > 0 && allParts.every(p => p.jy === allParts[0].jy && p.jm === allParts[0].jm);
  const sameYear = allParts.length > 0 && allParts.every(p => p.jy === allParts[0].jy);

  const tickFormatter = (dateStr) => {
    const p = getJalaliParts(dateStr);
    if (!p) return '';
    if (sameMonth) return toPersianDigits(p.jd);
    if (sameYear) return `${toPersianDigits(p.jd)}/${toPersianDigits(p.jm)}`;
    return `${toPersianDigits(p.jd)}/${toPersianDigits(p.jm)}/${toPersianDigits(p.jy)}`;
  };

  const totalRevenue = chartData.reduce((s, d) => s + d.revenue, 0);
  const totalInvoices = chartData.reduce((s, d) => s + d.invoiceCount, 0);
  const totalItems = chartData.reduce((s, d) => s + d.itemCount, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {RANGE_PRESETS.map(p => (
            <button
              key={p.key}
              onClick={() => setRangePreset(p.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${rangePreset === p.key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {rangePreset === 'custom' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">از تاریخ</label>
              <JalaliDateInput value={customStart} onChange={setCustomStart} showToday={false} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تا تاریخ</label>
              <JalaliDateInput value={customEnd} onChange={setCustomEnd} showToday={false} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">مجموع مبلغ درآمد</h3>
        <p className="text-2xl font-bold text-[#B74B40] mb-4">{formatCurrency(totalRevenue)}</p>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={70} />
              <Tooltip labelFormatter={tickFormatter} formatter={(v) => [formatCurrency(v), 'درآمد']} />
              <Bar dataKey="revenue" fill="#B74B40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">تعداد فاکتورهای ثبت شده</h3>
        <p className="text-2xl font-bold text-[#B74B40] mb-4">{toPersianNum(totalInvoices)}</p>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip labelFormatter={tickFormatter} formatter={(v) => [toPersianNum(v), 'فاکتور']} />
              <Bar dataKey="invoiceCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-1">مجموع تعداد آیتم‌های ثبت شده</h3>
        <p className="text-2xl font-bold text-[#B74B40] mb-4">{toPersianNum(totalItems)}</p>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip labelFormatter={tickFormatter} formatter={(v) => [toPersianNum(v), 'آیتم']} />
              <Bar dataKey="itemCount" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
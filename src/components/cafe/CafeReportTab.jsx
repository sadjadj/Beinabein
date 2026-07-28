import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ShoppingBag, Users, TrendingUp, Wallet } from 'lucide-react';
import StatCard from '@/components/StatCard';
import { todayGregorian, getJalaliParts, jalaliToGregorianStr, toPersianDigits, formatJalaliFull } from '@/lib/jalali';
import { formatCurrency, toPersianNum } from '@/lib/stats';
import JalaliDateInput from '@/components/JalaliDateInput';

const RANGE_PRESETS = [
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'custom', label: 'بازه دلخواه' },
];

function getRangeStart(preset) {
  const today = todayGregorian();
  const parts = getJalaliParts(today);
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

function CustomTooltip({ active, payload, label, unitLabel, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{formatJalaliFull(label)}</p>
      <p className="text-muted-foreground">{unitLabel}: <span className="font-medium text-foreground">{formatter(payload[0].value)}</span></p>
    </div>
  );
}

export default function CafeReportTab({ purchases }) {
  const [rangePreset, setRangePreset] = useState('month');
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="تعداد خرید" value={toPersianNum(totalPurchases)} icon={ShoppingBag} color="terracotta" />
        <StatCard label="خریداران یونیک" value={toPersianNum(uniqueBuyers)} icon={Users} color="pink" />
        <StatCard label="درآمد کل" value={formatCurrency(totalRevenue)} icon={TrendingUp} color="ochre" />
        <StatCard label="فروش امروز" value={formatCurrency(todayRevenue)} icon={Wallet} color="teal" />
      </div>

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
              <JalaliDateInput value={customEnd} onChange={setCustomEnd} showToday={true} />
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">مجموع مبلغ درآمد</h3>
          <div className="text-left">
            <span className="text-xs text-muted-foreground">درآمد امروز: </span>
            <span className="text-sm font-bold text-[#B74B40]">{formatCurrency(todayRevenue)}</span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={70} />
              <Tooltip content={<CustomTooltip unitLabel="درآمد" formatter={formatCurrency} />} />
              <Bar dataKey="revenue" fill="#B74B40" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">تعداد فاکتورهای ثبت شده</h3>
          <div className="text-left">
            <span className="text-xs text-muted-foreground">فاکتورهای امروز: </span>
            <span className="text-sm font-bold text-[#D98B94]">{toPersianNum(todayInvoiceCount)}</span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<CustomTooltip unitLabel="تعداد فاکتور" formatter={toPersianNum} />} />
              <Bar dataKey="invoiceCount" fill="#D98B94" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold">مجموع تعداد آیتم‌های ثبت شده</h3>
          <div className="text-left">
            <span className="text-xs text-muted-foreground">آیتم‌های امروز: </span>
            <span className="text-sm font-bold text-[#B9834B]">{toPersianNum(todayItemCount)}</span>
          </div>
        </div>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
              <XAxis dataKey="date" tickFormatter={tickFormatter} tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => Number(v).toLocaleString('fa-IR')} width={40} />
              <Tooltip content={<CustomTooltip unitLabel="تعداد آیتم" formatter={toPersianNum} />} />
              <Bar dataKey="itemCount" fill="#B9834B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
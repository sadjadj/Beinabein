import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, LabelList } from 'recharts';
import StatCard from '@/components/StatCard';
import { Users, Repeat, Layers, ChevronDown, Wallet } from 'lucide-react';
import { computeOverallStats, computeDailyUniques, computeSectionDistribution, getDateRange, toPersianNum, formatPercent, formatCurrency } from '@/lib/stats';
import { toJalaliStr } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';

const COLORS = ['#B74B40', '#D4A574', '#E8B4B0', '#D98B94'];
const presets = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'last_month', label: 'ماه گذشته' },
  { key: 'quarter', label: 'سه ماه' },
  { key: 'year', label: 'امسال' },
  { key: 'all_time', label: 'کل دوره' },
  { key: 'specific_date', label: 'بازه خاص' },
];

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [] });
  const [preset, setPreset] = useState('week');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState(new Date().toISOString().split('T')[0]);

  const range = getDateRange(preset, customStart, customEnd);
  const currentPreset = presets.find(p => p.key === preset);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [workspaceOrders, itemPurchases, workshopPurchases] = await Promise.all([
          base44.entities.WorkspaceOrder.list('-created_date', 1000),
          base44.entities.ItemPurchase.list('-created_date', 1000),
          base44.entities.WorkshopPurchase.list('-created_date', 1000),
        ]);
        setData({ workspaceOrders, itemPurchases, workshopPurchases });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const stats = computeOverallStats(data.workspaceOrders, data.itemPurchases, data.workshopPurchases, range);
  const dailyUniques = computeDailyUniques(data.workspaceOrders, data.itemPurchases, data.workshopPurchases, range);
  const sectionDist = computeSectionDistribution(data.workspaceOrders, data.itemPurchases, data.workshopPurchases, range);
  const totalSection = sectionDist.reduce((s, d) => s + d.value, 0) || 1;

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-[340px] lg:col-span-2 rounded-xl" />
          <Skeleton className="h-[340px] rounded-xl" />
        </div>
        <Skeleton className="h-24 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">داشبورد</h1>
          <p className="text-sm text-muted-foreground mt-1">سنجه‌های پیشرفت بینابین</p>
        </div>
        <div className="relative">
          <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-muted">
            {currentPreset?.label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-48 py-1">
                {presets.map(p => (
                  <button key={p.key} onClick={() => { setPreset(p.key); setDropdownOpen(false); }} className={`w-full text-right px-4 py-2 text-sm hover:bg-muted ${preset === p.key ? 'text-[#B74B40] font-medium' : ''}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {preset === 'specific_date' && (
        <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">از:</label>
            <JalaliDateInput value={customStart} onChange={setCustomStart} showToday={false} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-muted-foreground">تا:</label>
            <JalaliDateInput value={customEnd} onChange={setCustomEnd} showToday={false} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="افراد یونیک دوره" value={toPersianNum(stats.uniqueCount)} sublabel="افراد متفاوت" icon={Users} color="terracotta" info="تعداد افراد متفاوتی که در بازه زمانی انتخاب شده از خدمات بینابین استفاده کرده‌اند." />
        <StatCard label="نرخ بازگشت" value={formatPercent(stats.returnRate)} sublabel={`${toPersianNum(stats.totalPeople)} نفر کل`} icon={Repeat} color="ochre" info="درصد افرادی که بیش از یک بار از خدمات بینابین استفاده کرده‌اند." />
        <StatCard label="شاخص تنوع" value={formatPercent(stats.diversityRate)} sublabel="بیش از یک بخش" icon={Layers} color="pink" info="درصد افرادی که از بیش از یک بخش (کافه، فضای کار، کارگاه) استفاده کرده‌اند." />
        <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">درآمد کل</p>
              <p className="text-xl lg:text-2xl font-bold mt-2 text-foreground break-words leading-tight">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-1">این دوره</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-[#F0F7F8] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#8CB9C0]" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">روند افراد یونیک روزانه</h3>
          {dailyUniques.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای در این بازه نیست</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyUniques}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                  <XAxis dataKey="date" tickFormatter={toJalaliStr} tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={toJalaliStr} formatter={(v) => [toPersianNum(v) + ' نفر', 'افراد یونیک']} />
                  <Bar dataKey="count" fill="#B74B40" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="count" position="top" formatter={toPersianNum} style={{ fontSize: '10px', fill: '#71717a' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 text-xs text-muted-foreground text-center">
                میانگین روزانه: {toPersianNum((dailyUniques.reduce((s, d) => s + d.count, 0) / dailyUniques.length).toFixed(1))} نفر • بیشترین: {toPersianNum(Math.max(...dailyUniques.map(d => d.count)))} نفر
              </div>
            </>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">توزیع حضور در بخش‌ها</h3>
          {sectionDist.every(s => s.value === 0) ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={sectionDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {sectionDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {sectionDist.map((s, i) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }}></span>
                      {s.name}
                    </span>
                    <span className="font-medium">{toPersianNum(s.value)} نفر</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4">تفکیک درآمد</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#B74B40]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">فضای کار</p>
              <p className="text-sm font-bold">{formatCurrency(stats.workspaceRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FBF3EC] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#B9834B]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">کافه</p>
              <p className="text-sm font-bold">{formatCurrency(stats.cafeRevenue)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#F0F7F8] flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-[#8CB9C0]" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">کارگاه</p>
              <p className="text-sm font-bold">{formatCurrency(stats.workshopRevenue)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
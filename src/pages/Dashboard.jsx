import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import StatCard from '@/components/StatCard';
import { Users, Clock, Repeat, Layers, PartyPopper, TrendingUp } from 'lucide-react';
import { computeOverallStats, computeDailyUniques, computeSectionDistribution, getDateRange, toPersianNum, formatPercent } from '@/lib/stats';

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
const presets = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'last_month', label: 'ماه گذشته' },
];

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [] });
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const range = getDateRange(preset, customStart, customEnd);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [workspaceVisits, cafePurchases, workshops, events] = await Promise.all([
          base44.entities.WorkspaceVisit.list('-created_date', 500),
          base44.entities.CafePurchase.list('-created_date', 500),
          base44.entities.Workshop.list('-created_date', 500),
          base44.entities.BigEvent.list('-created_date', 500),
        ]);
        setData({ workspaceVisits, cafePurchases, workshops, events });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const stats = computeOverallStats(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);
  const dailyUniques = computeDailyUniques(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);
  const sectionDist = computeSectionDistribution(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
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
        <div className="flex flex-wrap items-center gap-2">
          {presets.map(p => (
            <button key={p.key} onClick={() => setPreset(p.key)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preset === p.key ? 'bg-amber-600 text-white' : 'bg-white text-muted-foreground hover:bg-muted border border-border'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} sublabel="افراد متفاوت" icon={Users} color="amber" />
        <StatCard label="نفر-ساعت (بدون رویداد)" value={toPersianNum(stats.personHours)} sublabel="زمان حضور در فضای کار" icon={Clock} color="blue" />
        <StatCard label="نرخ بازگشت" value={formatPercent(stats.returnRate)} sublabel={`${toPersianNum(stats.totalPeople)} نفر کل`} icon={Repeat} color="green" />
        <StatCard label="شاخص تنوع استفاده" value={formatPercent(stats.diversityRate)} sublabel="بیش از یک بخش" icon={Layers} color="purple" />
      </div>

      <div className="bg-gradient-to-l from-amber-50 to-orange-50 rounded-xl border border-amber-100 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">تبدیل رویداد به رابطه</p>
            <p className="text-2xl font-bold text-amber-700">{formatPercent(stats.conversionRate)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {toPersianNum(stats.conversionCount)} از {toPersianNum(stats.eventCount)} نفر از رویدادها به بینابین برگشته‌اند
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            روند افراد یونیک روزانه
          </h3>
          {dailyUniques.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای در این بازه نیست</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyUniques}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatDateLabel} formatter={(v) => [toPersianNum(v) + ' نفر', 'افراد یونیک']} />
                <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4">توزیع حضور در بخش‌ها</h3>
          {sectionDist.every(s => s.value === 0) ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای نیست</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={sectionDist} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${toPersianNum(value)}`}>
                  {sectionDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => toPersianNum(v) + ' نفر'} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
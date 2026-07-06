import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import StatCard from '@/components/StatCard';
import { Users, Clock, Repeat, Layers, PartyPopper, TrendingUp, UserCircle } from 'lucide-react';
import { computeOverallStats, computeDailyUniques, computeSectionDistribution, getDateRange, toPersianNum, formatPercent } from '@/lib/stats';

const COLORS = ['#374151', '#6b7280', '#9ca3af', '#d1d5db'];
const presets = [
  { key: 'today', label: 'امروز' },
  { key: 'week', label: 'این هفته' },
  { key: 'month', label: 'این ماه' },
  { key: 'last_month', label: 'ماه گذشته' },
  { key: 'quarter', label: 'سه ماه' },
  { key: 'year', label: 'امسال' },
  { key: 'all_time', label: 'کل دوره' },
  { key: 'specific_date', label: 'تاریخ خاص' },
];

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('fa-IR', { day: 'numeric', month: 'short' });
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [], people: [] });
  const [preset, setPreset] = useState('month');
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState('');

  const range = getDateRange(preset, customStart, customEnd);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [workspaceVisits, cafePurchases, workshops, events, people] = await Promise.all([
          base44.entities.WorkspaceVisit.list('-created_date', 500),
          base44.entities.CafePurchase.list('-created_date', 500),
          base44.entities.Workshop.list('-created_date', 500),
          base44.entities.BigEvent.list('-created_date', 500),
          base44.entities.Person.list('-created_date', 500),
        ]);
        setData({ workspaceVisits, cafePurchases, workshops, events, people });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const stats = computeOverallStats(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);
  const dailyUniques = computeDailyUniques(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);
  const sectionDist = computeSectionDistribution(data.workspaceVisits, data.cafePurchases, data.workshops, data.events, range);
  const totalPeople = data.people.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin"></div>
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
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${preset === p.key ? 'bg-gray-900 text-white' : 'bg-white text-muted-foreground hover:bg-muted border border-border'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {preset === 'specific_date' && (
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <label className="text-sm text-muted-foreground">انتخاب تاریخ:</label>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
        <StatCard label="کل افراد ثبت‌شده" value={toPersianNum(totalPeople)} sublabel="در پایگاه داده" icon={UserCircle} color="dark" />
        <StatCard label="افراد یونیک دوره" value={toPersianNum(stats.uniqueCount)} sublabel="افراد متفاوت" icon={Users} color="medium" />
        <StatCard label="نفر-ساعت" value={toPersianNum(stats.personHours)} sublabel="زمان حضور در فضای کار" icon={Clock} color="light" />
        <StatCard label="نرخ بازگشت" value={formatPercent(stats.returnRate)} sublabel={`${toPersianNum(stats.totalPeople)} نفر کل`} icon={Repeat} color="dark" />
        <StatCard label="شاخص تنوع" value={formatPercent(stats.diversityRate)} sublabel="بیش از یک بخش" icon={Layers} color="medium" />
      </div>

      <div className="bg-gray-100 rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
            <PartyPopper className="w-5 h-5 text-gray-700" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">تبدیل رویداد به رابطه</p>
            <p className="text-2xl font-bold text-gray-800">{formatPercent(stats.conversionRate)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {toPersianNum(stats.conversionCount)} از {toPersianNum(stats.eventCount)} نفر از رویدادها به بینابین برگشته‌اند
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-gray-700" />
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
                <Bar dataKey="count" fill="#374151" radius={[4, 4, 0, 0]} />
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
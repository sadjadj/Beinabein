import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';
import StatCard from '@/components/StatCard';
import { Users, Clock, Repeat, Layers, TrendingUp, UserCircle, ChevronDown } from 'lucide-react';
import { computeOverallStats, computeDailyUniques, computeSectionDistribution, getDateRange, toPersianNum, formatPercent } from '@/lib/stats';
import { toJalaliStr } from '@/lib/jalali';

const COLORS = ['#B74B40', '#D98B94', '#B9834B', '#8CB9C0'];
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
  return toJalaliStr(dateStr);
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [] });
  const [preset, setPreset] = useState('month');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [customStart, setCustomStart] = useState(new Date().toISOString().split('T')[0]);
  const [customEnd, setCustomEnd] = useState('');

  const range = getDateRange(preset, customStart, customEnd);
  const currentPreset = presets.find(p => p.key === preset);

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
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div>
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
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-border text-sm font-medium hover:bg-muted"
          >
            {currentPreset?.label}
            <ChevronDown className="w-4 h-4" />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-48 py-1">
                {presets.map(p => (
                  <button
                    key={p.key}
                    onClick={() => { setPreset(p.key); setDropdownOpen(false); }}
                    className={`w-full text-right px-4 py-2 text-sm hover:bg-muted ${preset === p.key ? 'text-[#B74B40] font-medium' : ''}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {(preset === 'specific_date') && (
        <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
          <label className="text-sm text-muted-foreground">انتخاب تاریخ:</label>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard label="افراد یونیک دوره" value={toPersianNum(stats.uniqueCount)} sublabel="افراد متفاوت" icon={Users} color="terracotta" />
        <StatCard label="نفر-ساعت" value={toPersianNum(stats.personHours)} sublabel="زمان حضور در فضای کار" icon={Clock} color="teal" />
        <StatCard label="نرخ بازگشت" value={formatPercent(stats.returnRate)} sublabel={`${toPersianNum(stats.totalPeople)} نفر کل`} icon={Repeat} color="ochre" />
        <StatCard label="شاخص تنوع" value={formatPercent(stats.diversityRate)} sublabel="بیش از یک بخش" icon={Layers} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#B74B40]" />
            روند افراد یونیک روزانه
          </h3>
          {dailyUniques.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">داده‌ای در این بازه نیست</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyUniques}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="date" tickFormatter={formatDateLabel} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={formatDateLabel} formatter={(v) => [toPersianNum(v) + ' نفر', 'افراد یونیک']} />
                <Bar dataKey="count" fill="#B74B40" radius={[4, 4, 0, 0]} />
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
                <Pie data={sectionDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={70} label={false}>
                  {sectionDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Tooltip formatter={(v) => toPersianNum(v) + ' نفر'} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
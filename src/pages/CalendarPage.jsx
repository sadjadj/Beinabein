import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { dayLabels, dayOrder } from '@/lib/labels';
import { toJalaliStr } from '@/lib/jalali';

export default function CalendarPage() {
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await base44.entities.Workshop.list('-start_date', 500);
        setWorkshops(data);
      } finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const byDay = {};
  dayOrder.forEach(d => { byDay[d] = []; });
  workshops.forEach(w => { if (w.day_of_week && byDay[w.day_of_week]) byDay[w.day_of_week].push(w); });
  Object.values(byDay).forEach(arr => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">تقویم برنامه‌ها</h1>
        <p className="text-sm text-muted-foreground mt-1">برنامه هفتگی کارگاه‌ها</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /> کارگاه‌های فعال</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(workshops.length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock className="w-4 h-4" /> دائمی</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(workshops.filter(w => w.is_permanent).length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-4 h-4" /> روزهای فعال</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(dayOrder.filter(d => byDay[d].length > 0).length)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Calendar className="w-4 h-4" /> این هفته</div>
          <p className="text-2xl font-bold mt-1">{toPersianNum(workshops.filter(w => w.start_date && w.start_date <= new Date().toISOString().split('T')[0]).length)}</p>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
      ) : (
        <div className="space-y-4">
          {dayOrder.map(day => {
            const dayWorkshops = byDay[day];
            if (dayWorkshops.length === 0) return null;
            return (
              <div key={day} className="bg-white rounded-xl border border-border overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold">{dayLabels[day]}</h3>
                </div>
                <div className="divide-y divide-border">
                  {dayWorkshops.map(w => (
                    <div key={w.id} className="p-4 flex items-start gap-4">
                      <div className="flex flex-col items-center min-w-[70px]">
                        <span className="text-sm font-medium">{w.time || '-'}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{w.title}</h4>
                          {w.is_permanent && <span className="px-2 py-0.5 rounded-full text-xs bg-[#F0F7F8] text-[#8CB9C0]">دائمی</span>}
                        </div>
                        {w.tags && <p className="text-xs text-muted-foreground mt-1">{w.tags}</p>}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          {w.space && <span className="inline-flex items-center gap-1 text-[#8CB9C0]"><MapPin className="w-3 h-3" /> {w.space}</span>}
                          {w.start_date && <span className="text-muted-foreground">شروع: {toJalaliStr(w.start_date)}</span>}
                          {w.end_date && <span className="text-muted-foreground">پایان: {toJalaliStr(w.end_date)}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {dayOrder.every(d => byDay[d].length === 0) && (
            <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
              هنوز کارگاهی با روز مشخص ثبت نشده است
            </div>
          )}
        </div>
      )}
    </div>
  );
}
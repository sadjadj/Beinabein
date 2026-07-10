import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Users, Calendar, Search, Sparkles } from 'lucide-react';
import { computeLastNonCafeService, countNewThisMonth, advancedPersonSearch, toPersianNum } from '@/lib/stats';
import { howMetLabels } from '@/lib/labels';
import { formatJalaliShort } from '@/lib/jalali';

export default function PeoplePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [allData, setAllData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [], workshops: [], facilitators: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [persons, wsOrders, itemPurchases, workshopPurchases, workshops, facilitators, sessions] = await Promise.all([
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkspaceOrder.list('-purchase_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.Facilitator.list('-created_date', 500),
        base44.entities.WorkshopSession.list('-created_date', 500)
      ]);
      setAllData({ workspaceOrders: wsOrders, itemPurchases, workshopPurchases, workshops, facilitators, sessions });
      setPeople(persons);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = advancedPersonSearch(people, search, allData);
  const newThisMonth = countNewThisMonth(people);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">افراد</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت ارتباط با افراد (CRM)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="کل افراد" value={toPersianNum(people.length)} icon={Users} color="terracotta" />
        <StatCard label="افراد اضافه شده در این ماه" value={toPersianNum(newThisMonth)} icon={Calendar} color="ochre" />
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold">فهرست افراد</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو: نام، شماره، کارگاه، تسهیلگر..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-72"
            />
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search ? 'نتیجه‌ای یافت نشد' : 'هنوز فردی ثبت نشده است'}</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-right p-3 font-medium">نام</th>
                    <th className="text-right p-3 font-medium">شماره</th>
                    <th className="text-right p-3 font-medium">نحوه آشنایی</th>
                    <th className="text-center p-3 font-medium">آخرین خدمت</th>
                    <th className="text-center p-3 font-medium">کل</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(p => {
                    const lastService = computeLastNonCafeService(p.phone, allData.workspaceOrders, allData.workshopPurchases);
                    const totalActivity = (allData.workspaceOrders.filter(o => o.person_phone === p.phone).length) +
                      (allData.itemPurchases.filter(i => i.person_phone === p.phone).length) +
                      (allData.workshopPurchases.filter(w => w.person_phone === p.phone).length);
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => navigate(`/people/${p.id}`)}>
                        <td className="p-3 font-medium text-gray-800">{p.full_name || '-'}</td>
                        <td className="p-3 text-muted-foreground">{p.phone}</td>
                        <td className="p-3 text-xs">{howMetLabels[p.how_met] || p.how_met || '-'}</td>
                        <td className="p-3 text-center text-xs">
                          {lastService ? (
                            <span className="inline-flex items-center gap-1">
                              <span className="text-gray-700">{lastService.type}</span>
                              {lastService.date && <span className="text-muted-foreground">{formatJalaliShort(lastService.date)}</span>}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="p-3 text-center font-semibold">{toPersianNum(totalActivity)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-border text-xs text-muted-foreground text-center">
              {toPersianNum(filtered.length)} نفر نمایش داده شده
            </div>
          </>
        )}
      </div>

      {search && filtered.length > 0 && (
        <div className="bg-[#FBF3EC] rounded-lg border border-[#E8D5C0] p-3 flex items-center gap-2 text-sm text-[#B9834B]">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          جستجوی «{search}» — {toPersianNum(filtered.length)} نفر مرتبط یافت شد
        </div>
      )}
    </div>
  );
}
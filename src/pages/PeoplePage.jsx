import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Users, Calendar, Search, Sparkles, Plus, X } from 'lucide-react';
import { computeLastNonCafeService, countNewThisMonth, advancedPersonSearch, toPersianNum, formatPercent } from '@/lib/stats';
import { howMetLabels, genderLabels } from '@/lib/labels';
import HowMetBadge from '@/components/HowMetBadge';
import { formatJalaliShort, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import { sanitizePhone, sanitizeName } from '@/lib/inputUtils';
import { TableSkeleton } from '@/components/SkeletonPatterns';

export default function PeoplePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [allData, setAllData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [], workshops: [], facilitators: [], sessions: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: '', phone: '', how_met: '', age: '', gender: '', first_usage: '', notes: '', social_id: '' });
  const [adding, setAdding] = useState(false);

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

  const [dupError, setDupError] = useState('');

  const handleAddPerson = async (e) => {
    e.preventDefault();
    if (!addForm.full_name || !addForm.phone) return;
    setAdding(true);
    setDupError('');
    try {
      const existing = await base44.entities.Person.filter({ phone: addForm.phone });
      if (existing && existing.length > 0) {
        setDupError('شخصی با این شماره تلفن قبلاً ثبت شده است');
        return;
      }
      const existingName = people.find(p => p.full_name && p.full_name.trim() === addForm.full_name.trim());
      if (existingName) {
        setDupError('شخصی با این نام قبلاً ثبت شده است');
        return;
      }
      await base44.entities.Person.create({
        ...addForm,
        age: addForm.age ? Number(addForm.age) : null,
        first_usage: addForm.first_usage || null
      });
      setAddForm({ full_name: '', phone: '', how_met: '', age: '', gender: '', first_usage: '', notes: '', social_id: '' });
      setShowAddForm(false);
      fetchData();
    } finally { setAdding(false); }
  };

  const genderFiltered = genderFilter === 'unknown'
    ? people.filter(p => !p.gender)
    : genderFilter ? people.filter(p => p.gender === genderFilter) : people;
  const filtered = advancedPersonSearch(genderFiltered, search, allData);
  const newThisMonth = countNewThisMonth(people);

  const isComplete = (p) => !!(p.full_name && p.phone && p.how_met && p.gender);
  const sortedFiltered = [...filtered].sort((a, b) => {
    const aComplete = isComplete(a);
    const bComplete = isComplete(b);
    if (aComplete === bComplete) return 0;
    return aComplete ? -1 : 1;
  });

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

      {people.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold mb-3">توزیع جنسیتی</h3>
          <div className="grid grid-cols-3 gap-4">
            {(() => {
              const male = people.filter(p => p.gender === 'male').length;
              const female = people.filter(p => p.gender === 'female').length;
              const unknown = people.length - male - female;
              const total = people.length;
              const items = [
                { key: 'male', label: 'آقا', count: male, color: 'bg-[#8CB9C0]', text: 'text-[#8CB9C0]' },
                { key: 'female', label: 'خانم', count: female, color: 'bg-[#D98B94]', text: 'text-[#D98B94]' },
                { key: 'unknown', label: 'نامشخص', count: unknown, color: 'bg-gray-300', text: 'text-gray-400' },
              ];
              return items.map(item => (
                <button
                  key={item.key}
                  onClick={() => setGenderFilter(genderFilter === item.key ? '' : item.key)}
                  className={`text-center rounded-lg p-2 transition-all ${genderFilter === item.key ? 'ring-2 ring-[#B74B40]/30 bg-[#FDF2F1]/50' : 'hover:bg-muted/50'}`}
                >
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div className={`absolute inset-y-0 right-0 ${item.color} rounded-full`} style={{ width: `${(item.count / total) * 100}%` }} />
                  </div>
                  <p className={`text-lg font-bold ${item.text}`}>{formatPercent((item.count / total) * 100)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.label} • {toPersianNum(item.count)} نفر</p>
                </button>
              ));
            })()}
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <form onSubmit={handleAddPerson} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">نام و نام خانوادگی *</label>
              <input type="text" value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: sanitizeName(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">شماره تلفن *</label>
              <input type="tel" value={addForm.phone} onChange={e => setAddForm({ ...addForm, phone: sanitizePhone(e.target.value) })} dir="ltr" placeholder="۰xxxxxxxxxx" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" required />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
              <select value={addForm.how_met} onChange={e => setAddForm({ ...addForm, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">انتخاب...</option>
                {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">سن</label>
              <PersianNumberInput value={addForm.age} onChange={v => setAddForm({ ...addForm, age: v })} placeholder="سن" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">جنسیت</label>
              <select value={addForm.gender} onChange={e => setAddForm({ ...addForm, gender: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">انتخاب...</option>
                {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">آیدی شبکه اجتماعی</label>
              <input type="text" value={addForm.social_id} onChange={e => setAddForm({ ...addForm, social_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ ورود</label>
              <JalaliDateInput value={addForm.first_usage} onChange={v => setAddForm({ ...addForm, first_usage: v })} />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground block mb-1">یادداشت</label>
              <textarea value={addForm.notes} onChange={e => setAddForm({ ...addForm, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button type="submit" disabled={adding} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {adding ? 'در حال ثبت...' : 'ثبت'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
            {dupError && <p className="text-xs text-red-600 sm:col-span-2 lg:col-span-3">{dupError}</p>}
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            فهرست افراد
            {genderFilter && (
              <button onClick={() => setGenderFilter('')} className="px-2 py-0.5 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs font-medium flex items-center gap-1">
                {genderFilter === 'male' ? 'آقا' : genderFilter === 'female' ? 'خانم' : 'نامشخص'}
                <X className="w-3 h-3" />
              </button>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
              <Plus className="w-4 h-4" /> افزودن فرد
            </button>
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
        </div>

        {loading ? (
          <TableSkeleton rows={6} cols={5} />
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
                    <th className="text-center p-3 font-medium">مجموع خدمات</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiltered.map(p => {
                    const lastService = computeLastNonCafeService(p.phone, allData.workspaceOrders, allData.workshopPurchases);
                    const totalActivity = (allData.workspaceOrders.filter(o => o.person_phone === p.phone).length) +
                      (allData.itemPurchases.filter(i => i.person_phone === p.phone).length) +
                      (allData.workshopPurchases.filter(w => w.person_phone === p.phone).length);
                    return (
                      <tr key={p.id} className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => navigate(`/people/${p.id}`)}>
                        <td className="p-3 font-medium text-gray-800">{p.full_name || '-'}</td>
                        <td className="p-3 text-muted-foreground">{p.phone}</td>
                        <td className="p-3"><HowMetBadge value={p.how_met} /></td>
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
              {toPersianNum(sortedFiltered.length)} نفر نمایش داده شده
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
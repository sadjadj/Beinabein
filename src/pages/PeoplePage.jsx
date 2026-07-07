import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Plus, Search, UserCheck, Users, Sparkles, Tag, X, Filter } from 'lucide-react';
import { computePersonActivity, computeLastNonCafeService, syncPeopleFromActivities, toPersianNum } from '@/lib/stats';
import { formatJalaliShort } from '@/lib/jalali';

const allTags = ['شرکت‌کننده', 'نشر', 'مهمان افتخاری', 'آرتیست', 'برند', 'تسهیلگر'];

export default function PeoplePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [allData, setAllData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [], facilitators: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', full_name: '', how_met: '', met_platform: '' });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const nameInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [persons, wsVisits, cafePurchases, workshops, events, facilitators] = await Promise.all([
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkspaceVisit.list('-visit_date', 500),
        base44.entities.CafePurchase.list('-purchase_date', 500),
        base44.entities.Workshop.list('-date', 500),
        base44.entities.BigEvent.list('-date', 500),
        base44.entities.Facilitator.list('-created_date', 200),
      ]);
      setAllData({ workspaceVisits: wsVisits, cafePurchases, workshops, events, facilitators });
      const newCount = await syncPeopleFromActivities(wsVisits, cafePurchases, workshops, events, persons);
      if (newCount > 0) {
        setSyncMessage(`${toPersianNum(newCount)} فرد جدید از روی سوابق فعالیت اضافه شد`);
        const updatedPersons = await base44.entities.Person.list('-created_date', 500);
        setPeople(updatedPersons);
      } else {
        setPeople(persons);
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleNameChange = (value) => {
    setForm({ ...form, full_name: value });
    if (value.trim().length >= 2) {
      const matches = people.filter(p => p.full_name && p.full_name.toLowerCase().includes(value.trim().toLowerCase())).slice(0, 5);
      setNameSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (person) => {
    setForm({ phone: person.phone, full_name: person.full_name });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone) return;
    setSubmitting(true); setMessage(null);
    try {
      await base44.entities.Person.create({ phone: form.phone, full_name: form.full_name, how_met: form.how_met, met_platform: form.met_platform, tags: ['شرکت‌کننده'] });
      setMessage({ type: 'success', text: 'فرد ثبت شد' });
      setForm({ phone: '', full_name: '', how_met: '', met_platform: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const toggleTag = (tag) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addTagToPerson = async (personId, tag) => {
    const person = people.find(p => p.id === personId);
    if (!person) return;
    const tags = [...new Set([...(person.tags || []), tag])];
    await base44.entities.Person.update(personId, { tags });
    fetchData();
  };

  const filtered = people.filter(p => {
    if (activeTags.length > 0) {
      const personTags = p.tags || [];
      if (!activeTags.some(t => personTags.includes(t))) return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    if ((p.full_name || '').toLowerCase().includes(s)) return true;
    if ((p.phone || '').includes(s)) return true;
    const attendedWorkshops = allData.workshops.filter(w => (w.participant_phones || []).includes(p.phone));
    if (attendedWorkshops.some(w => (w.title || '').toLowerCase().includes(s))) return true;
    const facilitatorIds = attendedWorkshops.map(w => w.facilitator_id).filter(Boolean);
    if (facilitatorIds.some(fid => { const fac = allData.facilitators.find(f => f.id === fid); return fac && fac.full_name.toLowerCase().includes(s); })) return true;
    return false;
  });

  const uniquePeopleCount = people.length;
  const taggedCount = people.filter(p => p.tags && p.tags.length > 0).length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">افراد</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت ارتباط با افراد (CRM)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="کل افراد" value={toPersianNum(uniquePeopleCount)} icon={Users} color="terracotta" />
        <StatCard label="افراد تگ‌دار" value={toPersianNum(taggedCount)} icon={Tag} color="ochre" />
        <StatCard label="افراد فیلترشده" value={toPersianNum(filtered.length)} icon={Filter} color="teal" />
      </div>

      {syncMessage && (
        <div className="bg-[#FBF3EC] rounded-lg border border-[#E8D5C0] p-3 flex items-center gap-2 text-sm text-[#B9834B]">
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          {syncMessage}
        </div>
      )}

      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت فرد جدید</h3>
        <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input ref={nameInputRef} type="text" placeholder="نام و نام خانوادگی" value={form.full_name} onChange={e => handleNameChange(e.target.value)} onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-56" />
            {showSuggestions && nameSuggestions.length > 0 && (
              <div className="absolute z-10 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-56 max-h-48 overflow-y-auto">
                {nameSuggestions.map(p => (
                  <button key={p.id} type="button" onMouseDown={() => selectSuggestion(p)} className="w-full text-right px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 text-sm">
                    <span className="font-medium">{p.full_name}</span>
                    <span className="text-muted-foreground mr-2 text-xs">{p.phone}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="tel" placeholder="شماره تلفن" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          <input type="text" placeholder="نحوه آشنایی" value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <input type="text" placeholder="پلتفرم آشنایی" value={form.met_platform} onChange={e => setForm({ ...form, met_platform: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
          <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
            {submitting ? 'در حال ثبت...' : 'ثبت'}
          </button>
          {message && <span className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
        </form>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold">فهرست افراد ({toPersianNum(filtered.length)} نفر)</h3>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="جستجو: نام، شماره، تسهیلگر..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
            </div>
            <button onClick={() => setShowTagFilter(!showTagFilter)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
              <Filter className="w-4 h-4" /> فیلتر تگ
            </button>
          </div>
        </div>

        {showTagFilter && (
          <div className="p-3 border-b border-border bg-muted/30 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">فیلتر بر اساس تگ:</span>
            {allTags.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTags.includes(tag) ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground hover:bg-muted'}`}>
                {tag}
              </button>
            ))}
            {activeTags.length > 0 && <button onClick={() => setActiveTags([])} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><X className="w-3 h-3" /> پاک کردن</button>}
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{search || activeTags.length ? 'نتیجه‌ای یافت نشد' : 'هنوز فردی ثبت نشده است'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره</th>
                  <th className="text-right p-3 font-medium">تگ‌ها</th>
                  <th className="text-center p-3 font-medium">فضای کار</th>
                  <th className="text-center p-3 font-medium">کافه</th>
                  <th className="text-center p-3 font-medium">کارگاه</th>
                  <th className="text-center p-3 font-medium">رویداد</th>
                  <th className="text-center p-3 font-medium">آخرین خدمت</th>
                  <th className="text-center p-3 font-medium">کل</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const activity = computePersonActivity(p, allData.workspaceVisits, allData.cafePurchases, allData.workshops, allData.events);
                  const lastService = computeLastNonCafeService(p.phone, allData.workspaceVisits, allData.workshops, allData.events);
                  return (
                    <tr key={p.id} className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => navigate(`/people/${p.id}`)}>
                      <td className="p-3 font-medium text-gray-800">{p.full_name || '-'}</td>
                      <td className="p-3 text-muted-foreground">{p.phone}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {(p.tags || []).map(tag => (
                            <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#FBF3EC] text-[#B9834B]">{tag}</span>
                          ))}
                          {!p.tags || p.tags.length === 0 ? <span className="text-xs text-muted-foreground">-</span> : null}
                        </div>
                      </td>
                      <td className="p-3 text-center">{activity.workspace > 0 ? toPersianNum(activity.workspace) : '-'}</td>
                      <td className="p-3 text-center">{activity.cafe > 0 ? toPersianNum(activity.cafe) : '-'}</td>
                      <td className="p-3 text-center">{activity.workshop > 0 ? toPersianNum(activity.workshop) : '-'}</td>
                      <td className="p-3 text-center">{activity.event > 0 ? toPersianNum(activity.event) : '-'}</td>
                      <td className="p-3 text-center text-xs">
                        {lastService ? (
                          <span className="inline-flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-[#8CB9C0]" />
                            <span className="text-gray-700">{lastService.type}</span>
                            {lastService.date && <span className="text-muted-foreground">{formatJalaliShort(lastService.date)}</span>}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3 text-center font-semibold">{toPersianNum(activity.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
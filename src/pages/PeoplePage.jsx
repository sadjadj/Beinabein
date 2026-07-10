import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Plus, Search, UserCheck, Users, Sparkles, Tag, X, Filter, Pencil, Check } from 'lucide-react';
import { computePersonActivity, computeLastNonCafeService, syncPeopleFromActivities, toPersianNum } from '@/lib/stats';
import { howMetLabels, genderLabels } from '@/lib/labels';
import { formatJalaliShort, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

const allTags = ['شرکت‌کننده', 'نشر', 'مهمان افتخاری', 'آرتیست', 'برند', 'تسهیلگر'];

export default function PeoplePage() {
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [allData, setAllData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [] });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [form, setForm] = useState({ phone: '', full_name: '', how_met: 'other', age: '', gender: '', first_usage: '' });
  const [nameSuggestions, setNameSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [showTagFilter, setShowTagFilter] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const nameInputRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [persons, wsOrders, itemPurchases, workshopPurchases] = await Promise.all([
        base44.entities.Person.list('-created_date', 500),
        base44.entities.WorkspaceOrder.list('-purchase_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500),
      ]);
      setAllData({ workspaceOrders: wsOrders, itemPurchases, workshopPurchases });
      const newCount = await syncPeopleFromActivities(wsOrders, itemPurchases, workshopPurchases, persons);
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
    setForm({ ...form, phone: person.phone, full_name: person.full_name });
    setShowSuggestions(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone) return;
    setSubmitting(true); setMessage(null);
    try {
      await base44.entities.Person.create({
        phone: form.phone, full_name: form.full_name, how_met: form.how_met,
        age: form.age ? Number(form.age) : null, gender: form.gender || null,
        first_usage: form.first_usage || null, tags: ['شرکت‌کننده']
      });
      setMessage({ type: 'success', text: 'فرد ثبت شد' });
      setForm({ phone: '', full_name: '', how_met: 'other', age: '', gender: '', first_usage: '' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'خطا در ثبت' });
    } finally { setSubmitting(false); }
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setEditForm({
      full_name: person.full_name || '', phone: person.phone || '',
      how_met: person.how_met || 'other', age: person.age || '',
      gender: person.gender || '', first_usage: person.first_usage || '',
      notes: person.notes || '', tags: person.tags || []
    });
  };

  const saveEdit = async () => {
    await base44.entities.Person.update(editingId, {
      ...editForm, age: editForm.age ? Number(editForm.age) : null,
      first_usage: editForm.first_usage || null
    });
    setEditingId(null);
    fetchData();
  };

  const toggleTag = (tag) => {
    setActiveTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const toggleEditTag = (tag) => {
    setEditForm(prev => ({
      ...prev, tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag]
    }));
  };

  const filtered = people.filter(p => {
    if (activeTags.length > 0) {
      const personTags = p.tags || [];
      if (!activeTags.some(t => personTags.includes(t))) return false;
    }
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.full_name || '').toLowerCase().includes(s) || (p.phone || '').includes(s);
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">افراد</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت ارتباط با افراد (CRM)</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <StatCard label="کل افراد" value={toPersianNum(people.length)} icon={Users} color="terracotta" />
        <StatCard label="افراد تگ‌دار" value={toPersianNum(people.filter(p => p.tags && p.tags.length > 0).length)} icon={Tag} color="ochre" />
        <StatCard label="افراد فیلترشده" value={toPersianNum(filtered.length)} icon={Filter} color="teal" />
      </div>

      {syncMessage && (
        <div className="bg-[#FBF3EC] rounded-lg border border-[#E8D5C0] p-3 flex items-center gap-2 text-sm text-[#B9834B]">
          <Sparkles className="w-4 h-4 flex-shrink-0" /> {syncMessage}
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
          <select value={form.how_met} onChange={e => setForm({ ...form, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="number" placeholder="سن" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-20" />
          <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">جنسیت...</option>
            {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
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
              <input type="text" placeholder="جستجو: نام، شماره..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
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
                  <th className="text-right p-3 font-medium">نحوه آشنایی</th>
                  <th className="text-right p-3 font-medium">تگ‌ها</th>
                  <th className="text-center p-3 font-medium">فضای کار</th>
                  <th className="text-center p-3 font-medium">کافه</th>
                  <th className="text-center p-3 font-medium">کارگاه</th>
                  <th className="text-center p-3 font-medium">آخرین خدمت</th>
                  <th className="text-center p-3 font-medium">کل</th>
                  <th className="text-center p-3 font-medium">ویرایش</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const activity = computePersonActivity(p, allData.workspaceOrders, allData.itemPurchases, allData.workshopPurchases);
                  const lastService = computeLastNonCafeService(p.phone, allData.workspaceOrders, allData.workshopPurchases);
                  const isEditing = editingId === p.id;
                  return (
                    <React.Fragment key={p.id}>
                      <tr className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => !isEditing && navigate(`/people/${p.id}`)}>
                        <td className="p-3 font-medium text-gray-800">{p.full_name || '-'}</td>
                        <td className="p-3 text-muted-foreground">{p.phone}</td>
                        <td className="p-3 text-xs">{howMetLabels[p.how_met] || p.how_met || '-'}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {(p.tags || []).map(tag => <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#FBF3EC] text-[#B9834B]">{tag}</span>)}
                            {!p.tags || p.tags.length === 0 ? <span className="text-xs text-muted-foreground">-</span> : null}
                          </div>
                        </td>
                        <td className="p-3 text-center">{activity.workspace > 0 ? toPersianNum(activity.workspace) : '-'}</td>
                        <td className="p-3 text-center">{activity.cafe > 0 ? toPersianNum(activity.cafe) : '-'}</td>
                        <td className="p-3 text-center">{activity.workshop > 0 ? toPersianNum(activity.workshop) : '-'}</td>
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
                        <td className="p-3 text-center">
                          <button onClick={(e) => { e.stopPropagation(); startEdit(p); }} className="text-muted-foreground hover:text-[#B74B40]">
                            <Pencil className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                      {isEditing && (
                        <tr className="border-t border-border bg-muted/20">
                          <td colSpan={10} className="p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              <input type="text" placeholder="نام" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                              <input type="tel" placeholder="شماره" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                              <select value={editForm.how_met} onChange={e => setEditForm({ ...editForm, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                                {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <input type="number" placeholder="سن" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                              <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                                <option value="">جنسیت...</option>
                                {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                              <JalaliDateInput value={editForm.first_usage} onChange={v => setEditForm({ ...editForm, first_usage: v })} />
                              <textarea placeholder="یادداشت" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
                              <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center gap-2">
                                <span className="text-xs text-muted-foreground">تگ‌ها:</span>
                                {allTags.map(tag => (
                                  <button key={tag} type="button" onClick={() => toggleEditTag(tag)} className={`px-2 py-1 rounded-full text-xs font-medium ${editForm.tags.includes(tag) ? 'bg-[#B74B40] text-white' : 'bg-white border border-border text-muted-foreground'}`}>
                                    {tag}
                                  </button>
                                ))}
                              </div>
                              <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
                                <button onClick={saveEdit} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
                                  <Check className="w-4 h-4" /> ذخیره
                                </button>
                                <button onClick={() => setEditingId(null)} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
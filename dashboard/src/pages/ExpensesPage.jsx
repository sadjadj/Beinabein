import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Wallet, Plus, Trash2, Wrench, ShoppingCart, Coffee, UtensilsCrossed, User, Search, PartyPopper, Pencil } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { formatJalaliShort, todayGregorian, toJalaliStr } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';
import PriceInput from '@/components/PriceInput';
import ExportButton from '@/components/ExportButton';
import { TableSkeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';
import ExpenseCategoryTab from '@/components/expenses/ExpenseCategoryTab';

// Categories themselves live in the ExpenseCategory entity; these only style
// the built-in ones (seeded with these ids), new ones fall back to defaults.
const categoryIcons = {
  repairs: Wrench,
  daily: Wallet,
  facilitator_payment: User,
  cafe_purchase: Coffee,
  kitchen_purchase: UtensilsCrossed,
  leisure: PartyPopper,
};

const categoryColors = {
  repairs: 'ochre',
  daily: 'dark',
  facilitator_payment: 'terracotta',
  cafe_purchase: 'pink',
  kitchen_purchase: 'teal',
  leisure: 'ochre',
};

function ExpenseForm({ form, setForm, categories, facilitators, onSubmit, onCancel, submitting, submitLabel = 'ثبت', onEditCategories }) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">عنوان هزینه *</label>
        <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان) *</label>
        <PriceInput value={form.amount} onChange={v => setForm({ ...form, amount: v })} required />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-muted-foreground">دسته‌بندی</label>
          {onEditCategories && (
            <button type="button" onClick={onEditCategories} className="flex items-center gap-1 text-xs text-[#B74B40] hover:underline">
              <Pencil className="w-3 h-3" /> ویرایش
            </button>
          )}
        </div>
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">تاریخ *</label>
        <JalaliDateInput value={form.date} onChange={v => setForm({ ...form, date: v })} />
      </div>
      {form.category === 'facilitator_payment' && (
        <div>
          <label className="text-xs text-muted-foreground block mb-1">تسهیلگر</label>
          <select value={form.facilitator_id} onChange={e => setForm({ ...form, facilitator_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
            <option value="">انتخاب...</option>
            {facilitators.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
          </select>
        </div>
      )}
      <div className="sm:col-span-2 lg:col-span-3">
        <label className="text-xs text-muted-foreground block mb-1">توضیحات</label>
        <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>
      <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
          {submitting ? 'در حال ذخیره...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
      </div>
    </form>
  );
}

export default function ExpensesPage({ embedded = false }) {
  const [expenses, setExpenses] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showCategories, setShowCategories] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [form, setForm] = useState({ title: '', amount: '', category: 'daily', date: todayGregorian(), description: '', facilitator_id: '' });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [exps, facs, cats] = await Promise.all([
        base44.entities.Expense.list('-date'),
        base44.entities.Facilitator.list('-created_date'),
        base44.entities.ExpenseCategory.list('created_date')
      ]);
      setExpenses(exps);
      setFacilitators(facs);
      setCategories(cats);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.amount || !form.date) return;
    setSubmitting(true);
    try {
      const fac = facilitators.find(f => f.id === form.facilitator_id);
      await base44.entities.Expense.create({
        ...form,
        category: categories.some(c => c.id === form.category) ? form.category : categories[0]?.id,
        amount: Number(form.amount) || 0,
        facilitator_name: fac?.full_name || ''
      });
      setForm({ title: '', amount: '', category: 'daily', date: todayGregorian(), description: '', facilitator_id: '' });
      setShowForm(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const startEdit = (e) => {
    setEditId(e.id);
    setEditForm({ title: e.title || '', amount: e.amount ?? '', category: e.category || 'daily', date: e.date || '', description: e.description || '', facilitator_id: e.facilitator_id || '' });
  };

  const saveEdit = async (ev) => {
    ev.preventDefault();
    if (!editForm.title || !editForm.amount || !editForm.date) return;
    setSavingEdit(true);
    try {
      const fac = facilitators.find(f => f.id === editForm.facilitator_id);
      const data = { ...editForm, amount: Number(editForm.amount) || 0, facilitator_name: fac?.full_name || '' };
      await base44.entities.Expense.update(editId, data);
      setExpenses(prev => prev.map(x => x.id === editId ? { ...x, ...data } : x));
      setEditId(null);
    } finally { setSavingEdit(false); }
  };

  const handleCategorySubmit = async (name) => {
    const created = await base44.entities.ExpenseCategory.create({ name });
    setCategories(prev => [...prev, created]);
  };

  const renameCategory = async (id, name) => {
    await base44.entities.ExpenseCategory.update(id, { name });
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name } : c));
  };

  const deleteCategory = async (id) => {
    try {
      await base44.entities.ExpenseCategory.delete(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.status === 409 ? 'این دسته‌بندی در هزینه‌ها استفاده شده و قابل حذف نیست' : 'حذف انجام نشد');
    }
  };

  const handleDelete = async (id) => {
    await base44.entities.Expense.delete(id);
    fetchData();
  };

  const categoryLabels = Object.fromEntries(categories.map(c => [c.id, c.name]));

  const filtered = expenses.filter(e => {
    if (filterCategory && e.category !== filterCategory) return false;
    if (dateFrom && (!e.date || e.date < dateFrom)) return false;
    if (dateTo && (!e.date || e.date > dateTo)) return false;
    if (!search) return true;
    const s = search.trim().toLowerCase();
    return (e.title || '').toLowerCase().includes(s) ||
      (e.description || '').toLowerCase().includes(s);
  });
  const totalAmount = filtered.reduce((s, e) => s + (e.amount || 0), 0);

  const exportColumns = [
    { key: 'title', label: 'عنوان' },
    { key: 'category', label: 'دسته‌بندی' },
    { key: 'date', label: 'تاریخ' },
    { key: 'amount', label: 'مبلغ' },
    { key: 'description', label: 'توضیحات' },
  ];
  const exportRows = filtered.map(e => ({
    title: e.title || '-',
    category: categoryLabels[e.category] || e.category || '',
    date: e.date ? toJalaliStr(e.date) : '',
    amount: e.amount || 0,
    description: e.description || '',
  }));

  const categoryTotals = {};
  const categoryTotalsCount = {};
  expenses.forEach(e => {
    categoryTotals[e.category] = (categoryTotals[e.category] || 0) + (e.amount || 0);
    categoryTotalsCount[e.category] = (categoryTotalsCount[e.category] || 0) + 1;
  });

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!embedded && (
        <div>
          <h1 className="text-2xl font-bold">هزینه کرد</h1>
          <p className="text-sm text-muted-foreground mt-1">ثبت و مدیریت هزینه‌های بینابین</p>
        </div>
        )}
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          <Plus className="w-4 h-4" /> ثبت هزینه
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="کل هزینه‌ها" value={formatCurrency(totalAmount)} icon={Wallet} color="terracotta" sublabel={`${toPersianNum(filtered.length)} مورد`} info="مجموع مبالغ هزینه‌ها در بازه و دسته‌بندی فیلترشده" />
          {categories.slice(0, 3).map(({ id, name }) => (
            <StatCard key={id} label={name} value={formatCurrency(categoryTotals[id] || 0)} icon={categoryIcons[id] || Wallet} color={categoryColors[id] || 'dark'} info={`مجموع هزینه‌های دسته «${name}» (بدون فیلتر بازه)`} />
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl border border-border p-5">
          <ExpenseForm form={form} setForm={setForm} categories={categories} facilitators={facilitators} onEditCategories={() => setShowCategories(!showCategories)} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} submitting={submitting} />
        </div>
      )}

      {showForm && showCategories && (
        <ExpenseCategoryTab categories={categories} usage={categoryTotalsCount} onCategorySubmit={handleCategorySubmit} onRenameCategory={renameCategory} onDeleteCategory={deleteCategory} />
      )}

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">فهرست هزینه‌ها ({toPersianNum(filtered.length)})</h3>
            <ExportButton filename="هزینه‌ها" columns={exportColumns} rows={exportRows} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="جستجو عنوان / توضیحات..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">از</span>
              <JalaliDateInput value={dateFrom} onChange={setDateFrom} showToday={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">تا</span>
              <JalaliDateInput value={dateTo} onChange={setDateTo} showToday={false} />
            </div>
          </div>
          {expenses.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setFilterCategory('')} className={`px-2.5 py-1 rounded-full text-xs font-medium ${!filterCategory ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>همه</button>
              {categories.map(({ id, name }) => (
                <button key={id} onClick={() => setFilterCategory(filterCategory === id ? '' : id)} className={`px-2.5 py-1 rounded-full text-xs font-medium ${filterCategory === id ? 'bg-[#B74B40] text-white' : 'bg-[#FDF2F1] text-[#B74B40] hover:bg-[#FDF2F1]/70'}`}>{name}</button>
              ))}
            </div>
          )}
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={4} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز هزینه‌ای ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">عنوان</th>
                  <th className="text-right p-3 font-medium">دسته‌بندی</th>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-center p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => {
                  const Icon = categoryIcons[e.category] || Wallet;
                  return (
                    <React.Fragment key={e.id}>
                    <tr className="border-t border-border hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
                            <Icon className="w-3.5 h-3.5 text-[#B74B40]" />
                          </div>
                          <div>
                            <p className="font-medium">{e.title}</p>
                            {e.description && <p className="text-xs text-muted-foreground mt-0.5">{e.description}</p>}
                            {e.facilitator_name && <p className="text-xs text-[#B74B40] mt-0.5">{e.facilitator_name}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{categoryLabels[e.category] || e.category}</td>
                      <td className="p-3 text-xs text-muted-foreground">{formatJalaliShort(e.date)}</td>
                      <td className="p-3 text-center font-medium">{formatCurrency(e.amount)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => editId === e.id ? setEditId(null) : startEdit(e)} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                    {editId === e.id && (
                      <tr className="border-t border-border">
                        <td colSpan={5} className="p-3 bg-muted/20">
                          <ExpenseForm form={editForm} setForm={setEditForm} categories={categories} facilitators={facilitators} onSubmit={saveEdit} onCancel={() => setEditId(null)} submitting={savingEdit} submitLabel="ذخیره" />
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
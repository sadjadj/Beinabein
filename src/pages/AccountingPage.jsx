import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Wallet, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Bell, Search, Plus } from 'lucide-react';
import { computeWorkshopRevenue, toPersianNum, formatCurrency, findOrCreatePerson, currentJalaliMonthKey, gregorianToJalaliMonthKey } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { buildStoreInvoiceGroups } from '@/lib/storeInvoices';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import PersonSearch from '@/components/PersonSearch';
import PriceInput from '@/components/PriceInput';
import PersianNumberInput from '@/components/PersianNumberInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';
import ExportButton from '@/components/ExportButton';

export default function AccountingPage({ embedded = false }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hideFinancials = user?.role === 'executive';
  const [workspaceOrders, setWorkspaceOrders] = useState([]);
  const [itemPurchases, setItemPurchases] = useState([]);
  const [workshopPurchases, setWorkshopPurchases] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [customIncomes, setCustomIncomes] = useState([]);
  const [groupPurchases, setGroupPurchases] = useState([]);
  const [eventPurchases, setEventPurchases] = useState([]);
  const [storePurchases, setStorePurchases] = useState([]);
  const [greenhousePurchases, setGreenhousePurchases] = useState([]);
  const [salesEventPurchases, setSalesEventPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({ title: '', person_name: '', person_phone: '', amount: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: 'other', is_paid: false, description: '' });
  const [customError, setCustomError] = useState('');
  const [customSubmitting, setCustomSubmitting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ws, items, wp, wsList, ci, gp, ep, sp, gh, se] = await Promise.all([
        base44.entities.WorkspaceOrder.list('-purchase_date', 1000),
        base44.entities.ItemPurchase.list('-purchase_date', 1000),
        base44.entities.WorkshopPurchase.list('-purchase_date', 1000),
        base44.entities.Workshop.list('-start_date', 500),
        base44.entities.CustomIncome.list('-purchase_date', 1000),
        base44.entities.GroupPurchase.list('-purchase_date', 1000),
        base44.entities.EventPurchase.list('-purchase_date', 1000),
        base44.entities.StorePurchase.list('-purchase_date', 1000),
        base44.entities.GreenhousePurchase.list('-purchase_date', 1000),
        base44.entities.SalesEventPurchase.list('-purchase_date', 1000)
      ]);
      setWorkspaceOrders(ws);
      setItemPurchases(items);
      setWorkshopPurchases(wp);
      setWorkshops(wsList);
      setCustomIncomes(ci);
      setGroupPurchases(gp);
      setEventPurchases(ep);
      setStorePurchases(sp);
      setGreenhousePurchases(gh);
      setSalesEventPurchases(se);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const entityByType = { workspace: 'WorkspaceOrder', cafe: 'ItemPurchase', workshop: 'WorkshopPurchase', custom: 'CustomIncome', group: 'GroupPurchase', event: 'EventPurchase', store: 'StorePurchase', greenhouse: 'GreenhousePurchase', salesEvent: 'SalesEventPurchase' };

  const togglePaid = async (t) => {
    const entity = entityByType[t.type];
    const newPaid = !t.is_paid;
    if (t.groupItemIds) {
      await base44.entities[entity].updateMany({ id: { $in: t.groupItemIds } }, { $set: { is_paid: newPaid } });
    } else {
      await base44.entities[entity].update(t.id, { is_paid: newPaid });
    }
    fetchData();
  };

  const handleCustomSubmit = async () => {
    if (!customForm.person_name) { setCustomError('نام مشتری الزامی است'); return; }
    if (!customForm.person_phone) { setCustomError('شماره تماس الزامی است'); return; }
    if (!customForm.purchase_date) { setCustomError('تاریخ پرداخت الزامی است'); return; }
    setCustomError('');
    setCustomSubmitting(true);
    try {
      await findOrCreatePerson(customForm.person_phone, customForm.person_name);
      await base44.entities.CustomIncome.create({
        title: customForm.title || 'درآمد دلخواه',
        person_name: customForm.person_name,
        person_phone: customForm.person_phone,
        amount: Number(customForm.amount) || 0,
        quantity: Number(customForm.quantity) || 1,
        purchase_date: customForm.purchase_date,
        payment_method: customForm.payment_method,
        how_met: customForm.how_met || 'other',
        is_paid: customForm.is_paid,
        description: customForm.description || ''
      });
      setCustomIncomes(await base44.entities.CustomIncome.list('-purchase_date', 1000));
      setCustomForm({ title: '', person_name: '', person_phone: '', amount: '', quantity: 1, purchase_date: todayGregorian(), payment_method: 'cash', how_met: 'other', is_paid: false, description: '' });
      setShowCustomForm(false);
    } finally { setCustomSubmitting(false); }
  };

  const toggleFacilitatorPaid = async (w) => {
    await base44.entities.Workshop.update(w.id, { facilitator_paid: !w.facilitator_paid });
    setWorkshops(await base44.entities.Workshop.list('-start_date', 500));
  };

  // Monthly P&L
  const currentMonth = currentJalaliMonthKey();
  const monthWs = workspaceOrders.filter(o => gregorianToJalaliMonthKey(o.purchase_date) === currentMonth);
  const monthItems = itemPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const monthWp = workshopPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);

  const wsRevenue = monthWs.reduce((s, o) => s + (o.price || 0) * (o.quantity || 1), 0);
  const cafeRevenue = monthItems.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const workshopRevenue = monthWp.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const monthCi = customIncomes.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const ciRevenue = monthCi.reduce((s, p) => s + (p.amount || 0) * (p.quantity || 1), 0);
  const monthGp = groupPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const groupRevenue = monthGp.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const monthEp = eventPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const eventRevenue = monthEp.reduce((s, p) => s + (p.price || 0) * (p.quantity || 1) + (p.donation || 0), 0);
  const monthSp = storePurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const storeRevenue = monthSp.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const monthGh = greenhousePurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const greenhouseRevenue = monthGh.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const monthSe = salesEventPurchases.filter(p => gregorianToJalaliMonthKey(p.purchase_date) === currentMonth);
  const salesEventRevenue = monthSe.reduce((s, p) => s + (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), 0);
  const totalIncome = wsRevenue + cafeRevenue + workshopRevenue + ciRevenue + groupRevenue + eventRevenue + storeRevenue + greenhouseRevenue + salesEventRevenue;

  // Facilitator expenses (from all workshops this month)
  const monthWorkshops = workshops.filter(w => gregorianToJalaliMonthKey(w.start_date) === currentMonth);
  const facilitatorExpenses = monthWorkshops.reduce((s, w) => {
    const rev = computeWorkshopRevenue(w, workshopPurchases);
    return s + rev.facilitatorRevenue;
  }, 0);

  const profit = totalIncome - facilitatorExpenses;

  // Unpaid items
  const invoiceGroups = buildStoreInvoiceGroups(storePurchases, greenhousePurchases, salesEventPurchases);
  const unpaidWs = workspaceOrders.filter(o => !o.is_paid && o.payment_method !== 'free');
  const unpaidItems = itemPurchases.filter(p => !p.is_paid && p.payment_method !== 'free');
  const unpaidWp = workshopPurchases.filter(p => !p.is_paid && p.payment_method !== 'free');
  const unpaidCi = customIncomes.filter(p => !p.is_paid && p.payment_method !== 'free');
  const unpaidGp = groupPurchases.filter(p => !p.is_paid);
  const unpaidEp = eventPurchases.filter(p => !p.is_paid);
  const unpaidGroups = invoiceGroups.filter(g => !g.is_paid);
  const totalUnpaid = unpaidWs.length + unpaidItems.length + unpaidWp.length + unpaidCi.length + unpaidGp.length + unpaidEp.length + unpaidGroups.length;
  const totalUnpaidAmount = [...unpaidWs, ...unpaidItems, ...unpaidWp, ...unpaidCi, ...unpaidGp, ...unpaidEp].reduce((s, r) => {
    if (r.amount) return s + r.amount * (r.quantity || 1);
    if (r.price) return s + r.price * (r.quantity || 1) + (r.donation || 0);
    if (r.item_price) return s + r.item_price * (r.quantity || 1) * (1 - (r.discount || 0) / 100);
    return s;
  }, 0) + unpaidGroups.reduce((s, g) => s + g.totalAmount, 0);

  // Unpaid facilitator payments
  const unpaidFacilitators = workshops.filter(w => !w.facilitator_paid).map(w => {
    const rev = computeWorkshopRevenue(w, workshopPurchases);
    return { ...w, facilitatorRevenue: rev.facilitatorRevenue, participantCount: rev.participantCount };
  }).filter(w => w.facilitatorRevenue > 0);

  const allTransactions = [
    ...workspaceOrders.map(o => ({ ...o, type: 'workspace', amount: (o.price || 0) * (o.quantity || 1), label: o.subscription_name || '-' })),
    ...itemPurchases.map(p => ({ ...p, type: 'cafe', amount: (p.item_price || 0) * (p.quantity || 1) * (1 - (p.discount || 0) / 100), label: p.item_name })),
    ...workshopPurchases.map(p => ({ ...p, type: 'workshop', amount: (p.price || 0) * (p.quantity || 1) + (p.donation || 0), label: p.workshop_title })),
    ...customIncomes.map(p => ({ ...p, type: 'custom', amount: (p.amount || 0) * (p.quantity || 1), label: p.title || '-' })),
    ...groupPurchases.map(p => ({ ...p, type: 'group', amount: (p.price || 0) * (p.quantity || 1) + (p.donation || 0), label: p.group_title })),
    ...eventPurchases.map(p => ({ ...p, type: 'event', amount: (p.price || 0) * (p.quantity || 1) + (p.donation || 0), label: p.event_title })),
    ...invoiceGroups.map(g => ({
      type: g.source, id: g.items[0].id, groupItemIds: g.items.map(i => i.id),
      amount: g.totalAmount,
      label: g.source === 'salesEvent' && g.event_title ? g.event_title : (g.items.length > 1 ? `${g.items[0].item_name} (+${g.items.length - 1} آیتم)` : g.items[0].item_name),
      person_name: g.person_name, person_phone: g.person_phone,
      purchase_date: g.purchase_date, payment_method: g.payment_method, is_paid: g.is_paid,
    })),
  ].sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));

  const filtered = allTransactions.filter(t => {
    if (filter === 'paid') return t.is_paid;
    if (filter === 'unpaid') return !t.is_paid && t.payment_method !== 'free';
    return true;
  }).filter(t => {
    if (typeFilter && t.type !== typeFilter) return false;
    if (methodFilter && t.payment_method !== methodFilter) return false;
    if (dateFrom && (!t.purchase_date || t.purchase_date < dateFrom)) return false;
    if (dateTo && (!t.purchase_date || t.purchase_date > dateTo)) return false;
    return true;
  }).filter(t => {
    if (!search) return true;
    const s = search.trim().toLowerCase();
    return (t.person_name || '').toLowerCase().includes(s) ||
      (t.label || '').toLowerCase().includes(s) ||
      (t.person_phone || '').toLowerCase().includes(s);
  });

  const typeLabels = { workspace: 'فضای کار', cafe: 'کافه', workshop: 'کارگاه', group: 'گروه', event: 'رخداد', store: 'استور', salesEvent: 'ایونت', greenhouse: 'گلخانه', custom: 'درآمد دلخواه' };

  const fromPath = embedded ? '/finance' : '/accounting';

  const exportColumns = [
    { key: 'date', label: 'تاریخ' },
    { key: 'type', label: 'نوع' },
    { key: 'label', label: 'شرح' },
    { key: 'name', label: 'نام' },
    { key: 'phone', label: 'شماره' },
    { key: 'method', label: 'مدل پرداخت' },
    { key: 'amount', label: 'مبلغ' },
    { key: 'status', label: 'وضعیت' },
  ];
  const exportRows = filtered.slice(0, 200).map(t => ({
    date: t.purchase_date ? toJalaliStr(t.purchase_date) : '',
    type: typeLabels[t.type] || t.type,
    label: t.label || '-',
    name: t.person_name || '-',
    phone: t.person_phone || '',
    method: paymentMethodLabels[t.payment_method] || t.payment_method || '',
    amount: t.amount || 0,
    status: t.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده',
  }));

  if (loading) return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto pt-14 md:pt-6">
      {!embedded && (
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
      </div>
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {!embedded && (
      <div>
        <h1 className="text-2xl font-bold">حسابداری</h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت درآمد، هزینه‌ها و پرداخت‌ها</p>
      </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {!hideFinancials && <StatCard label="درآمد این ماه" value={formatCurrency(totalIncome)} icon={TrendingUp} color="terracotta" info="مجموع درآمد حاصل از فضای کار، کافه، کارگاه‌ها، گروه‌ها، رخدادها، استور، ایونت‌ها، گلخانه و درآمدهای دلخواه در ماه جاری شمسی" />}
        {!hideFinancials && <StatCard label="پرداخت تسهیلگران" value={formatCurrency(facilitatorExpenses)} icon={TrendingDown} color="pink" info="مجموع مبالغ پرداختی به تسهیلگران کارگاه‌های این ماه (بر اساس درصد تسهیلگر)" />}
        {!hideFinancials && <StatCard label="سود/زیان این ماه" value={formatCurrency(profit)} sublabel={profit >= 0 ? 'سود' : 'زیان'} icon={Wallet} color={profit >= 0 ? 'teal' : 'pink'} info="تفاضل درآمد این ماه و پرداختی تسهیلگران (سود مثبت، زیان منفی)" />}
        <StatCard label="پرداخت‌نشده" value={toPersianNum(totalUnpaid)} sublabel={hideFinancials ? undefined : formatCurrency(totalUnpaidAmount)} icon={AlertCircle} color="ochre" info="تعداد و مبلغ فاکتورهای پرداخت‌نشده در همه بخش‌ها" />
      </div>

      {unpaidFacilitators.length > 0 && (
        <div className="bg-[#FBF3EC] rounded-xl border border-[#E8D5C0] p-5">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-[#B9834B]">
            <Bell className="w-4 h-4" /> یادآوری پرداخت تسهیلگران ({toPersianNum(unpaidFacilitators.length)} مورد)
          </h3>
          <div className="space-y-2">
            {unpaidFacilitators.map(w => {
              const settlementDate = w.end_date ? (() => {
                const d = new Date(w.end_date);
                d.setMonth(d.getMonth() + 1, 1);
                return d.toISOString().split('T')[0];
              })() : null;
              const isDue = settlementDate && settlementDate <= new Date().toISOString().split('T')[0];
              return (
                <div key={w.id} className="bg-white rounded-lg p-3 flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium">{w.title}</p>
                    <p className="text-xs text-muted-foreground">{toPersianNum(w.participantCount)} ثبت‌نام • درصد: {toPersianNum(w.facilitator_percentage || 0)}٪</p>
                    {settlementDate ? (
                      <p className={`text-xs mt-1 flex items-center gap-1 ${isDue ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                        <Bell className="w-3 h-3" />
                        {isDue ? 'زمان تسویه فرا رسیده: ' : 'زمان تسویه: '}
                        {toJalaliStr(settlementDate)}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-1">در انتظار پایان کارگاه</p>
                    )}
                  </div>
                  <div className="text-left">
                    {!hideFinancials && <p className="font-semibold text-[#B9834B]">{formatCurrency(w.facilitatorRevenue)}</p>}
                    <button onClick={() => toggleFacilitatorPaid(w)} className="text-xs text-[#B74B40] hover:underline mt-1">ثبت پرداخت</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Custom income form */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold">درآمدهای جانبی</h3>
          <button onClick={() => setShowCustomForm(!showCustomForm)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
            <Plus className="w-4 h-4" /> ثبت درآمد دلخواه
          </button>
        </div>
        {showCustomForm && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">شرح درآمد</label>
              <input type="text" placeholder="مثلاً فروش محصول" value={customForm.title} onChange={e => setCustomForm({ ...customForm, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="text-xs text-muted-foreground block mb-1">نام مشتری *</label>
              <PersonSearch personName={customForm.person_name} personPhone={customForm.person_phone} onNameChange={v => setCustomForm({ ...customForm, person_name: v })} onPhoneChange={v => setCustomForm({ ...customForm, person_phone: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">مبلغ (تومان)</label>
              <PriceInput value={customForm.amount} onChange={v => setCustomForm({ ...customForm, amount: v })} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
              <PersianNumberInput value={customForm.quantity} onChange={v => setCustomForm({ ...customForm, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">تاریخ پرداخت *</label>
              <JalaliDateInput value={customForm.purchase_date} onChange={v => setCustomForm({ ...customForm, purchase_date: v })} showToday={false} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
              <select value={customForm.payment_method} onChange={e => setCustomForm({ ...customForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">نحوه آشنایی</label>
              <select value={customForm.how_met} onChange={e => setCustomForm({ ...customForm, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">انتخاب...</option>
                {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm self-end pb-2">
              <input type="checkbox" checked={customForm.is_paid} onChange={e => setCustomForm({ ...customForm, is_paid: e.target.checked })} className="w-4 h-4" /> پرداخت شده
            </label>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-xs text-muted-foreground block mb-1">توضیحات</label>
              <textarea value={customForm.description} onChange={e => setCustomForm({ ...customForm, description: e.target.value })} rows={2} placeholder="توضیحات (اختیاری)..." className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            {customError && <div className="sm:col-span-2 lg:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{customError}</div>}
            <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
              <button onClick={handleCustomSubmit} disabled={customSubmitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                {customSubmitting ? 'در حال ثبت...' : 'ثبت درآمد'}
              </button>
              <button onClick={() => { setShowCustomForm(false); setCustomError(''); }} className="px-4 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">فاکتورها</h3>
            <ExportButton filename="فاکتورها-درآمدها" columns={exportColumns} rows={exportRows} />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="جستجو شرح / نام / شماره..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-56" />
            </div>
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="">همه انواع</option>
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="">همه مدل‌های پرداخت</option>
              {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
              <option value="all">همه وضعیت‌ها</option>
              <option value="paid">پرداخت‌شده</option>
              <option value="unpaid">پرداخت‌نشده</option>
            </select>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">از</span>
              <JalaliDateInput value={dateFrom} onChange={setDateFrom} showToday={false} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">تا</span>
              <JalaliDateInput value={dateTo} onChange={setDateTo} showToday={false} />
            </div>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">در حال بارگذاری...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">تراکنشی یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">تاریخ</th>
                  <th className="text-right p-3 font-medium">نوع</th>
                  <th className="text-right p-3 font-medium">شرح</th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">پرداخت</th>
                  <th className="text-right p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map(t => (
                  <tr key={`${t.type}-${t.id}`} className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/accounting/${t.type}/${t.id}`, { state: { from: fromPath } })}>
                    <td className="p-3 whitespace-nowrap">{toJalaliStr(t.purchase_date)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs whitespace-nowrap ${t.type === 'workspace' ? 'bg-[#FDF2F1] text-[#B74B40]' : t.type === 'cafe' ? 'bg-[#FBF3EC] text-[#B9834B]' : 'bg-[#F0F7F8] text-[#8CB9C0]'}`}>
                        {typeLabels[t.type]}
                      </span>
                    </td>
                    <td className="p-3">{t.label || '-'}</td>
                    <td className="p-3">{t.person_name || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{paymentMethodLabels[t.payment_method] || t.payment_method}</td>
                    <td className="p-3 font-medium whitespace-nowrap text-left" dir="ltr">{formatCurrency(t.amount)}</td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => togglePaid(t)} className="inline-flex items-center gap-1 text-xs whitespace-nowrap">
                        {t.is_paid ? (
                          <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle className="w-3.5 h-3.5" /> پرداخت شده</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#B9834B]"><AlertCircle className="w-3.5 h-3.5" /> پرداخت‌نشده</span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
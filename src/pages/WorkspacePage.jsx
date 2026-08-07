import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import StatCard from '@/components/StatCard';
import { Briefcase, Users, Repeat, Plus, ChevronLeft, Search, RotateCcw } from 'lucide-react';
import ExportButton from '@/components/ExportButton';
import { computeWorkspaceStats, findOrCreatePerson, toPersianNum, formatCurrency, getDateRange } from '@/lib/stats';
import { paymentMethodLabels, howMetLabels } from '@/lib/labels';
import { toJalaliStr, todayGregorian, getJalaliParts } from '@/lib/jalali';
import FloatingDateInput from '@/components/FloatingDateInput';
import JalaliDateInput from '@/components/JalaliDateInput';
import PersonSearch from '@/components/PersonSearch';
import PersianNumberInput from '@/components/PersianNumberInput';
import { Skeleton, StatCardSkeleton } from '@/components/SkeletonPatterns';
import {
  getMainHallCapacity, buildCapacityMap, computeUsageDates,
  checkCapacityForDates, getOrderUsageDates, formatInsufficientDates
} from '@/lib/workspaceCapacity';

const jMonths = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];

const tabs = [
  { key: 'order', label: 'سفارش جدید' },
  { key: 'history', label: 'تاریخچه سفارشات' },
  { key: 'report', label: 'گزارش' },
];

export default function WorkspacePage() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('order');
  const [orderForm, setOrderForm] = useState({ person_name: '', person_phone: '', subscription_id: '', quantity: 1, purchase_date: '', payment_method: 'cash', entry_time: '', usage_start_date: '', how_met: '' });
  const [capacityError, setCapacityError] = useState('');
  const [sortBy, setSortBy] = useState('date_desc');
  const [orderSearch, setOrderSearch] = useState('');
  const monthRange = getDateRange('month', null, null);
  const [historyFrom, setHistoryFrom] = useState(monthRange?.start || '');
  const [historyTo, setHistoryTo] = useState(todayGregorian());
  const [historyError, setHistoryError] = useState('');

  const onHistoryFromChange = (v) => {
    setHistoryFrom(v);
    if (v && historyTo && v >= historyTo) {
      setHistoryError('"از تاریخ" باید از "تا تاریخ" کوچکتر باشد');
    } else {
      setHistoryError('');
    }
  };

  const onHistoryToChange = (v) => {
    setHistoryTo(v);
    if (v && historyFrom && v <= historyFrom) {
      setHistoryError('"تا تاریخ" باید بزرگتر از "از تاریخ" باشد');
    } else {
      setHistoryError('');
    }
  };

  const resetHistoryRange = () => {
    setHistoryFrom(monthRange?.start || '');
    setHistoryTo(todayGregorian());
    setHistoryError('');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orders, subs, sps] = await Promise.all([
        base44.entities.WorkspaceOrder.list('-purchase_date', 500),
        base44.entities.WorkspaceSubscription.list('-created_date', 100),
        base44.entities.Space.list('-created_date', 100)
      ]);
      setRecords(orders);
      setSubscriptions(subs);
      setSpaces(sps);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalCapacity = getMainHallCapacity(spaces);

  const selectedSub = subscriptions.find(s => s.id === orderForm.subscription_id);
  const subDays = Number(selectedSub?.subscription_days) || 1;
  const usageDates = orderForm.usage_start_date ? computeUsageDates(orderForm.usage_start_date, subDays) : [];

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderForm.person_phone || !orderForm.purchase_date) return;
    setCapacityError('');
    if (orderForm.usage_start_date && usageDates.length) {
      const qty = Number(orderForm.quantity) || 1;
      const capMap = buildCapacityMap(records);
      const { ok, insufficientDates } = checkCapacityForDates(usageDates, qty, capMap, totalCapacity);
      if (!ok) {
        setCapacityError(`ظرفیت کافی برای روزهای زیر وجود ندارد: ${formatInsufficientDates(insufficientDates)}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await findOrCreatePerson(orderForm.person_phone, orderForm.person_name);
      const sub = subscriptions.find(s => s.id === orderForm.subscription_id);
      const days = Number(sub?.subscription_days) || 1;
      const dates = orderForm.usage_start_date ? computeUsageDates(orderForm.usage_start_date, days) : [];
      await base44.entities.WorkspaceOrder.create({
        ...orderForm,
        subscription_name: sub?.name || '',
        price: sub?.price || 0,
        quantity: Number(orderForm.quantity) || 1,
        how_met: orderForm.how_met || 'other',
        usage_start_date: orderForm.usage_start_date || '',
        usage_date: orderForm.usage_start_date || '',
        usage_dates: dates
      });
      setOrderForm({ person_name: '', person_phone: '', subscription_id: '', quantity: 1, purchase_date: '', payment_method: 'cash', entry_time: '', usage_start_date: '', how_met: '' });
      fetchData();
    } finally { setSubmitting(false); }
  };

  const togglePaid = async (r) => {
    await base44.entities.WorkspaceOrder.update(r.id, { is_paid: !r.is_paid });
    fetchData();
  };

  const stats = computeWorkspaceStats(records, null);

  const sortedRecords = [...records].sort((a, b) => {
    if (sortBy === 'date_asc') return (a.purchase_date || '').localeCompare(b.purchase_date || '');
    if (sortBy === 'name_asc') return (a.person_name || '').localeCompare(b.person_name || '');
    if (sortBy === 'name_desc') return (b.person_name || '').localeCompare(a.person_name || '');
    return (b.purchase_date || '').localeCompare(a.purchase_date || '');
  });

  const matchSearch = (r) => {
    if (!orderSearch) return true;
    const s = orderSearch.toLowerCase();
    return (r.person_name || '').toLowerCase().includes(s) ||
      (r.person_phone || '').includes(orderSearch) ||
      (r.subscription_name || '').toLowerCase().includes(s);
  };

  const today = todayGregorian();
  const todayRecords = sortedRecords.filter(r => {
    const dates = getOrderUsageDates(r);
    return dates.includes(today) && matchSearch(r);
  });

  const historyRecords = sortedRecords.filter(r => {
    if (historyFrom && (!r.purchase_date || r.purchase_date < historyFrom)) return false;
    if (historyTo && (!r.purchase_date || r.purchase_date > historyTo)) return false;
    return matchSearch(r);
  });

  const currentMonthName = (() => {
    try { return jMonths[getJalaliParts(today).jm - 1]; } catch { return ''; }
  })();

  const wsExportColumns = [
    { key: 'date', label: 'تاریخ خرید' },
    { key: 'subscription', label: 'اشتراک' },
    { key: 'name', label: 'نام' },
    { key: 'phone', label: 'شماره' },
    { key: 'entry', label: 'ورود' },
    { key: 'method', label: 'مدل پرداخت' },
    { key: 'status', label: 'وضعیت' },
    { key: 'amount', label: 'مبلغ' },
  ];
  const buildExportRows = (list) => list.map(r => ({
    date: r.purchase_date ? toJalaliStr(r.purchase_date) : '',
    subscription: r.subscription_name || '',
    name: r.person_name || '',
    phone: r.person_phone || '',
    entry: r.entry_time || '',
    method: paymentMethodLabels[r.payment_method] || r.payment_method || '',
    status: r.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده',
    amount: (r.price || 0) * (r.quantity || 1),
  }));

  const renderOrdersTable = (list) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-right p-3 font-medium">تاریخ خرید</th>
            <th className="text-right p-3 font-medium">اشتراک</th>
            <th className="text-right p-3 font-medium">نام</th>
            <th className="text-right p-3 font-medium">شماره</th>
            <th className="text-right p-3 font-medium">ورود</th>
            <th className="text-right p-3 font-medium">مدل پرداخت</th>
            <th className="text-center p-3 font-medium">وضعیت</th>
            <th className="text-center p-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {list.length === 0 ? (
            <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{orderSearch ? 'نتیجه‌ای یافت نشد' : 'موردی وجود ندارد'}</td></tr>
          ) : list.map(r => (
            <tr key={r.id} className="border-t border-border hover:bg-[#FDF2F1]/30 cursor-pointer" onClick={() => navigate(`/workspace/${r.id}`)}>
              <td className="p-3">{r.purchase_date ? toJalaliStr(r.purchase_date) : '-'}</td>
              <td className="p-3">{r.subscription_name || '-'}</td>
              <td className="p-3">{r.person_name || '-'}</td>
              <td className="p-3 text-muted-foreground">{r.person_phone}</td>
              <td className="p-3">{r.entry_time || '-'}</td>
              <td className="p-3 text-xs">{paymentMethodLabels[r.payment_method] || r.payment_method}</td>
              <td className="p-3 text-center">
                <button
                  onClick={(e) => { e.stopPropagation(); togglePaid(r); }}
                  className={`text-xs font-medium px-2 py-1 rounded ${r.is_paid ? 'text-green-600 bg-green-50' : 'text-[#B9834B] bg-[#FBF3EC]'}`}
                >
                  {r.is_paid ? 'پرداخت شده' : 'پرداخت‌نشده'}
                </button>
              </td>
              <td className="p-3 text-center">
                <ChevronLeft className="w-4 h-4 text-muted-foreground inline-block" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-12 rounded-lg" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فضای کار</h1>
        <p className="text-sm text-muted-foreground mt-1">ثبت سفارش، مدیریت اشتراک‌ها و مشاهده فاکتورها</p>
      </div>

      <div className="bg-white border-b border-border -mx-4 md:-mx-6">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center gap-1 overflow-x-auto">
            {tabs.map(t => {
              const isActive = t.key === tab;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#B74B40] text-[#B74B40]'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* تب گزارش */}
      {tab === 'report' && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <StatCard label="مجموع سفارش‌ها" value={toPersianNum(stats.totalOrders)} icon={Briefcase} color="terracotta" info="تعداد کل سفارش‌های فضای کار ثبت‌شده" />
          <StatCard label="افراد یونیک" value={toPersianNum(stats.uniqueCount)} icon={Users} color="teal" info="تعداد افراد یکتا بر اساس شماره تلفن که از فضای کار استفاده کرده‌اند" />
          <StatCard label="افراد تکراری" value={toPersianNum(stats.repeatCount)} icon={Repeat} color="ochre" info="تعداد افرادی که بیش از یک بار از فضای کار استفاده کرده‌اند" />
          <StatCard label="درآمد کل" value={formatCurrency(stats.totalRevenue)} icon={Briefcase} color="pink" info="مجموع درآمد فضای کار از همه سفارش‌ها" />
        </div>
      )}

      {/* تب سفارش جدید */}
      {tab === 'order' && (
        <>
          <div className="bg-white rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-4 gap-2">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Plus className="w-4 h-4 text-[#B74B40]" /> ثبت سفارش جدید</h3>
              <Link to="/workspace/subscriptions" className="text-xs text-[#B74B40] hover:underline">ویرایش اشتراک‌ها</Link>
            </div>
            <form onSubmit={handleOrderSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-xs text-muted-foreground block mb-1">نام مشتری</label>
                <PersonSearch
                  personName={orderForm.person_name}
                  personPhone={orderForm.person_phone}
                  onNameChange={v => setOrderForm({ ...orderForm, person_name: v })}
                  onPhoneChange={v => setOrderForm({ ...orderForm, person_phone: v })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل اشتراک</label>
                <select value={orderForm.subscription_id} onChange={e => setOrderForm({ ...orderForm, subscription_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required>
                  <option value="">انتخاب اشتراک...</option>
                  {subscriptions.map(s => <option key={s.id} value={s.id}>{s.name} — {toPersianNum(s.price)} تومان</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تعداد</label>
                <PersianNumberInput value={orderForm.quantity} onChange={v => setOrderForm({ ...orderForm, quantity: v })} placeholder="تعداد" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تاریخ خرید</label>
                <FloatingDateInput value={orderForm.purchase_date} onChange={v => setOrderForm({ ...orderForm, purchase_date: v })} required max={todayGregorian()} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع استفاده</label>
                <JalaliDateInput value={orderForm.usage_start_date} onChange={v => setOrderForm({ ...orderForm, usage_start_date: v })} />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="text-xs text-muted-foreground block mb-1">روزهای رزرو شده (تاریخ استفاده)</label>
                {usageDates.length > 0 ? (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-right p-2.5 font-medium">ردیف</th>
                          <th className="text-right p-2.5 font-medium">تاریخ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageDates.map((d, i) => (
                          <tr key={d} className="border-t border-border">
                            <td className="p-2.5 text-muted-foreground">{toPersianNum(i + 1)}</td>
                            <td className="p-2.5">{toJalaliStr(d)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">با انتخاب نوع اشتراک و تاریخ شروع استفاده، روزهای رزرو نمایش داده می‌شوند.</p>
                )}
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">زمان ورود (ساعت)</label>
                <select value={orderForm.entry_time} onChange={e => setOrderForm({ ...orderForm, entry_time: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">انتخاب ساعت...</option>
                  {Array.from({ length: 24 }, (_, i) => i).map(h => <option key={h} value={String(h).padStart(2, '0') + ':00'}>{toPersianNum(String(h).padStart(2, '0'))}:۰۰</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل پرداخت</label>
                <select value={orderForm.payment_method} onChange={e => setOrderForm({ ...orderForm, payment_method: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  {Object.entries(paymentMethodLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">مدل آشنایی</label>
                <select value={orderForm.how_met} onChange={e => setOrderForm({ ...orderForm, how_met: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm">
                  <option value="">انتخاب...</option>
                  {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              {capacityError && (
                <div className="sm:col-span-2 lg:col-span-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{capacityError}</div>
              )}
              <div className="sm:col-span-2 lg:col-span-3">
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  {submitting ? 'در حال ثبت...' : 'ثبت سفارش'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">رزروهای امروز</h3>
                <div className="flex items-center gap-2">
                  <ExportButton filename="رزروهای-امروز-فضای-کار" columns={wsExportColumns} rows={buildExportRows(todayRecords)} />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
                    <option value="date_desc">جدیدترین</option>
                    <option value="date_asc">قدیمی‌ترین</option>
                    <option value="name_asc">نام (A-Z)</option>
                    <option value="name_desc">نام (Z-A)</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="جستجوی نام، شماره، اشتراک..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-full sm:w-72" />
              </div>
            </div>
            {renderOrdersTable(todayRecords)}
          </div>
        </>
      )}

      {/* تب تاریخچه سفارشات */}
      {tab === 'history' && (
        <>
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground">از تاریخ:</span>
              <JalaliDateInput value={historyFrom} onChange={onHistoryFromChange} max={todayGregorian()} />
              <span className="text-sm text-muted-foreground">تا تاریخ:</span>
              <JalaliDateInput value={historyTo} onChange={onHistoryToChange} max={todayGregorian()} />
              <button
                onClick={resetHistoryRange}
                className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted"
              >
                <RotateCcw className="w-3.5 h-3.5" /> بازگشت به پیش‌فرض
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">پیش‌فرض: از ابتدای ماه {currentMonthName} تا امروز</p>
            {historyError && (
              <p className="text-xs text-red-600 mt-2">{historyError}</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-sm font-semibold">فاکتورها ({toPersianNum(historyRecords.length)})</h3>
                <div className="flex items-center gap-2">
                  <ExportButton filename="تاریخچه-سفارش‌های-فضای-کار" columns={wsExportColumns} rows={buildExportRows(historyRecords)} />
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
                    <option value="date_desc">جدیدترین</option>
                    <option value="date_asc">قدیمی‌ترین</option>
                    <option value="name_asc">نام (A-Z)</option>
                    <option value="name_desc">نام (Z-A)</option>
                  </select>
                </div>
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="جستجوی نام، شماره، اشتراک..." value={orderSearch} onChange={e => setOrderSearch(e.target.value)} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-full sm:w-72" />
              </div>
            </div>
            {renderOrdersTable(historyRecords)}
          </div>
        </>
      )}
    </div>
  );
}
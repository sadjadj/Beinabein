import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search, FileText, RotateCcw, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import PurchaseEditForm from '@/components/PurchaseEditForm';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import JalaliDateInput from '@/components/JalaliDateInput';
import ExportButton from '@/components/ExportButton';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { formatJalaliShort, todayGregorian, getJalaliParts, jalaliToGregorianStr, jalaliMonthNames } from '@/lib/jalali';

export default function WorkshopHistoryTab() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  const todayParts = getJalaliParts(todayGregorian());
  const monthStart = todayParts ? jalaliToGregorianStr(todayParts.jy, todayParts.jm, 1) : '';
  const monthName = todayParts ? jalaliMonthNames[todayParts.jm - 1] : '';

  const [range, setRange] = useState({ start: monthStart, end: '' });
  const [workshopFilter, setWorkshopFilter] = useState('');
  const [paidFilter, setPaidFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(1);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const startEdit = (p) => {
    setEditId(p.id);
    setEditForm({ purchase_date: p.purchase_date || '', payment_method: p.payment_method || 'cash', how_met: p.how_met || 'other', is_paid: !!p.is_paid });
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await base44.entities.WorkshopPurchase.update(editId, editForm);
      setPurchases(prev => prev.map(p => p.id === editId ? { ...p, ...editForm } : p));
      setEditId(null);
    } finally { setSavingEdit(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.WorkshopPurchase.delete(deleteTarget.id);
    setPurchases(prev => prev.filter(p => p.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  useEffect(() => {
    (async () => {
      try {
        const [purchs, ws] = await Promise.all([
          base44.entities.WorkshopPurchase.list('-purchase_date', 2000),
          base44.entities.Workshop.list('-start_date', 500)
        ]);
        setPurchases(purchs);
        setWorkshops(ws);
      } finally { setLoading(false); }
    })();
  }, []);

  const onStartChange = (v) => {
    setRange(prev => ({ ...prev, start: v }));
    setPage(1);
    if (v && range.end && v >= range.end) setDateError('"از تاریخ" باید از "تا تاریخ" کوچکتر باشد');
    else if (v && v > todayGregorian()) setDateError('"از تاریخ" نمی‌تواند بعد از امروز باشد');
    else setDateError('');
  };

  const onEndChange = (v) => {
    setRange(prev => ({ ...prev, end: v }));
    setPage(1);
    if (v && range.start && v <= range.start) setDateError('"تا تاریخ" باید بزرگتر از "از تاریخ" باشد');
    else setDateError('');
  };

  const resetRange = () => {
    setRange({ start: monthStart, end: '' });
    setDateError('');
  };

  const filtered = purchases.filter(p => {
    if (range.start && p.purchase_date && p.purchase_date < range.start) return false;
    if (range.end && p.purchase_date && p.purchase_date > range.end) return false;
    if (workshopFilter && p.workshop_id !== workshopFilter) return false;
    if (paidFilter === 'paid' && !p.is_paid) return false;
    if (paidFilter === 'unpaid' && p.is_paid) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (p.person_name || '').toLowerCase().includes(s) ||
      (p.person_phone || '').includes(search) ||
      (p.workshop_title || '').toLowerCase().includes(s);
  });

  const PAGE_SIZE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const exportColumns = [
    { key: 'workshop', label: 'کارگاه' },
    { key: 'plan', label: 'مدل ثبت‌نام' },
    { key: 'name', label: 'نام' },
    { key: 'phone', label: 'تلفن' },
    { key: 'date', label: 'تاریخ' },
    { key: 'price', label: 'مبلغ' },
    { key: 'donation', label: 'دونیشین' },
    { key: 'status', label: 'پرداخت' },
  ];
  const exportRows = filtered.map(p => ({
    workshop: p.workshop_title || '',
    plan: p.plan_name || '',
    name: p.person_name || '',
    phone: p.person_phone || '',
    date: p.purchase_date ? formatJalaliShort(p.purchase_date) : '',
    price: (Number(p.price) || 0) * (Number(p.quantity) || 1),
    donation: Number(p.donation) || 0,
    status: p.is_paid ? 'پرداخت‌شده' : 'پرداخت‌نشده',
  }));

  const rangeLabel = range.end
    ? `${range.start ? formatJalaliShort(range.start) : ''} تا ${formatJalaliShort(range.end)}`
    : `${range.start ? formatJalaliShort(range.start) : ''} تا امروز`;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-sm font-semibold">تاریخچه ثبت‌نام‌ها ({toPersianNum(filtered.length)})</h3>
          <span className="text-xs text-muted-foreground">بازه: {rangeLabel}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">از تاریخ:</span>
            <div className="w-44"><JalaliDateInput value={range.start} onChange={onStartChange} showToday={false} max={todayGregorian()} /></div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">تا تاریخ:</span>
            <div className="w-44"><JalaliDateInput value={range.end} onChange={onEndChange} max={todayGregorian()} /></div>
          </div>
          <button onClick={resetRange} className="flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-muted">
            <RotateCcw className="w-3.5 h-3.5" /> بازگشت به پیش‌فرض
          </button>
          <select value={workshopFilter} onChange={e => { setWorkshopFilter(e.target.value); setPage(1); }} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm">
            <option value="">همه کارگاه‌ها</option>
            {workshops.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
          <div className="flex items-center gap-1">
            {[['', 'همه'], ['paid', 'پرداخت‌شده'], ['unpaid', 'پرداخت‌نشده']].map(([val, lbl]) => (
              <button key={val} onClick={() => { setPaidFilter(val); setPage(1); }} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${paidFilter === val ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{lbl}</button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[140px]">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجوی نام / تلفن / کارگاه..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-full" />
          </div>
          <ExportButton filename="تاریخچه-ثبت‌نام‌ها" columns={exportColumns} rows={exportRows} />
        </div>
        <p className="text-xs text-muted-foreground">پیش‌فرض: از ابتدای {monthName} تا امروز</p>
        {dateError && <p className="text-xs text-red-600">{dateError}</p>}
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {loading ? (
          <TableSkeleton rows={8} cols={7} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">نتیجه‌ای در این بازه یافت نشد</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-center p-3 font-medium">تلفن</th>
                  <th className="text-center p-3 font-medium">تاریخ</th>
                  <th className="text-center p-3 font-medium">مبلغ</th>
                  <th className="text-center p-3 font-medium">جلسات</th>
                  <th className="text-center p-3 font-medium">پرداخت</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(p => (
                  <React.Fragment key={p.id}>
                  <tr className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => editId !== p.id && navigate(`/accounting/workshop/${p.id}`)}>
                    <td className="p-3">
                      <span className="font-medium">{p.person_name || '-'}</span>
                      {p.description && <FileText className="w-3.5 h-3.5 text-[#B9834B] inline-block mr-1" />}
                    </td>
                    <td className="p-3">
                      <Link to={`/workshops/${p.workshop_id}`} onClick={e => e.stopPropagation()} className="font-medium hover:text-[#B74B40]">{p.workshop_title || '-'}</Link>
                      {p.plan_name && <span className="text-xs text-[#8CB9C0] block mt-0.5">{p.plan_name}</span>}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground whitespace-nowrap text-center" dir="ltr">{p.person_phone || '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">{p.purchase_date ? formatJalaliShort(p.purchase_date) : '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap text-center">
                      {formatCurrency((Number(p.price) || 0) * (Number(p.quantity) || 1) + (Number(p.donation) || 0))}
                      {Number(p.donation) > 0 && <span className="block text-[10px] text-[#8CB9C0]">شامل {formatCurrency(Number(p.donation))} دونیشین</span>}
                    </td>
                    <td className="p-3 text-xs text-center">{p.registered_sessions ? `${toPersianNum(p.registered_sessions)} جلسه` : '-'}</td>
                    <td className="p-3 text-center">
                      <span className={`text-xs ${p.is_paid ? 'text-green-600' : 'text-[#B9834B]'}`}>{p.is_paid ? 'پرداخت‌شده' : 'پرداخت‌نشده'}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={e => { e.stopPropagation(); startEdit(p); }} className="text-muted-foreground hover:text-[#B74B40]"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={e => { e.stopPropagation(); setDeleteTarget(p); }} className="text-muted-foreground hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                  {editId === p.id && (
                    <tr className="border-t border-border">
                      <td colSpan={8} className="p-3 bg-muted/20">
                        <PurchaseEditForm form={editForm} setForm={setEditForm} onSave={saveEdit} onCancel={() => setEditId(null)} saving={savingEdit} showHowMet />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-border">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted">
              <ChevronRight className="w-4 h-4" />
            </button>
            <span className="text-sm text-muted-foreground">صفحه {toPersianNum(safePage)} از {toPersianNum(totalPages)}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف ثبت‌نام</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">آیا از حذف این ثبت‌نام اطمینان دارید؟ این عملیات قابل بازگشت نیست.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
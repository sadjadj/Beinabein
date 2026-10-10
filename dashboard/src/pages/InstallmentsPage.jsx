import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Search } from 'lucide-react';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import InstallmentChips, { InstallmentPayForm } from '@/components/workshops/InstallmentChips';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { todayGregorian } from '@/lib/jalali';
import { isInstallment, purchaseStatus, remaining } from '@/lib/installments';

const statusLabels = { overdue: 'معوق', due_today: 'سررسید امروز', in_progress: 'در جریان', settled: 'تسویه‌شده' };
const statusStyles = {
  overdue: 'bg-[#B74B40] text-white font-bold',
  due_today: 'bg-white border border-[#F5C9C3] text-[#8F342B] font-bold',
  in_progress: 'bg-muted text-muted-foreground font-medium',
  settled: 'bg-green-100 text-green-700 font-medium',
};
const statusOrder = ['overdue', 'due_today', 'in_progress', 'settled'];
const isDue = (r) => r.status === 'overdue' || r.status === 'due_today';

// مالی › اقساط — every instalment registration, for following up due dates and
// recording each instalment's payment.
export default function InstallmentsPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(null); // { id, index } of the instalment whose pay form is open

  useEffect(() => {
    base44.entities.WorkshopPurchase.filter({ is_installment: true })
      .then(setPurchases)
      .finally(() => setLoading(false));
  }, []);

  const today = todayGregorian();
  const rows = purchases.filter(isInstallment)
    .map(p => ({ p, status: purchaseStatus(p, today) }))
    .sort((a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status) || (b.p.purchase_date || '').localeCompare(a.p.purchase_date || ''));

  const filters = [
    ['all', 'همه', rows.length],
    ['due', 'سررسید امروز و معوق', rows.filter(isDue).length],
    ['settled', 'تسویه‌شده', rows.filter(r => r.status === 'settled').length],
  ];

  const filtered = rows.filter(r => {
    if (filter === 'due' && !isDue(r)) return false;
    if (filter === 'settled' && r.status !== 'settled') return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return (r.p.person_name || '').toLowerCase().includes(s) ||
      (r.p.person_phone || '').includes(search) ||
      (r.p.workshop_title || '').toLowerCase().includes(s);
  });

  const handleSaved = (updated) => {
    setPurchases(prev => prev.map(x => (x.id === updated.id ? updated : x)));
    setOpen(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map(([key, label, count]) => (
              <button key={key} onClick={() => setFilter(key)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filter === key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>
                {label} ({toPersianNum(count)})
              </button>
            ))}
          </div>
          <div className="relative flex-1 sm:flex-none min-w-[140px]">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="جستجوی نام / تلفن / کارگاه..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full sm:w-64" />
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={6} cols={5} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {rows.length === 0 ? 'هنوز ثبت‌نام قسطی وجود ندارد' : 'نتیجه‌ای یافت نشد'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">کارگاه</th>
                  <th className="text-right p-3 font-medium">اقساط</th>
                  <th className="text-center p-3 font-medium">مانده</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ p, status }) => {
                  const isOpen = open?.id === p.id;
                  const left = remaining(p);
                  return (
                    <React.Fragment key={p.id}>
                      <tr className={`border-t border-border ${isOpen ? 'bg-[#FDF2F1]' : ''}`}>
                        <td className="p-3 align-top">
                          <span className="font-medium block">{p.person_name || '-'}</span>
                          <span className="text-xs text-muted-foreground block text-right" dir="ltr">{p.person_phone || ''}</span>
                        </td>
                        <td className="p-3 align-top">
                          <Link to={`/workshops/${p.workshop_id}`} className="font-medium hover:text-[#B74B40]">{p.workshop_title || '-'}</Link>
                          {p.plan_name && <span className="text-xs text-[#8CB9C0] block mt-0.5">{p.plan_name}</span>}
                        </td>
                        <td className="p-3">
                          <InstallmentChips purchase={p} selected={isOpen ? open.index : null} onSelect={i => setOpen(i === null ? null : { id: p.id, index: i })} />
                        </td>
                        <td className={`p-3 text-center font-bold whitespace-nowrap ${left === 0 ? 'text-green-700' : ''}`}>{formatCurrency(left)}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-xs whitespace-nowrap ${statusStyles[status]}`}>{statusLabels[status]}</span>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-[#FDF2F1]">
                          <td colSpan={5} className="px-3 pb-3">
                            <InstallmentPayForm key={open.index} purchase={p} index={open.index} onSaved={handleSaved} onCancel={() => setOpen(null)} />
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

import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Eye, Trash2, Download, Search, Star } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatJalali } from '@/lib/jalali';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TablePager, { usePaged } from '@/components/TablePager';

// Submissions from the public club-owner-call form (client/ at /club-owner-call).
const STATUSES = [
  { key: 'submitted', label: 'جدید', className: 'bg-amber-50 text-amber-700' },
  { key: 'reviewed', label: 'بررسی‌شده', className: 'bg-slate-100 text-slate-700' },
  { key: 'invited', label: 'تایید‌شده', className: 'bg-green-50 text-green-700' },
  { key: 'declined', label: 'رد‌شده', className: 'bg-red-50 text-red-700' },
];
const statusOf = (key) => STATUSES.find(s => s.key === key) || STATUSES[0];

function LinkValue({ href }) {
  if (!href) return <span className="text-muted-foreground">—</span>;
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return <a href={url} target="_blank" rel="noreferrer" dir="ltr" className="text-[#B74B40] hover:underline break-all">{href}</a>;
}

function Row({ label, children }) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-base">{children}</div>
    </div>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // '' = all, 'starred', or a status key
  const [sortBy, setSortBy] = useState('date_desc');

  const fetchData = async () => {
    setLoading(true);
    try {
      setApplications(await base44.entities.Application.list('-created_date'));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const save = async (id, patch) => {
    setApplications(list => list.map(a => (a.id === id ? { ...a, ...patch } : a)));
    try {
      await base44.entities.Application.update(id, patch);
    } catch {
      fetchData(); // put the saved values back if the update failed
    }
  };
  const setStatus = (id, status) => save(id, { status });

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    setOpenId(null);
    await base44.entities.Application.delete(id);
    fetchData();
  };

  const open = applications.find(a => a.id === openId);

  const q = search.trim().toLowerCase();
  const filtered = applications
    .filter(a => !statusFilter || (statusFilter === 'starred' ? a.starred : (a.status || 'submitted') === statusFilter))
    .filter(a => !q || [a.full_name, a.phone, a.topics].some(v => (v || '').toLowerCase().includes(q)))
    .sort((a, b) => {
      if (sortBy === 'date_asc') return (a.created_date || '').localeCompare(b.created_date || '');
      if (sortBy === 'name_asc') return (a.full_name || '').localeCompare(b.full_name || '', 'fa');
      if (sortBy === 'name_desc') return (b.full_name || '').localeCompare(a.full_name || '', 'fa');
      return (b.created_date || '').localeCompare(a.created_date || '');
    });

  const paged = usePaged(filtered, [search, statusFilter, sortBy].join('|'));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فراخوان</h1>
        <p className="text-sm text-muted-foreground mt-1">درخواست‌هایی که از فرم فراخوان جمع‌سازها ثبت شده‌اند</p>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 className="text-sm font-semibold">درخواست‌ها ({toPersianNum(filtered.length)})</h3>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm" aria-label="مرتب‌سازی">
                <option value="date_desc">جدیدترین</option>
                <option value="date_asc">قدیمی‌ترین</option>
                <option value="name_asc">نام (الف-ی)</option>
                <option value="name_desc">نام (ی-الف)</option>
              </select>
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو: نام، شماره، موضوع..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pr-9 pl-3 py-1.5 rounded-lg border border-input bg-background text-sm w-full sm:w-72"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {[['', 'همه'], ...STATUSES.map(s => [s.key, s.label]), ['starred', 'ستاره‌دار']].map(([val, lbl]) => (
              <button key={val} onClick={() => setStatusFilter(val)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === val ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}>{lbl}</button>
            ))}
          </div>
        </div>
        {loading ? (
          <TableSkeleton rows={4} cols={6} />
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">{applications.length ? 'نتیجه‌ای یافت نشد' : 'هنوز درخواستی ثبت نشده است'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="w-10 p-3"><span className="sr-only">ستاره</span></th>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره تماس</th>
                  <th className="text-center p-3 font-medium">امکان حضور</th>
                  <th className="text-center p-3 font-medium">وضعیت</th>
                  <th className="text-center p-3 font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {paged.pageRows.map(a => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 text-center">
                      <button onClick={() => save(a.id, { starred: !a.starred })} aria-label={a.starred ? 'برداشتن ستاره' : 'ستاره زدن'} aria-pressed={!!a.starred} className="p-1 rounded hover:bg-muted">
                        <Star className={`w-4 h-4 ${a.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/40'}`} />
                      </button>
                    </td>
                    <td className="p-3 font-medium">{a.full_name || '—'}</td>
                    <td className="p-3"><span dir="ltr">{a.phone || '—'}</span></td>
                    <td className="p-3 text-center">
                      {a.can_attend === 'yes'
                        ? <Check className="w-4 h-4 text-green-600 inline" aria-label="بله" />
                        : <X className="w-4 h-4 text-muted-foreground inline" aria-label="خیر" />}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap ${statusOf(a.status).className}`}>{statusOf(a.status).label}</span>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => setOpenId(a.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs hover:border-[#B74B40] hover:text-[#B74B40]">
                        <Eye className="w-3.5 h-3.5" /> جزئیات
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <TablePager {...paged} />
      </div>

      <Dialog open={!!open} onOpenChange={(isOpen) => !isOpen && setOpenId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-8 md:p-10 gap-6" dir="rtl">
          {open && (
            <>
              <DialogHeader className="text-right">
                <DialogTitle className="text-right text-2xl pr-8">{open.full_name || '—'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-7">
                <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                  <Row label="شماره تماس"><span dir="ltr">{open.phone || '—'}</span></Row>
                  <Row label="تاریخ ثبت">{open.created_date ? formatJalali(open.created_date) : '—'}</Row>
                  <Row label="امکان حضور در دورهمی">{open.can_attend === 'yes' ? 'بله' : open.can_attend === 'no' ? 'خیر' : '—'}</Row>
                  <Row label="وضعیت">
                    <select
                      value={open.status || 'submitted'}
                      onChange={e => setStatus(open.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                      aria-label="وضعیت"
                    >
                      {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </Row>
                </div>
                <Row label="موضوعاتی که می‌تواند حولشان جمع بسازد">
                  <p className="leading-8 whitespace-pre-wrap">{open.topics || '—'}</p>
                </Row>
                <Row label="صفحه‌ی معرفی"><LinkValue href={open.work_link} /></Row>
                <Row label="لینک رزومه"><LinkValue href={open.resume} /></Row>
                <Row label="فایل رزومه">
                  {open.resume_file_id ? (
                    <button
                      onClick={() => base44.files.download(open.resume_file_id, open.resume_file_name).catch(err => alert(err.message))}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm hover:border-[#B74B40] hover:text-[#B74B40]"
                    >
                      <Download className="w-4 h-4" />
                      دانلود <span dir="ltr" className="max-w-[16rem] truncate">{open.resume_file_name || 'resume.pdf'}</span>
                    </button>
                  ) : <span className="text-muted-foreground">—</span>}
                </Row>
                <div className="pt-5 border-t border-border">
                  <button onClick={() => setDeleteId(open.id)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-red-600">
                    <Trash2 className="w-4 h-4" /> حذف درخواست
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onConfirm={handleDelete}
        onClose={() => setDeleteId(null)}
        title="حذف درخواست"
        description="آیا از حذف این درخواست اطمینان دارید؟ این عملیات قابل بازگشت نیست."
      />
    </div>
  );
}

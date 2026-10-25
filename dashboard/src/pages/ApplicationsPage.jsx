import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Eye, Trash2 } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatJalali } from '@/lib/jalali';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// Submissions from the public club-owner-call form (client/ at /club-owner-call).
const STATUSES = [
  { key: 'submitted', label: 'جدید' },
  { key: 'reviewed', label: 'بررسی‌شده' },
  { key: 'invited', label: 'دعوت‌شده' },
  { key: 'declined', label: 'رد‌شده' },
];

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

  const fetchData = async () => {
    setLoading(true);
    try {
      setApplications(await base44.entities.Application.list('-created_date'));
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const setStatus = async (id, status) => {
    setApplications(list => list.map(a => (a.id === id ? { ...a, status } : a)));
    try {
      await base44.entities.Application.update(id, { status });
    } catch {
      fetchData(); // put the saved status back if the update failed
    }
  };

  const handleDelete = async () => {
    const id = deleteId;
    setDeleteId(null);
    setOpenId(null);
    await base44.entities.Application.delete(id);
    fetchData();
  };

  const open = applications.find(a => a.id === openId);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فراخوان</h1>
        <p className="text-sm text-muted-foreground mt-1">درخواست‌هایی که از فرم فراخوان جمع‌سازها ثبت شده‌اند</p>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-semibold">درخواست‌ها ({toPersianNum(applications.length)})</h3></div>
        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : applications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز درخواستی ثبت نشده است</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">نام</th>
                  <th className="text-right p-3 font-medium">شماره تماس</th>
                  <th className="text-center p-3 font-medium">امکان حضور</th>
                  <th className="text-center p-3 font-medium">جزئیات</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(a => (
                  <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{a.full_name || '—'}</td>
                    <td className="p-3"><span dir="ltr">{a.phone || '—'}</span></td>
                    <td className="p-3 text-center">
                      {a.can_attend === 'yes'
                        ? <Check className="w-4 h-4 text-green-600 inline" aria-label="بله" />
                        : <X className="w-4 h-4 text-muted-foreground inline" aria-label="خیر" />}
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
                <Row label="رزومه"><LinkValue href={open.resume} /></Row>
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

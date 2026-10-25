import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Phone, Link2, FileText } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatJalali } from '@/lib/jalali';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';

// Submissions from the public club-owner-call form (client/ at /club-owner-call).
const STATUSES = [
  { key: 'submitted', label: 'جدید', className: 'bg-amber-50 text-amber-700' },
  { key: 'reviewed', label: 'بررسی‌شده', className: 'bg-slate-100 text-slate-700' },
  { key: 'invited', label: 'دعوت‌شده', className: 'bg-green-50 text-green-700' },
  { key: 'declined', label: 'رد‌شده', className: 'bg-red-50 text-red-700' },
];
const statusOf = (key) => STATUSES.find(s => s.key === key) || STATUSES[0];

function ExternalLink({ href, icon: Icon, label }) {
  if (!href) return null;
  const url = /^https?:\/\//i.test(href) ? href : `https://${href}`;
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[#B74B40] hover:underline max-w-full">
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="text-muted-foreground">{label}:</span>
      <span dir="ltr" className="truncate">{href}</span>
    </a>
  );
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
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
    await base44.entities.Application.delete(id);
    fetchData();
  };

  const countOf = (key) => applications.filter(a => (a.status || 'submitted') === key).length;
  const shown = filter === 'all' ? applications : applications.filter(a => (a.status || 'submitted') === filter);
  const tabs = [{ key: 'all', label: 'همه', count: applications.length }, ...STATUSES.map(s => ({ ...s, count: countOf(s.key) }))];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">فراخوان جمع‌سازها</h1>
        <p className="text-sm text-muted-foreground mt-1">درخواست‌هایی که از فرم فراخوان ثبت شده‌اند</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              filter === t.key ? 'bg-[#B74B40] text-white border-[#B74B40]' : 'bg-white border-border text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label} ({toPersianNum(t.count)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border"><TableSkeleton rows={4} cols={3} /></div>
      ) : shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          {applications.length === 0 ? 'هنوز درخواستی ثبت نشده است' : 'درخواستی با این وضعیت نیست'}
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map(a => {
            const status = statusOf(a.status);
            return (
              <div key={a.id} className="bg-white rounded-xl border border-border p-4 md:p-5 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold">{a.full_name || '—'}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.can_attend === 'yes' ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                        حضور در دورهمی: {a.can_attend === 'yes' ? 'بله' : a.can_attend === 'no' ? 'خیر' : '—'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                      {a.phone && (
                        <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1.5 hover:text-foreground">
                          <Phone className="w-3.5 h-3.5" /><span dir="ltr">{a.phone}</span>
                        </a>
                      )}
                      {a.created_date && <span>{formatJalali(a.created_date)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="sr-only" htmlFor={`status-${a.id}`}>وضعیت</label>
                    <select
                      id={`status-${a.id}`}
                      value={a.status || 'submitted'}
                      onChange={e => setStatus(a.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-input bg-background text-sm"
                    >
                      {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                    <button onClick={() => setDeleteId(a.id)} className="p-1.5 text-muted-foreground hover:text-red-600" aria-label="حذف">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {a.topics && <p className="text-sm leading-7 whitespace-pre-wrap">{a.topics}</p>}

                {(a.work_link || a.resume) && (
                  <div className="flex flex-col gap-1 text-sm min-w-0">
                    <ExternalLink href={a.work_link} icon={Link2} label="صفحه" />
                    <ExternalLink href={a.resume} icon={FileText} label="رزومه" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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

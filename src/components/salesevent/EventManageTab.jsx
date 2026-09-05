import React, { useState } from 'react';
import { Plus, Pencil } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { toJalaliStr, todayGregorian } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

const blankForm = { title: '', start_date: '', end_date: '', description: '' };

export default function EventManageTab({ events, onCreate, onUpdate }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editError, setEditError] = useState('');

  const today = todayGregorian();
  const current = [], upcoming = [], ended = [];
  events.forEach(e => {
    if (!e.start_date || !e.end_date) return;
    if (e.start_date > today) upcoming.push(e);
    else if (e.end_date < today) ended.push(e);
    else current.push(e);
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title || !form.start_date || !form.end_date) return;
    if (form.start_date > form.end_date) { setFormError('تاریخ شروع باید قبل از تاریخ پایان باشد'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await onCreate(form);
      setForm(blankForm);
      setShowForm(false);
    } finally { setSubmitting(false); }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.title || !editForm.start_date || !editForm.end_date) return;
    if (editForm.start_date > editForm.end_date) { setEditError('تاریخ شروع باید قبل از تاریخ پایان باشد'); return; }
    setEditError('');
    setSubmitting(true);
    try {
      await onUpdate(editingId, editForm);
      setEditingId(null);
    } finally { setSubmitting(false); }
  };

  const renderForm = (data, setData, onSubmit, onCancel, submitLabel, error) => (
    <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end border-t border-border mt-3 pt-3">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">نام ایونت</label>
        <input type="text" value={data.title || ''} onChange={e => setData({ ...data, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">تاریخ شروع</label>
        <JalaliDateInput value={data.start_date} onChange={v => setData({ ...data, start_date: v })} required />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">تاریخ پایان</label>
        <JalaliDateInput value={data.end_date} onChange={v => setData({ ...data, end_date: v })} required />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">توضیحات</label>
        <input type="text" value={data.description || ''} onChange={e => setData({ ...data, description: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
      </div>
      {error && <div className="sm:col-span-2 lg:col-span-4 text-xs text-red-600">{error}</div>}
      <div className="sm:col-span-2 lg:col-span-4 flex gap-2">
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
          {submitting ? 'در حال ثبت...' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted">انصراف</button>
      </div>
    </form>
  );

  const renderList = (label, list) => (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label} ({toPersianNum(list.length)})</p>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground/70 py-2">موردی وجود ندارد</p>
      ) : (
        <div className="divide-y divide-border">
          {list.map(ev => (
            <div key={ev.id} className="py-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-sm min-w-0">
                  <span className="font-medium truncate">{ev.title}</span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{toJalaliStr(ev.start_date)} تا {toJalaliStr(ev.end_date)}</span>
                </div>
                <button
                  onClick={() => {
                    if (editingId === ev.id) { setEditingId(null); setEditError(''); }
                    else { setEditingId(ev.id); setEditError(''); setEditForm({ title: ev.title, start_date: ev.start_date, end_date: ev.end_date, description: ev.description || '' }); }
                  }}
                  className="text-muted-foreground hover:text-[#B74B40]"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
              {editingId === ev.id && renderForm(editForm, setEditForm, handleSaveEdit, () => { setEditingId(null); setEditError(''); }, 'ذخیره', editError)}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <button
          onClick={() => { setShowForm(!showForm); setFormError(''); }}
          className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]"
        >
          <Plus className="w-4 h-4" /> {showForm ? 'بستن' : 'افزودن ایونت جدید'}
        </button>
        {showForm && renderForm(form, setForm, handleCreate, () => { setShowForm(false); setFormError(''); }, 'ثبت ایونت', formError)}
      </div>

      {renderList('ایونت‌های جاری', current)}
      {renderList('ایونت‌های آینده', upcoming)}
      {renderList('ایونت‌های پیشین', ended)}
    </div>
  );
}
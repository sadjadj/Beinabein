import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, Trash2, Calendar, Clock, MapPin, Plus, X, Sparkles } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';
import { formatJalaliShort } from '@/lib/jalali';
import EventForm from '@/components/EventForm';
import { TableSkeleton } from '@/components/SkeletonPatterns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';

const blankEventForm = {
  title: '', price: '', session_count: '', description: '', tags: '',
  space: '', start_time: '', end_time: '', day_of_week: '',
  start_date: '', end_date: '', capacity: '', session_dates: []
};

export default function EventManagementTab({ spaces }) {
  const [events, setEvents] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [evs, plns] = await Promise.all([
        base44.entities.Event.list('-start_date', 500),
        base44.entities.EventPlan.list('-created_date', 1000)
      ]);
      setEvents(evs);
      setPlans(plns);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (form, submittedPlans) => {
    setSubmitting(true);
    try {
      const created = await base44.entities.Event.create({
        ...form,
        price: Number(form.price) || 0,
        session_count: Number(form.session_count) || 0,
        capacity: Number(form.capacity) || null
      });
      const validPlans = (submittedPlans || []).filter(p => p.name && p.price !== '' && p.price !== null);
      if (validPlans.length > 0) {
        await base44.entities.EventPlan.bulkCreate(
          validPlans.map(p => ({ event_id: created.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false }))
        );
      }
      await base44.entities.EventPlan.create({ event_id: created.id, name: 'رایگان', price: 0, is_active: false });
      setShowAdd(false);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleSaveEdit = async (form, submittedPlans) => {
    setSubmitting(true);
    try {
      const id = editingId;
      const ev = events.find(e => e.id === id);
      await base44.entities.Event.update(id, {
        ...form,
        price: Number(form.price) || 0,
        session_count: Number(form.session_count) || 0,
        capacity: Number(form.capacity) || null
      });
      if (form.title && form.title !== ev.title) {
        await base44.entities.EventPlan.updateMany({ event_id: id }, { $set: { name: form.title } });
      }
      const evPlans = plans.filter(p => p.event_id === id);
      const keepIds = new Set((submittedPlans || []).filter(p => p.id).map(p => p.id));
      const plansToDelete = evPlans.filter(p => !keepIds.has(p.id));
      const plansToUpdate = (submittedPlans || []).filter(p => p.id);
      const plansToAdd = (submittedPlans || []).filter(p => !p.id);
      for (const p of plansToDelete) await base44.entities.EventPlan.delete(p.id);
      if (plansToUpdate.length) await base44.entities.EventPlan.bulkUpdate(plansToUpdate.map(p => ({ id: p.id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));
      if (plansToAdd.length) await base44.entities.EventPlan.bulkCreate(plansToAdd.map(p => ({ event_id: id, name: p.name, price: Number(p.price) || 0, is_active: p.is_active !== false })));
      setEditingId(null);
      fetchData();
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await base44.entities.EventPlan.deleteMany({ event_id: deleteTarget.id });
    await base44.entities.Event.delete(deleteTarget.id);
    setDeleteTarget(null);
    fetchData();
  };

  const editingEvent = events.find(e => e.id === editingId);
  const editingPlans = plans.filter(p => p.event_id === editingId);

  if (editingEvent) {
    const buildForm = () => ({
      title: editingEvent.title || '', price: editingEvent.price || '', session_count: editingEvent.session_count || '',
      description: editingEvent.description || '', tags: editingEvent.tags || '', space: editingEvent.space || '',
      start_time: editingEvent.start_time || '', end_time: editingEvent.end_time || '', day_of_week: editingEvent.day_of_week || '',
      start_date: editingEvent.start_date || '', end_date: editingEvent.end_date || '', capacity: editingEvent.capacity || '',
      session_dates: editingEvent.session_dates || []
    });
    return (
      <div className="space-y-3">
        <button onClick={() => setEditingId(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" /> بازگشت به لیست
        </button>
        <EventForm
          initialForm={buildForm()}
          initialPlans={editingPlans}
          spaces={spaces}
          onSubmit={handleSaveEdit}
          onCancel={() => setEditingId(null)}
          submitting={submitting}
          submitLabel="ذخیره تغییرات"
          showDelete
          onDelete={() => { setDeleteTarget(editingEvent); }}
        />
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
          <AlertDialogContent className="text-center">
            <AlertDialogHeader className="text-center">
              <AlertDialogTitle className="text-center">حذف رخداد</AlertDialogTitle>
              <AlertDialogDescription className="text-center block">
                آیا از حذف رخداد «{deleteTarget?.title}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
              <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-[#B9834B]" /> رخدادها ({toPersianNum(events.length)})</h3>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34]">
          {showAdd ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}{showAdd ? 'بستن' : 'افزودن رخداد'}
        </button>
      </div>

      {showAdd && (
        <EventForm
          initialForm={blankEventForm}
          initialPlans={[]}
          spaces={spaces}
          onSubmit={handleCreate}
          onCancel={() => setShowAdd(false)}
          submitting={submitting}
          submitLabel="ثبت رخداد"
        />
      )}

      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : events.length === 0 ? (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground text-sm">هنوز رخدادی ثبت نشده است</div>
      ) : (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-right p-3 font-medium">عنوان</th>
                  <th className="text-right p-3 font-medium">تاریخ شروع</th>
                  <th className="text-right p-3 font-medium">ساعت</th>
                  <th className="text-right p-3 font-medium">فضا</th>
                  <th className="text-center p-3 font-medium">جلسات</th>
                  <th className="text-center p-3 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {events.map(e => (
                  <tr key={e.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-3 font-medium">{e.title || '-'}</td>
                    <td className="p-3 text-xs">{e.start_date ? formatJalaliShort(e.start_date) : '-'}</td>
                    <td className="p-3 text-xs whitespace-nowrap">{e.start_time || '-'}{e.end_time ? ` - ${e.end_time}` : ''}</td>
                    <td className="p-3 text-xs">{e.space || '-'}</td>
                    <td className="p-3 text-center text-xs">{toPersianNum((e.session_dates || []).length)}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => setEditingId(e.id)} className="text-muted-foreground hover:text-[#B74B40]" title="ویرایش"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setDeleteTarget(e)} className="text-muted-foreground hover:text-red-600" title="حذف"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent className="text-center">
          <AlertDialogHeader className="text-center">
            <AlertDialogTitle className="text-center">حذف رخداد</AlertDialogTitle>
            <AlertDialogDescription className="text-center block">
              آیا از حذف رخداد «{deleteTarget?.title}» اطمینان دارید؟ این عملیات قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex items-center justify-center gap-3 sm:justify-center">
            <AlertDialogCancel className="mx-2">انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white mx-2">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
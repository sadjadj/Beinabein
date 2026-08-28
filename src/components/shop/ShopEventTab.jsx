import React, { useState } from 'react';
import { Plus, Ticket } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ShopSectionTab from '@/components/shop/ShopSectionTab';

export default function ShopEventTab({ events, items, sales, onRefresh }) {
  const [selectedId, setSelectedId] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const createEvent = async (e) => {
    e.preventDefault();
    if (!title) return;
    setCreating(true);
    try {
      const created = await base44.entities.ShopEvent.create({ title });
      setTitle('');
      onRefresh();
      setSelectedId(created.id);
    } finally { setCreating(false); }
  };

  const toggleEnded = async (ev) => {
    await base44.entities.ShopEvent.update(ev.id, { is_ended: !ev.is_ended });
    onRefresh();
  };

  const selected = events.find(e => e.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-border p-5">
        <h3 className="text-sm font-semibold flex items-center gap-2 mb-3"><Ticket className="w-4 h-4 text-[#B74B40]" /> ایجاد ایونت فروش</h3>
        <form onSubmit={createEvent} className="flex gap-3 flex-wrap items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground block mb-1">نام ایونت</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
          </div>
          <button type="submit" disabled={creating} className="px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">{creating ? 'در حال ایجاد...' : 'ایجاد ایونت'}</button>
        </form>

        {events.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border">
            <label className="text-xs text-muted-foreground block mb-2">انتخاب ایونت</label>
            <div className="flex flex-wrap gap-2">
              {events.map(e => (
                <div key={e.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm cursor-pointer ${selectedId === e.id ? 'border-[#B74B40] bg-[#FDF2F1] text-[#B74B40]' : 'border-border hover:bg-muted/30'}`} onClick={() => setSelectedId(e.id)}>
                  <span className="font-medium">{e.title}</span>
                  {e.is_ended && <span className="text-xs text-muted-foreground">(پایان‌یافته)</span>}
                  <button type="button" onClick={(ev) => { ev.stopPropagation(); toggleEnded(e); }} className="text-xs text-muted-foreground hover:text-foreground">
                    {e.is_ended ? 'فعال‌سازی' : 'پایان'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {selected ? (
        <ShopSectionTab section="event" itemLabel="آیتم" inventoryTitle={`آیتم‌های «${selected.title}»`} items={items} sales={sales} eventId={selected.id} eventTitle={selected.title} onRefresh={onRefresh} />
      ) : (
        <div className="bg-white rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">
          برای مدیریت آیتم‌ها و ثبت فروش، یک ایونت ایجاد یا انتخاب کنید.
        </div>
      )}
    </div>
  );
}
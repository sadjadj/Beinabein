import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/SkeletonPatterns';
import EventItemAddForm from '@/components/salesevent/EventItemAddForm';
import EventItemsList from '@/components/salesevent/EventItemsList';

export default function EventItemsPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          base44.entities.SalesEvent.get(id),
          base44.entities.SalesEventItem.filter({ event_id: id }),
          base44.entities.SalesEventCategory.filter({ event_id: id }),
        ]);
        if (cancelled) return;
        if (results[0].status === 'fulfilled') setEvent(results[0].value);
        if (results[1].status === 'fulfilled') setItems(results[1].value);
        if (results[2].status === 'fulfilled') setCategories(results[2].value);
      } finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  // اگر آیتمی با همین نام و کتگوری از قبل وجود داشته باشد، فقط موجودی آن به اندازه تعداد ورودی افزایش می‌یابد
  const handleAddItem = async (form) => {
    const addQty = Number(form.add_quantity) || 0;
    const existing = items.find(i => (i.name || '').trim() === (form.name || '').trim() && (i.category || '') === form.category);
    if (existing) {
      const newStock = (Number(existing.stock_quantity) || 0) + addQty;
      await base44.entities.SalesEventItem.update(existing.id, { stock_quantity: newStock });
      setItems(prev => prev.map(i => i.id === existing.id ? { ...i, stock_quantity: newStock } : i));
    } else {
      const created = await base44.entities.SalesEventItem.create({
        event_id: id,
        name: form.name,
        category: form.category,
        price: Number(form.price) || 0,
        stock_quantity: addQty,
        is_visible: true,
      });
      setItems(prev => [created, ...prev]);
    }
  };

  const handleItemSave = async (itemId, payload) => {
    await base44.entities.SalesEventItem.update(itemId, payload);
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, ...payload } : i));
  };

  const handleDeleteItem = async (itemId) => {
    await base44.entities.SalesEventItem.delete(itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  };

  const handleToggleVisible = async (itemId, cur) => {
    const nv = !cur;
    await base44.entities.SalesEventItem.update(itemId, { is_visible: nv });
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_visible: nv } : i));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="bg-white rounded-xl border border-border p-10 text-center text-sm text-muted-foreground">ایونت مورد نظر یافت نشد</div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">آیتم‌های ایونت {event.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">افزودن و مدیریت آیتم‌ها، کتگوری‌ها و موجودی این ایونت</p>
        </div>
        <Link to="/store?tab=event" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> بازگشت به فروشگاه
        </Link>
      </div>

      <EventItemAddForm eventId={id} eventTitle={event.title} categories={categories} onAdd={handleAddItem} />

      <EventItemsList
        eventTitle={event.title}
        items={items}
        categories={categories}
        onSave={handleItemSave}
        onDelete={handleDeleteItem}
        onToggleVisible={handleToggleVisible}
      />
    </div>
  );
}
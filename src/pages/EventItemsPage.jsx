import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/SkeletonPatterns';
import StoreInventoryTab from '@/components/store/StoreInventoryTab';

export default function EventItemsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ev, its, cats] = await Promise.all([
          base44.entities.Event.get(id).catch(() => null),
          base44.entities.EventItem.filter({ event_id: id }),
          base44.entities.EventItemCategory.filter({ event_id: id })
        ]);
        if (!ev) { setNotFound(true); return; }
        setEvent(ev);
        setItems(its);
        setCategories(cats);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleItemSubmit = async (form, editingItemId) => {
    if (editingItemId) {
      const updates = { name: form.name, category: form.category, price: Number(form.price) || 0, stock_quantity: Number(form.stock_quantity) || 0 };
      await base44.entities.EventItem.update(editingItemId, updates);
      setItems(prev => prev.map(i => i.id === editingItemId ? { ...i, ...updates } : i));
    } else {
      const addQty = Number(form.add_quantity) || 0;
      const existing = items.find(i => (i.name || '').trim() === (form.name || '').trim() && (i.category || '') === (form.category || ''));
      if (existing) {
        const newStock = (Number(existing.stock_quantity) || 0) + addQty;
        await base44.entities.EventItem.update(existing.id, { stock_quantity: newStock });
        setItems(prev => prev.map(i => i.id === existing.id ? { ...i, stock_quantity: newStock } : i));
      } else {
        const created = await base44.entities.EventItem.create({ event_id: id, name: form.name, category: form.category, price: Number(form.price) || 0, stock_quantity: addQty, is_visible: true });
        setItems(prev => [created, ...prev]);
      }
    }
  };

  const deleteItem = async (itemId) => { await base44.entities.EventItem.delete(itemId); setItems(prev => prev.filter(i => i.id !== itemId)); };
  const toggleItemVisible = async (itemId, cur) => { const nv = !cur; await base44.entities.EventItem.update(itemId, { is_visible: nv }); setItems(prev => prev.map(i => i.id === itemId ? { ...i, is_visible: nv } : i)); };

  if (loading) return <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"><Skeleton className="h-64 rounded-xl" /></div>;
  if (notFound) return <div className="p-6 text-center text-muted-foreground">ایونتی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={() => navigate('/store?tab=event')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فروشگاه
      </button>
      <div>
        <h1 className="text-2xl font-bold">آیتم‌های ایونت {event?.title || ''}</h1>
        <p className="text-sm text-muted-foreground mt-1">افزودن و مدیریت آیتم‌های فروش این ایونت</p>
      </div>
      <StoreInventoryTab
        items={items}
        categories={categories}
        onItemSubmit={handleItemSubmit}
        onDeleteItem={deleteItem}
        onToggleVisible={toggleItemVisible}
        onEditCategories={() => navigate(`/event-item-categories/${id}`)}
        sectionName={`ایونت ${event?.title || ''}`}
        showBrand={false}
      />
    </div>
  );
}
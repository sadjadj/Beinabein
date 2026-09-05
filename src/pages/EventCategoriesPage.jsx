import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/SkeletonPatterns';
import StoreCategoryTab from '@/components/store/StoreCategoryTab';

export default function EventCategoriesPage() {
  const { id } = useParams();
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const results = await Promise.allSettled([
          base44.entities.SalesEvent.get(id),
          base44.entities.SalesEventCategory.filter({ event_id: id }),
        ]);
        if (cancelled) return;
        if (results[0].status === 'fulfilled') setEvent(results[0].value);
        if (results[1].status === 'fulfilled') setCategories(results[1].value);
      } finally { if (!cancelled) setLoading(false); }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [id]);

  const handleAdd = async (name) => {
    const c = await base44.entities.SalesEventCategory.create({ event_id: id, name });
    setCategories(prev => [...prev, c]);
  };

  const handleUpdate = async (cid, name) => {
    await base44.entities.SalesEventCategory.update(cid, { name });
    setCategories(prev => prev.map(c => c.id === cid ? { ...c, name } : c));
  };

  const handleDelete = async (cid) => {
    await base44.entities.SalesEventCategory.delete(cid);
    setCategories(prev => prev.filter(c => c.id !== cid));
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-56 rounded-xl" />
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
          <h1 className="text-2xl font-bold">کتگوری آیتم‌های ایونت {event.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">افزودن، ویرایش و حذف کتگوری‌های این ایونت</p>
        </div>
        <Link to={`/store/event-items/${id}`} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowRight className="w-4 h-4" /> بازگشت به آیتم‌های ایونت
        </Link>
      </div>

      <StoreCategoryTab
        categories={categories}
        onCategorySubmit={handleAdd}
        onUpdateCategory={handleUpdate}
        onDeleteCategory={handleDelete}
      />
    </div>
  );
}
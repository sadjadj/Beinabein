import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/SkeletonPatterns';
import StoreCategoryTab from '@/components/store/StoreCategoryTab';

export default function EventItemCategoriesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [ev, cats] = await Promise.all([
          base44.entities.Event.get(id).catch(() => null),
          base44.entities.EventItemCategory.filter({ event_id: id })
        ]);
        if (!ev) { setNotFound(true); return; }
        setEvent(ev);
        setCategories(cats);
      } finally { setLoading(false); }
    };
    fetchData();
  }, [id]);

  const handleCategorySubmit = async (name) => { const c = await base44.entities.EventItemCategory.create({ event_id: id, name }); setCategories(prev => [...prev, c]); };
  const updateCategory = async (catId, name) => { await base44.entities.EventItemCategory.update(catId, { name }); setCategories(prev => prev.map(c => c.id === catId ? { ...c, name } : c)); };
  const deleteCategory = async (catId) => { await base44.entities.EventItemCategory.delete(catId); setCategories(prev => prev.filter(c => c.id !== catId)); };

  if (loading) return <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto"><Skeleton className="h-48 rounded-xl" /></div>;
  if (notFound) return <div className="p-6 text-center text-muted-foreground">ایونتی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <button onClick={() => navigate(`/event-items/${id}`)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به آیتم‌های ایونت
      </button>
      <div>
        <h1 className="text-2xl font-bold">کتگوری آیتم‌های ایونت {event?.title || ''}</h1>
        <p className="text-sm text-muted-foreground mt-1">افزودن و مدیریت کتگوری‌های این ایونت</p>
      </div>
      <StoreCategoryTab
        categories={categories}
        onCategorySubmit={handleCategorySubmit}
        onUpdateCategory={updateCategory}
        onDeleteCategory={deleteCategory}
      />
    </div>
  );
}
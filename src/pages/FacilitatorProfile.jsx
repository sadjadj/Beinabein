import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, User, GraduationCap, Calendar } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';

export default function FacilitatorProfile() {
  const { id } = useParams();
  const [facilitator, setFacilitator] = useState(null);
  const [workshops, setWorkshops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const f = await base44.entities.Facilitator.get(id);
        setFacilitator(f);
        const all = await base44.entities.Workshop.list('-date', 500);
        setWorkshops(all.filter(w => w.facilitator_id === id));
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!facilitator) {
    return <div className="p-6 text-center text-muted-foreground">تسهیلگری یافت نشد</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <Link to="/facilitators" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست
      </Link>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-start gap-4">
          {facilitator.photo_url ? (
            <img src={facilitator.photo_url} alt={facilitator.full_name} className="w-20 h-20 rounded-full object-cover flex-shrink-0" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
              <User className="w-10 h-10 text-gray-700" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-xl font-bold">{facilitator.full_name}</h1>
            {facilitator.bio && <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{facilitator.bio}</p>}
            <p className="text-xs text-gray-700 mt-3 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" /> {toPersianNum(workshops.length)} کارگاه برگزار کرده
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-semibold">کارگاه‌های برگزار شده</h3>
        </div>
        {workshops.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">هنوز کارگاهی برگزار نکرده است</div>
        ) : (
          <div className="divide-y divide-border">
            {workshops.map(w => (
              <div key={w.id} className="p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{w.title}</p>
                  {w.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{w.description}</p>}
                </div>
                <div className="text-left flex-shrink-0">
                  <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                    <Calendar className="w-3.5 h-3.5" /> {new Date(w.date).toLocaleDateString('fa-IR')}
                  </p>
                  <p className="text-xs text-gray-700 mt-1">{toPersianNum(w.participant_count || 0)} شرکت‌کننده</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
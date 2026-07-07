import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Briefcase, Coffee, GraduationCap, PartyPopper, Phone, User, Tag } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { formatJalali, formatJalaliShort } from '@/lib/jalali';

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [data, setData] = useState({ workspaceVisits: [], cafePurchases: [], workshops: [], events: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const p = await base44.entities.Person.get(id);
        setPerson(p);
        const [wsVisits, cafePurchases, workshops, events] = await Promise.all([
          base44.entities.WorkspaceVisit.list('-visit_date', 500),
          base44.entities.CafePurchase.list('-purchase_date', 500),
          base44.entities.Workshop.list('-date', 500),
          base44.entities.BigEvent.list('-date', 500)
        ]);
        setData({ workspaceVisits: wsVisits, cafePurchases, workshops, events });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!person) {
    return <div className="p-6 text-center text-muted-foreground">فردی یافت نشد</div>;
  }

  const phone = person.phone;
  const wsVisits = data.workspaceVisits.filter(v => v.person_phone === phone);
  const cafePurchases = data.cafePurchases.filter(p => p.person_phone === phone);
  const workshops = data.workshops.filter(w => (w.participant_phones || []).includes(phone));
  const events = data.events.filter(e => (e.participant_phones || []).includes(phone));
  const totalCount = wsVisits.length + cafePurchases.length + workshops.length + events.length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/people')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
            <User className="w-8 h-8 text-[#B74B40]" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{person.full_name || 'بدون نام'}</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Phone className="w-3.5 h-3.5" /> {person.phone}
            </p>
            {person.how_met && <p className="text-xs text-muted-foreground mt-1">نحوه آشنایی: {person.how_met}</p>}
            {person.tags && person.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {person.tags.map(tag => <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-[#FBF3EC] text-[#B9834B]">{tag}</span>)}
              </div>
            )}
          </div>
          <div className="mr-auto text-left">
            <p className="text-2xl font-bold text-[#B74B40]">{toPersianNum(totalCount)}</p>
            <p className="text-xs text-muted-foreground">کل خدمات استفاده شده</p>
          </div>
        </div>
        {person.notes && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">{person.notes}</div>
        )}
      </div>

      {wsVisits.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#B74B40]" />
            <h3 className="text-sm font-semibold">فضای کار ({toPersianNum(wsVisits.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {wsVisits.map(v => (
              <div key={v.id} className="p-3 flex items-center justify-between text-sm">
                <span>{formatJalaliShort(v.visit_date)}</span>
                <span className="text-muted-foreground">{v.entry_time || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cafePurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Coffee className="w-4 h-4 text-[#B9834B]" />
            <h3 className="text-sm font-semibold">کافه ({toPersianNum(cafePurchases.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {cafePurchases.map(p => (
              <div key={p.id} className="p-3 flex items-center justify-between text-sm">
                <span>{formatJalaliShort(p.purchase_date)}</span>
                <span className="font-medium">{formatCurrency(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {workshops.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#8CB9C0]" />
            <h3 className="text-sm font-semibold">کارگاه‌ها ({toPersianNum(workshops.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {workshops.map(w => (
              <div key={w.id} className="p-3 flex items-center justify-between text-sm">
                <span className="font-medium">{w.title}</span>
                <span className="text-muted-foreground">{formatJalaliShort(w.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <PartyPopper className="w-4 h-4 text-[#D98B94]" />
            <h3 className="text-sm font-semibold">رویدادها ({toPersianNum(events.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {events.map(e => (
              <div key={e.id} className="p-3 flex items-center justify-between text-sm">
                <span className="font-medium">{e.title}</span>
                <span className="text-muted-foreground">{formatJalaliShort(e.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalCount === 0 && (
        <div className="bg-white rounded-xl border border-border p-8 text-center text-muted-foreground">
          این فرد هنوز از هیچ خدمتی استفاده نکرده است
        </div>
      )}
    </div>
  );
}
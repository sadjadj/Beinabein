import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Phone, User, Pencil, Check, X, GraduationCap, Briefcase, Coffee, Calendar, Trash2 } from 'lucide-react';
import { toPersianNum, formatCurrency } from '@/lib/stats';
import { howMetLabels, genderLabels, paymentMethodLabels, purchaseReasonLabels } from '@/lib/labels';
import HowMetBadge from '@/components/HowMetBadge';
import { formatJalaliShort } from '@/lib/jalali';
import JalaliDateInput from '@/components/JalaliDateInput';

export default function PersonProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [person, setPerson] = useState(null);
  const [data, setData] = useState({ workspaceOrders: [], itemPurchases: [], workshopPurchases: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const p = await base44.entities.Person.get(id);
      setPerson(p);
      const [wsOrders, itemPurchases, workshopPurchases] = await Promise.all([
        base44.entities.WorkspaceOrder.list('-purchase_date', 500),
        base44.entities.ItemPurchase.list('-purchase_date', 500),
        base44.entities.WorkshopPurchase.list('-purchase_date', 500)
      ]);
      setData({ workspaceOrders: wsOrders, itemPurchases, workshopPurchases });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.Person.delete(id);
      navigate(-1);
    } finally { setDeleting(false); }
  };

  const startEdit = () => {
    setEditForm({
      full_name: person.full_name || '', phone: person.phone || '',
      how_met: person.how_met || '', age: person.age || '',
      gender: person.gender || '', first_usage: person.first_usage || '',
      notes: person.notes || '', social_id: person.social_id || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Person.update(id, {
        ...editForm, age: editForm.age ? Number(editForm.age) : null,
        first_usage: editForm.first_usage || null
      });
      setEditing(false);
      fetchData();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!person) return <div className="p-6 text-center text-muted-foreground">فردی یافت نشد</div>;

  const phone = person.phone;
  const wsOrders = data.workspaceOrders.filter(o => o.person_phone === phone);
  const cafePurchases = data.itemPurchases.filter(p => p.person_phone === phone);
  const workshopPurchases = data.workshopPurchases.filter(w => w.person_phone === phone);
  const totalCount = wsOrders.length + cafePurchases.length + workshopPurchases.length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      <div className="bg-white rounded-xl border border-border p-6">
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="نام" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="tel" placeholder="شماره" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <select value={editForm.how_met} onChange={e => setEditForm({ ...editForm, how_met: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">نحوه آشنایی...</option>
                {Object.entries(howMetLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="number" placeholder="سن" value={editForm.age} onChange={e => setEditForm({ ...editForm, age: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <select value={editForm.gender} onChange={e => setEditForm({ ...editForm, gender: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">جنسیت...</option>
                {Object.entries(genderLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" placeholder="آیدی شبکه اجتماعی" value={editForm.social_id} onChange={e => setEditForm({ ...editForm, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <JalaliDateInput value={editForm.first_usage} onChange={v => setEditForm({ ...editForm, first_usage: v })} />
              <textarea placeholder="یادداشت" value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
            </div>
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                <Check className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
              </button>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
                <X className="w-4 h-4" /> انصراف
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8 text-[#B74B40]" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{person.full_name || 'بدون نام'}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1"><Phone className="w-3.5 h-3.5" /> {person.phone}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {person.how_met && <span>نحوه آشنایی: <HowMetBadge value={person.how_met} /></span>}
                {person.age && <span>سن: {toPersianNum(person.age)}</span>}
                {person.gender && <span>جنسیت: {genderLabels[person.gender] || person.gender}</span>}
                {person.first_usage && <span>اولین استفاده: {formatJalaliShort(person.first_usage)}</span>}
                {person.social_id && <span>آیدی: {person.social_id}</span>}
              </div>
            </div>
            <div className="text-left flex flex-col items-end gap-2">
              <div>
                <p className="text-2xl font-bold text-[#B74B40]">{toPersianNum(totalCount)}</p>
                <p className="text-xs text-muted-foreground">کل خدمات</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
                  <Pencil className="w-3.5 h-3.5" /> ویرایش
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'در حال حذف...' : 'حذف'}
                </button>
              </div>
            </div>
          </div>
        )}
        {person.notes && !editing && <div className="mt-4 p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">{person.notes}</div>}
      </div>

      {workshopPurchases.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#8CB9C0]" />
            <h3 className="text-sm font-semibold">کارگاه‌ها ({toPersianNum(workshopPurchases.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {workshopPurchases.map(w => (
              <div key={w.id} className="p-3 flex items-center justify-between text-sm">
                <Link to={`/workshops/${w.workshop_id}`} className="font-medium text-[#B74B40] hover:underline">{w.workshop_title || '-'}</Link>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatJalaliShort(w.purchase_date)}</span>
                  <span className="font-medium">{formatCurrency(w.price)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {wsOrders.length > 0 && (
        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-[#B74B40]" />
            <h3 className="text-sm font-semibold">فضای کار ({toPersianNum(wsOrders.length)})</h3>
          </div>
          <div className="divide-y divide-border">
            {wsOrders.map(o => (
              <div key={o.id} className="p-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">{formatJalaliShort(o.usage_date || o.purchase_date)}</span>
                  {o.entry_time && <span className="text-muted-foreground mr-2">ورود: {o.entry_time}</span>}
                  {o.subscription_name && <span className="text-muted-foreground mr-2">• {o.subscription_name}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{paymentMethodLabels[o.payment_method] || o.payment_method}</span>
                  {o.price > 0 && <span className="font-medium">{formatCurrency(o.price)}</span>}
                </div>
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
                <div>
                  <span className="font-medium">{p.item_name}</span>
                  {p.quantity > 1 && <span className="text-muted-foreground mr-2">×{toPersianNum(p.quantity)}</span>}
                  {p.purchase_reason && <span className="text-xs text-muted-foreground mr-2">• {purchaseReasonLabels[p.purchase_reason] || p.purchase_reason}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{formatJalaliShort(p.purchase_date)}</span>
                  <span className="font-medium">{formatCurrency(p.item_price * p.quantity)}</span>
                </div>
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
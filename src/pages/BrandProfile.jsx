import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Tag, Phone, Pencil, Check, X } from 'lucide-react';
import TagInput from '@/components/TagInput';
import { sanitizePhone } from '@/lib/inputUtils';

export default function BrandProfile() {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [allTags, setAllTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [b, brands] = await Promise.all([
        base44.entities.Brand.get(id),
        base44.entities.Brand.list('-created_date', 500)
      ]);
      setBrand(b);
      const tagSet = new Set();
      brands.forEach(br => (br.collaboration_tags || []).forEach(t => tagSet.add(t)));
      setAllTags([...tagSet]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    setEditForm({
      full_name: brand.full_name || '', phone: brand.phone || '',
      social_id: brand.social_id || '',
      collaboration_tags: brand.collaboration_tags || [],
      product_type: brand.product_type || '', brand_name: brand.brand_name || '',
      description: brand.description || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Brand.update(id, editForm);
      setEditing(false);
      fetchData();
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!brand) return <div className="p-6 text-center text-muted-foreground">برندی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <Link to="/brands" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت به فهرست
      </Link>

      <div className="bg-white rounded-xl border border-border p-6">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام و نام خانوادگی</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">شماره تماس</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: sanitizePhone(e.target.value) })} dir="ltr" placeholder="۰xxxxxxxxxx" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">آیدی شبکه اجتماعی</label>
                <input type="text" value={editForm.social_id} onChange={e => setEditForm({ ...editForm, social_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام برند</label>
                <input type="text" value={editForm.brand_name} onChange={e => setEditForm({ ...editForm, brand_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نوع محصول/اثر</label>
                <input type="text" value={editForm.product_type} onChange={e => setEditForm({ ...editForm, product_type: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-2">تگ‌های همکاری</label>
              <TagInput
                tags={editForm.collaboration_tags || []}
                availableTags={allTags}
                onChange={tags => setEditForm({ ...editForm, collaboration_tags: tags })}
                placeholder="مثلاً هفته دیزاین تهران، افتتاحیه..."
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">توضیحات و معرفی</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={5} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
              <Tag className="w-8 h-8 text-[#B74B40]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold">{brand.full_name}</h1>
              {brand.brand_name && <p className="text-sm text-muted-foreground mt-1">{brand.brand_name}</p>}
              {brand.phone && <p className="text-sm text-muted-foreground flex items-center gap-1 mt-2"><Phone className="w-3.5 h-3.5" /> {brand.phone}</p>}
              {brand.social_id && <p className="text-xs text-muted-foreground mt-1">{brand.social_id}</p>}
              {(brand.collaboration_tags || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {brand.collaboration_tags.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs font-medium">{t}</span>
                  ))}
                </div>
              )}
              {brand.product_type && <p className="text-sm mt-3"><span className="text-muted-foreground">نوع محصول/اثر: </span>{brand.product_type}</p>}
            </div>
            <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex-shrink-0">
              <Pencil className="w-3.5 h-3.5" /> ویرایش
            </button>
          </div>
        )}
      </div>

      {brand.description && !editing && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">توضیحات و معرفی</h3>
          <p className="text-sm leading-relaxed">{brand.description}</p>
        </div>
      )}
    </div>
  );
}
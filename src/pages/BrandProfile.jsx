import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Tag, Phone, Pencil, Check, X } from 'lucide-react';
import { collaborationTypeLabels } from '@/lib/labels';

export default function BrandProfile() {
  const { id } = useParams();
  const [brand, setBrand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const b = await base44.entities.Brand.get(id);
      setBrand(b);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    setEditForm({
      full_name: brand.full_name || '', phone: brand.phone || '',
      social_id: brand.social_id || '', collaboration_type: brand.collaboration_type || '',
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
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="نام و نام خانوادگی" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              <input type="tel" placeholder="شماره تماس" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="آیدی شبکه اجتماعی" value={editForm.social_id} onChange={e => setEditForm({ ...editForm, social_id: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <select value={editForm.collaboration_type} onChange={e => setEditForm({ ...editForm, collaboration_type: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm">
                <option value="">محل همکاری...</option>
                {Object.entries(collaborationTypeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <input type="text" placeholder="نوع محصول/اثر" value={editForm.product_type} onChange={e => setEditForm({ ...editForm, product_type: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <input type="text" placeholder="نام برند" value={editForm.brand_name} onChange={e => setEditForm({ ...editForm, brand_name: e.target.value })} className="px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              <textarea placeholder="توضیحات و معرفی" value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="sm:col-span-2 lg:col-span-3 px-3 py-2 rounded-lg border border-input bg-background text-sm" />
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
            <div className="flex-1">
              <h1 className="text-xl font-bold">{brand.full_name}</h1>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                {brand.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {brand.phone}</span>}
                {brand.brand_name && <span>نام برند: {brand.brand_name}</span>}
                {brand.collaboration_type && <span>محل همکاری: {collaborationTypeLabels[brand.collaboration_type] || brand.collaboration_type}</span>}
                {brand.product_type && <span>نوع محصول: {brand.product_type}</span>}
                {brand.social_id && <span>آیدی: {brand.social_id}</span>}
              </div>
              {brand.description && <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{brand.description}</p>}
            </div>
            <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted">
              <Pencil className="w-3.5 h-3.5" /> ویرایش
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
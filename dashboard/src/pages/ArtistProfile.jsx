import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { ArrowRight, Palette, Phone, Pencil, Check, X, Trash2 } from 'lucide-react';
import { sanitizePhone, sanitizeName } from '@/lib/inputUtils';

export default function ArtistProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [artist, setArtist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const a = await base44.entities.Artist.get(id);
      setArtist(a);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [id]);

  const startEdit = () => {
    setEditForm({
      full_name: artist.full_name || '', phone: artist.phone || '',
      social_id: artist.social_id || '', brand_name: artist.brand_name || '',
      description: artist.description || ''
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await base44.entities.Artist.update(id, editForm);
      navigate('/artists');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    await base44.entities.Artist.delete(id);
    navigate('/artists');
  };

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#B74B40] rounded-full animate-spin"></div></div>;
  if (!artist) return <div className="p-6 text-center text-muted-foreground">آرتیستی یافت نشد</div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowRight className="w-4 h-4" /> بازگشت
      </button>

      <div className="bg-white rounded-xl border border-border p-8">
        {editing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام و نام خانوادگی</label>
                <input type="text" value={editForm.full_name} onChange={e => setEditForm({ ...editForm, full_name: sanitizeName(e.target.value) })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" required />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">شماره تماس</label>
                <input type="tel" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: sanitizePhone(e.target.value) })} dir="ltr" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm text-right" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">آیدی شبکه اجتماعی</label>
                <input type="text" value={editForm.social_id} onChange={e => setEditForm({ ...editForm, social_id: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">نام برند</label>
                <input type="text" value={editForm.brand_name} onChange={e => setEditForm({ ...editForm, brand_name: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">توضیحات و معرفی شخصیت</label>
              <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={6} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm" placeholder="معرفی کامل شخصیت، سبک کار، سوابق هنری..." />
            </div>
            <div className="flex justify-between gap-2">
              <button onClick={handleDelete} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> حذف
              </button>
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#B74B40] text-white text-sm font-medium hover:bg-[#A03D34] disabled:opacity-50">
                  <Check className="w-4 h-4" /> {saving ? 'در حال ذخیره...' : 'ذخیره'}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1 px-4 py-2 rounded-lg border border-border text-sm">
                  <X className="w-4 h-4" /> انصراف
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-[#FDF2F1] flex items-center justify-center flex-shrink-0">
              <Palette className="w-10 h-10 text-[#B74B40]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold">{artist.full_name}</h1>
              {artist.brand_name && <p className="text-sm text-muted-foreground mt-1">{artist.brand_name}</p>}
              <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
                {artist.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {artist.phone}</span>}
                {artist.social_id && <span>{artist.social_id}</span>}
              </div>
            </div>
            <button onClick={startEdit} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted flex-shrink-0">
              <Pencil className="w-3.5 h-3.5" /> ویرایش
            </button>
          </div>
        )}
      </div>

      {!editing && (
        <div className="bg-white rounded-xl border border-border p-6">
          <h3 className="text-sm font-semibold mb-3 text-muted-foreground">درباره هنرمند</h3>
          <p className="text-sm leading-relaxed">{artist.description || 'توضیحاتی ثبت نشده است.'}</p>
        </div>
      )}
    </div>
  );
}
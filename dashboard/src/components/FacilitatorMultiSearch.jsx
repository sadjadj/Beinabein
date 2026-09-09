import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';

export default function FacilitatorMultiSearch({ selectedIds = [], onChange }) {
  const [facilitators, setFacilitators] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Facilitator.list('-created_date', 500).then(setFacilitators);
  }, []);

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const selected = facilitators.filter(f => selectedIds.includes(f.id));
  const filtered = facilitators.filter(f =>
    !search || (f.full_name || '').toLowerCase().includes(search.toLowerCase().trim())
  );

  const toggle = (fid) => {
    if (selectedIds.includes(fid)) {
      onChange(selectedIds.filter(id => id !== fid));
    } else {
      onChange([...selectedIds, fid]);
    }
  };

  return (
    <div className="relative" ref={ref}>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selected.map(f => (
            <span key={f.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs font-medium">
              {f.full_name}
              <button type="button" onClick={() => toggle(f.id)} className="hover:text-[#A03D34]"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="جستجوی نام تسهیلگر..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="pr-9 pl-3 py-2 rounded-lg border border-input bg-background text-sm w-full"
        />
      </div>
      {open && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-full max-h-56 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-3 text-center text-sm text-muted-foreground">تسهیلگری یافت نشد</div>
          ) : (
            filtered.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.id)}
                className={`w-full text-right px-3 py-2 border-b border-border last:border-b-0 text-sm transition-colors ${
                  selectedIds.includes(f.id) ? 'bg-[#FDF2F1] text-[#B74B40] font-medium' : 'hover:bg-muted'
                }`}
              >
                {f.full_name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
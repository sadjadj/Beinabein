import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search } from 'lucide-react';

export default function FacilitatorSearch({ value, onChange, placeholder = 'انتخاب تسهیلگر' }) {
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

  const selected = facilitators.find(f => f.id === value);
  const filtered = facilitators.filter(f =>
    !search || (f.full_name || '').toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-full text-right min-w-[160px]"
      >
        {selected ? selected.full_name : placeholder}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-64 max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border relative">
            <Search className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجوی تسهیلگر..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="pr-8 pl-2 py-1.5 rounded-lg border border-input bg-background text-sm w-full"
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-3 text-center text-sm text-muted-foreground">تسهیلگری یافت نشد</div>
            ) : (
              filtered.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => { onChange(f.id); setOpen(false); setSearch(''); }}
                  className="w-full text-right px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 text-sm"
                >
                  {f.full_name}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
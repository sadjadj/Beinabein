import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export default function WorkshopSearchSelect({ workshops, value, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = workshops.find(w => w.id === value);

  useEffect(() => {
    if (selected) setQuery(selected.title);
    else setQuery('');
  }, [value, selected]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const matches = query
    ? workshops.filter(w => (w.title || '').toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : workshops.slice(0, 8);

  const selectWorkshop = (w) => {
    onChange(w.id);
    setQuery(w.title);
    setOpen(false);
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div className="relative w-full" ref={ref}>
      <div className="flex items-center w-full px-3 py-2 rounded-lg border border-input bg-background focus-within:border-[#B74B40]">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0 ml-2" />
        <input
          type="text"
          placeholder="جستجوی نام کارگاه..."
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); if (selected) onChange(''); }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-sm outline-none min-w-0"
        />
        {selected ? (
          <button type="button" onClick={clearSelection} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        )}
      </div>
      {open && (
        <div className="absolute z-30 top-full mt-1 right-0 left-0 bg-white border border-border rounded-lg shadow-lg max-h-56 overflow-y-auto">
          {matches.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">کارگاهی یافت نشد</div>
          ) : (
            matches.map(w => (
              <button
                key={w.id}
                type="button"
                onMouseDown={() => selectWorkshop(w)}
                className={`w-full text-right px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 text-sm ${value === w.id ? 'bg-[#FDF2F1] text-[#B74B40] font-medium' : ''}`}
              >
                <span>{w.title}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
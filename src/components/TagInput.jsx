import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

export default function TagInput({ tags = [], availableTags = [], onChange, placeholder = 'افزودن تگ...' }) {
  const [input, setInput] = useState('');
  const [showSuggest, setShowSuggest] = useState(false);

  const addTag = (tag) => {
    const t = tag.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput('');
  };

  const removeTag = (tag) => {
    onChange(tags.filter(t => t !== tag));
  };

  const filtered = availableTags.filter(t =>
    t.toLowerCase().includes(input.toLowerCase()) && !tags.includes(t)
  );

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FDF2F1] text-[#B74B40] text-xs font-medium">
            {t}
            <button type="button" onClick={() => removeTag(t)} className="hover:text-[#A03D34]">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          placeholder={placeholder}
          value={input}
          onChange={e => setInput(e.target.value)}
          onFocus={() => setShowSuggest(true)}
          onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (input.trim()) addTag(input);
            }
          }}
          className="w-full px-3 py-2 pl-8 rounded-lg border border-input bg-background text-sm"
        />
        {input.trim() && (
          <button
            type="button"
            onMouseDown={() => addTag(input)}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-[#B74B40] hover:text-[#A03D34]"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {showSuggest && filtered.length > 0 && (
          <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-full max-h-32 overflow-y-auto">
            {filtered.map(t => (
              <button
                key={t}
                type="button"
                onMouseDown={() => addTag(t)}
                className="w-full text-right px-3 py-1.5 hover:bg-muted text-sm border-b border-border last:border-b-0"
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
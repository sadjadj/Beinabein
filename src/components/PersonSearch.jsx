import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { sanitizePhone, sanitizeName } from '@/lib/inputUtils';

export default function PersonSearch({ personName, personPhone, onNameChange, onPhoneChange, onPersonFound }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!personName || personName.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const all = await base44.entities.Person.list('-created_date', 500);
        const matches = all
          .filter(p => p.full_name && p.full_name.toLowerCase().includes(personName.trim().toLowerCase()))
          .slice(0, 6);
        setSuggestions(matches);
        setShowSuggestions(matches.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [personName]);

  const selectPerson = (person) => {
    onNameChange(person.full_name || '');
    onPhoneChange(person.phone || '');
    onPersonFound?.(person);
    setShowSuggestions(false);
  };

  const clearPhone = () => {
    onPhoneChange('');
  };

  const isLocked = !!personPhone;

  return (
    <div className="flex flex-col gap-2 flex-shrink-0">
      <div className="relative">
        <input
          type="text"
          placeholder="نام مشتری"
          value={personName}
          onChange={e => onNameChange(sanitizeName(e.target.value))}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
        />
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-30 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-56 max-h-48 overflow-y-auto">
            {suggestions.map(p => (
              <button
                key={p.id}
                type="button"
                onMouseDown={() => selectPerson(p)}
                className="w-full text-right px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 text-sm"
              >
                <span className="font-medium">{p.full_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="relative">
        <label className="text-xs text-muted-foreground block mb-1">شماره تلفن</label>
        <input
          type="tel"
          placeholder="۰xxxxxxxxxx"
          value={personPhone}
          onChange={e => onPhoneChange(sanitizePhone(e.target.value))}
          readOnly={isLocked}
          required
          dir="ltr"
          className={`w-full px-3 py-2 pl-8 rounded-lg border border-input bg-background text-sm text-right ${isLocked ? 'bg-muted/50 cursor-not-allowed' : ''}`}
        />
        {isLocked && (
          <button type="button" onClick={clearPhone} className="absolute left-2 top-[calc(50%+12px)] -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X } from 'lucide-react';

export default function PersonSearch({ personName, personPhone, onNameChange, onPhoneChange, onPersonFound }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

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
          .slice(0, 5);
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

  return (
    <div className="relative flex-shrink-0">
      <input
        ref={inputRef}
        type="text"
        placeholder="نام مشتری"
        value={personName}
        onChange={e => onNameChange(e.target.value)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="px-3 py-2 rounded-lg border border-input bg-background text-sm w-44"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 top-full mt-1 right-0 bg-white border border-border rounded-lg shadow-lg w-56 max-h-48 overflow-y-auto">
          {suggestions.map(p => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => selectPerson(p)}
              className="w-full text-right px-3 py-2 hover:bg-muted border-b border-border last:border-b-0 text-sm"
            >
              <span className="font-medium">{p.full_name}</span>
              <span className="text-muted-foreground mr-2 text-xs">{p.phone}</span>
            </button>
          ))}
        </div>
      )}
      <input
        type="tel"
        placeholder="شماره تلفن"
        value={personPhone}
        onChange={e => onPhoneChange(e.target.value)}
        required
        className="mt-2 px-3 py-2 rounded-lg border border-input bg-background text-sm w-44"
      />
      {personPhone && (
        <button type="button" onClick={clearPhone} className="absolute left-2 bottom-2.5 text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
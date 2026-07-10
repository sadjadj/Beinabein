import React, { useState, useEffect } from 'react';
import { persianToEnglish } from '@/lib/inputUtils';

export default function PriceInput({ value, onChange, placeholder = 'قیمت به تومان', required }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplay(Number(value).toLocaleString('en-US'));
    } else {
      setDisplay('');
    }
  }, [value]);

  const handleChange = (e) => {
    const raw = persianToEnglish(e.target.value).replace(/[^0-9]/g, '');
    if (raw === '') {
      setDisplay('');
      onChange('');
      return;
    }
    setDisplay(Number(raw).toLocaleString('en-US'));
    onChange(Number(raw));
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={display}
      onChange={handleChange}
      required={required}
      dir="ltr"
      className="px-3 py-2 rounded-lg border border-input bg-background text-sm text-right"
    />
  );
}
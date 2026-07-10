import React, { useState, useEffect } from 'react';
import { persianToEnglish } from '@/lib/inputUtils';

export default function PersianNumberInput({ value, onChange, placeholder, required, className = '', dir = 'ltr' }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    if (value !== undefined && value !== null && value !== '') {
      setDisplay(String(value));
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
    setDisplay(raw);
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
      className={className}
      dir={dir}
    />
  );
}
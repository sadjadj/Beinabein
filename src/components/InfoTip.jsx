import React, { useState } from 'react';
import { Info } from 'lucide-react';

export default function InfoTip({ text, className = '' }) {
  const [show, setShow] = useState(false);
  if (!text) return null;
  return (
    <span className={`relative inline-flex ${className}`}>
      <Info
        className="w-3.5 h-3.5 text-muted-foreground/60 hover:text-muted-foreground cursor-help"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onTouchStart={() => setShow(s => !s)}
      />
      {show && (
        <span className="absolute z-40 bottom-full mb-2 right-0 w-56 bg-gray-800 text-white text-xs rounded-lg p-2.5 shadow-lg leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}
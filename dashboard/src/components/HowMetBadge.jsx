import React from 'react';
import { howMetLabels, howMetColors } from '@/lib/labels';

export default function HowMetBadge({ value }) {
  if (!value || !howMetLabels[value]) return <span className="text-xs text-muted-foreground">-</span>;
  const color = howMetColors[value] || howMetColors.other;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${color}`}>
      {howMetLabels[value]}
    </span>
  );
}
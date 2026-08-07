import React from 'react';
import { formatJalaliFull } from '@/lib/jalali';

export default function ChartTooltip({ active, payload, label, unitLabel, formatter }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-medium text-foreground mb-1">{formatJalaliFull(label)}</p>
      <p className="text-muted-foreground">{unitLabel}: <span className="font-medium text-foreground">{formatter(payload[0].value)}</span></p>
    </div>
  );
}
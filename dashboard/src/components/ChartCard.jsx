import React from 'react';
import InfoTip from '@/components/InfoTip';

export default function ChartCard({ title, info, todayLabel, todayValue, children }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          {title}
          <InfoTip text={info} />
        </h3>
        {todayLabel && todayValue !== undefined && (
          <div className="text-left">
            <span className="text-xs text-muted-foreground">{todayLabel}: </span>
            <span className="text-sm font-bold text-[#B74B40]">{todayValue}</span>
          </div>
        )}
      </div>
      {children}
    </div>
  );
}
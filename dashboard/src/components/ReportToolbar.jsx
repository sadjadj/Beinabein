import React from 'react';
import JalaliDateInput from '@/components/JalaliDateInput';
import { RANGE_PRESETS } from '@/lib/reportUtils';

export default function ReportToolbar({ rangePreset, setRangePreset, customStart, setCustomStart, customEnd, setCustomEnd }) {
  return (
    <div className="bg-white rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {RANGE_PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => setRangePreset(p.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${rangePreset === p.key ? 'bg-[#B74B40] text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {rangePreset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">از تاریخ</label>
            <JalaliDateInput value={customStart} onChange={setCustomStart} showToday={false} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">تا تاریخ</label>
            <JalaliDateInput value={customEnd} onChange={setCustomEnd} showToday={true} />
          </div>
        </div>
      )}
    </div>
  );
}
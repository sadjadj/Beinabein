import React from 'react';

const colorMap = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  green: { bg: 'bg-green-50', text: 'text-green-600' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

export default function StatCard({ label, value, sublabel, icon: Icon, color = 'amber' }) {
  const c = colorMap[color] || colorMap.amber;
  return (
    <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl lg:text-3xl font-bold mt-2 text-foreground break-words">{value}</p>
          {sublabel && <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>}
        </div>
        {Icon && (
          <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${c.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}
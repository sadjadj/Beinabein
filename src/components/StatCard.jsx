import React from 'react';

const colorMap = {
  terracotta: { bg: 'bg-[#FDF2F1]', text: 'text-[#B74B40]' },
  pink: { bg: 'bg-[#FBF0F1]', text: 'text-[#D98B94]' },
  ochre: { bg: 'bg-[#FBF3EC]', text: 'text-[#B9834B]' },
  teal: { bg: 'bg-[#F0F7F8]', text: 'text-[#8CB9C0]' },
  dark: { bg: 'bg-gray-100', text: 'text-gray-700' },
  amber: { bg: 'bg-[#FBF3EC]', text: 'text-[#B9834B]' },
  blue: { bg: 'bg-[#F0F7F8]', text: 'text-[#8CB9C0]' },
  green: { bg: 'bg-[#F0F7F8]', text: 'text-[#5A9A8E]' },
  purple: { bg: 'bg-[#FBF0F1]', text: 'text-[#D98B94]' },
};

export default function StatCard({ label, value, sublabel, icon: Icon, color = 'terracotta' }) {
  const c = colorMap[color] || colorMap.terracotta;
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
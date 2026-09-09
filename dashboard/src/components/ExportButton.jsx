import React from 'react';
import { Download } from 'lucide-react';
import { exportToExcel } from '@/lib/exportExcel';

export default function ExportButton({ filename, columns, rows, label = 'خروجی اکسل' }) {
  return (
    <button
      onClick={() => exportToExcel(filename, columns, rows)}
      className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border bg-white text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground flex-shrink-0"
    >
      <Download className="w-4 h-4" /> <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
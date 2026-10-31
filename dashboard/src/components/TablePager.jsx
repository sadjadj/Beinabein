import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toPersianNum } from '@/lib/stats';

export const PAGE_SIZE = 50;

// Shows one page of an already searched/filtered/sorted list. Pass the search,
// filter and sort values as resetKey so changing any of them goes back to page 1.
export function usePaged(rows, resetKey, size = PAGE_SIZE) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [resetKey]);
  const totalPages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(page, totalPages);
  return { pageRows: rows.slice((safePage - 1) * size, safePage * size), page: safePage, totalPages, setPage };
}

// 1 … 4 5 6 … 12: first, last, and the pages around the current one.
function pageList(page, total) {
  const keep = new Set([1, total, page - 1, page, page + 1].filter(p => p >= 1 && p <= total));
  const sorted = [...keep].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…', p] : [p]));
}

export default function TablePager({ page, totalPages, setPage }) {
  const ref = useRef(null);
  if (totalPages <= 1) return null;
  const go = (p) => {
    setPage(p);
    // Back to the top of this table, not wherever the long page was scrolled to.
    ref.current?.parentElement?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };
  const btn = 'min-w-8 h-8 px-2 rounded-lg border text-sm flex items-center justify-center';
  return (
    <nav ref={ref} aria-label="صفحه‌ها" className="flex items-center justify-center gap-1.5 p-4 border-t border-border flex-wrap">
      <button onClick={() => go(page - 1)} disabled={page === 1} aria-label="صفحه قبل" className={`${btn} border-border hover:bg-muted disabled:opacity-30`}>
        <ChevronRight className="w-4 h-4" />
      </button>
      {pageList(page, totalPages).map((p, i) => p === '…'
        ? <span key={`gap${i}`} className="px-1 text-muted-foreground">…</span>
        : (
          <button key={p} onClick={() => go(p)} aria-current={p === page ? 'page' : undefined}
            className={`${btn} ${p === page ? 'bg-[#B74B40] border-[#B74B40] text-white' : 'border-border hover:bg-muted'}`}>
            {toPersianNum(p)}
          </button>
        ))}
      <button onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="صفحه بعد" className={`${btn} border-border hover:bg-muted disabled:opacity-30`}>
        <ChevronLeft className="w-4 h-4" />
      </button>
    </nav>
  );
}

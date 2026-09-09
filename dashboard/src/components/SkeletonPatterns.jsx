import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export { Skeleton };

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <Skeleton className="h-3 w-24 mb-3" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-12 mt-2" />
    </div>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-3 p-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-border p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="w-12 h-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="mt-4 pt-3 border-t border-border">
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
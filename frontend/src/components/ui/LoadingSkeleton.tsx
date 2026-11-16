import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={`animate-pulse bg-gray-800/80 rounded-xl ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
};

export interface LoadingSkeletonProps {
  variant?: 'card' | 'table' | 'text' | 'avatar' | 'rect';
  count?: number;
  className?: string;
  rows?: number;
  columns?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'card',
  count = 1,
  className = '',
  rows = 4,
  columns = 4,
}) => {
  if (variant === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${className}`}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl bg-[#131B2E] border border-[#1E293B] space-y-4"
            aria-busy="true"
            aria-label="Loading card content"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <Skeleton className="w-16 h-6 rounded-full" />
            </div>
            <Skeleton className="w-3/4 h-6 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="w-full h-4 rounded-md" />
              <Skeleton className="w-5/6 h-4 rounded-md" />
            </div>
            <div className="pt-2 flex justify-end">
              <Skeleton className="w-24 h-9 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'table') {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl border border-[#1E293B] bg-[#131B2E] p-4 space-y-4 ${className}`}
        aria-busy="true"
        aria-label="Loading table content"
      >
        {/* Table Header Placeholder */}
        <div className="grid gap-4 py-2 border-b border-[#1E293B]" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, col) => (
            <Skeleton key={col} className="h-5 rounded-md" />
          ))}
        </div>
        {/* Table Rows Placeholder */}
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="grid gap-4 py-3 border-b border-gray-800/40 last:border-b-0"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, col) => (
              <Skeleton
                key={col}
                className={`h-4 rounded-md ${col === 0 ? 'w-4/5' : col === columns - 1 ? 'w-2/3' : 'w-full'}`}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (variant === 'avatar') {
    return (
      <div className={`flex items-center gap-3 ${className}`} aria-busy="true">
        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="w-32 h-4 rounded-md" />
          <Skeleton className="w-24 h-3 rounded-md" />
        </div>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={`space-y-2.5 ${className}`} aria-busy="true">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            className={`h-4 rounded-md ${
              i === count - 1 && count > 1 ? 'w-3/5' : 'w-full'
            }`}
          />
        ))}
      </div>
    );
  }

  return <Skeleton className={`w-full h-24 rounded-2xl ${className}`} />;
};

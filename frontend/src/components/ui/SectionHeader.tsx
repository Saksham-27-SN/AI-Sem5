import React from 'react';

export interface SectionHeaderProps {
  badge?: string;
  badgeVariant?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'gray';
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  action?: React.ReactNode;
  className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  badge,
  badgeVariant = 'blue',
  title,
  subtitle,
  align = 'center',
  action,
  className = '',
}) => {
  const badgeColors = {
    blue: 'bg-blue-500/15 border-blue-400/40 text-blue-300',
    indigo: 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300',
    purple: 'bg-purple-500/15 border-purple-400/40 text-purple-300',
    emerald: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
    amber: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
    rose: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
    gray: 'bg-gray-800 border-gray-700 text-gray-200',
  };

  const isCenter = align === 'center';

  return (
    <div
      className={`w-full flex flex-col md:flex-row md:items-end justify-between gap-4 ${
        isCenter ? 'text-center items-center' : 'text-left'
      } ${className}`}
    >
      <div className={`max-w-3xl ${isCenter ? 'mx-auto' : ''}`}>
        {badge && (
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold mb-3 ${badgeColors[badgeVariant]}`}
          >
            <span>{badge}</span>
          </div>
        )}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-tight">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-2.5 text-sm sm:text-base text-gray-300 leading-relaxed max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="shrink-0 mt-3 md:mt-0">{action}</div>}
    </div>
  );
};

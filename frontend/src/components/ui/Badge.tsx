import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose' | 'gray';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'blue',
  size = 'md',
  dot = false,
  className = '',
  ...props
}) => {
  const variants = {
    blue: 'bg-blue-500/15 border-blue-400/40 text-blue-300',
    indigo: 'bg-indigo-500/15 border-indigo-400/40 text-indigo-300',
    purple: 'bg-purple-500/15 border-purple-400/40 text-purple-300',
    emerald: 'bg-emerald-500/15 border-emerald-400/40 text-emerald-300',
    amber: 'bg-amber-500/15 border-amber-400/40 text-amber-300',
    rose: 'bg-rose-500/15 border-rose-400/40 text-rose-300',
    gray: 'bg-gray-800 border-gray-700 text-gray-200',
  };

  const dotColors = {
    blue: 'bg-blue-400',
    indigo: 'bg-indigo-400',
    purple: 'bg-purple-400',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400',
    rose: 'bg-rose-400',
    gray: 'bg-gray-400',
  };

  const sizes = {
    sm: 'text-xs px-2.5 py-0.5 gap-1.5',
    md: 'text-sm px-3 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full border ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]} shrink-0`} aria-hidden="true" />}
      <span>{children}</span>
    </span>
  );
};

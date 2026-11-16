import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glow' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  tabIndex,
  ...props
}) => {
  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const variants = {
    default:
      'bg-[#131B2E] border border-[#1E293B] rounded-2xl shadow-sm text-gray-100',
    glow:
      'glow-card rounded-2xl text-gray-100',
    interactive:
      'bg-[#131B2E] border border-[#1E293B] hover:border-blue-500/50 hover:bg-[#1A253D] rounded-2xl transition-all duration-150 cursor-pointer shadow-sm text-gray-100 hover:shadow-lg hover:shadow-blue-500/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
  };

  return (
    <div
      className={`${variants[variant]} ${paddings[padding]} ${className}`}
      tabIndex={variant === 'interactive' && tabIndex === undefined ? 0 : tabIndex}
      {...props}
    >
      {children}
    </div>
  );
};

import React from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
  children?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  children,
  className = '',
}) => {
  return (
    <div
      className={`w-full flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-[#131B2E] border border-[#1E293B] shadow-sm ${className}`}
    >
      {/* Icon with glowing aura */}
      <div className="w-14 h-14 rounded-2xl bg-blue-600/15 border border-blue-500/30 text-blue-400 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/10">
        {icon || <Sparkles className="w-6 h-6" />}
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm sm:text-base text-gray-300 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {/* Primary CTA */}
      {action && (
        <div>
          {action.href ? (
            <a href={action.href}>
              <Button variant="primary" leftIcon={action.icon}>
                {action.label}
              </Button>
            </a>
          ) : (
            <Button
              variant="primary"
              onClick={action.onClick}
              leftIcon={action.icon}
            >
              {action.label}
            </Button>
          )}
        </div>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

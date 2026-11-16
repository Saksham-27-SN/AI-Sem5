import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
  children,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`w-full flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl bg-[#131B2E] border border-rose-500/30 shadow-sm ${className}`}
    >
      {/* Alert Icon with Rose aura */}
      <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
        {icon || <AlertTriangle className="w-6 h-6" />}
      </div>

      {/* Title */}
      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight mb-2">
        {title}
      </h3>

      {/* Error Message */}
      <p className="text-sm sm:text-base text-gray-300 max-w-md mb-6 leading-relaxed">
        {message}
      </p>

      {/* Retry Action */}
      {onRetry && (
        <Button
          variant="primary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-4 h-4" />}
        >
          {retryLabel}
        </Button>
      )}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};

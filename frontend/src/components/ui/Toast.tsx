import React from 'react';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id?: string;
  type?: ToastVariant;
  title: string;
  message?: string;
  onDismiss?: (id?: string) => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type = 'info',
  title,
  message,
  onDismiss,
  className = '',
}) => {
  const getIcon = (t: ToastVariant) => {
    switch (t) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" aria-hidden="true" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" aria-hidden="true" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" aria-hidden="true" />;
    }
  };

  const getBorderColor = (t: ToastVariant) => {
    switch (t) {
      case 'success':
        return 'border-emerald-500/40 bg-[#131B2E] shadow-emerald-500/10';
      case 'error':
        return 'border-rose-500/40 bg-[#131B2E] shadow-rose-500/10';
      case 'warning':
        return 'border-amber-500/40 bg-[#131B2E] shadow-amber-500/10';
      default:
        return 'border-blue-500/40 bg-[#131B2E] shadow-blue-500/10';
    }
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-start justify-between gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-200 text-left ${getBorderColor(
        type
      )} ${className}`}
    >
      <div className="flex items-start gap-3">
        {getIcon(type)}
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-white">{title}</p>
          {message && (
            <p className="text-sm text-gray-300 leading-relaxed">{message}</p>
          )}
        </div>
      </div>
      {onDismiss && (
        <button
          onClick={() => onDismiss(id)}
          className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800/80 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

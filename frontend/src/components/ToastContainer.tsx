// src/components/ToastContainer.tsx
import React from 'react';
import { useToast } from '../context/ToastContext';
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-emerald-500/40 bg-emerald-950/40';
      case 'error':
        return 'border-rose-500/40 bg-rose-950/40';
      case 'warning':
        return 'border-amber-500/40 bg-amber-950/40';
      default:
        return 'border-blue-500/40 bg-blue-950/40';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start justify-between gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl transition-all duration-300 animate-slide-in ${getBorderColor(
            toast.type
          )}`}
        >
          <div className="flex items-start gap-3">
            {getIcon(toast.type)}
            <div>
              <p className="text-sm font-semibold text-white">{toast.title}</p>
              {toast.message && (
                <p className="text-xs text-gray-300 mt-0.5 leading-relaxed">{toast.message}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Dismiss toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

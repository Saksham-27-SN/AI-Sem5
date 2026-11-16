// src/components/ToastContainer.tsx
import React from 'react';
import { useToast } from '../context/ToastContext';
import { Toast } from './ui/Toast';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      aria-label="Notification Center"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast
            id={toast.id}
            type={toast.type}
            title={toast.title}
            message={toast.message}
            onDismiss={() => dismissToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

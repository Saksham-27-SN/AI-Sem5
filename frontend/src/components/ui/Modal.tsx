import React, { useEffect, useId } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdrop = true,
  className = '',
}) => {
  const baseId = useId();
  const titleId = title ? `${baseId}-title` : undefined;
  const descId = description ? `${baseId}-desc` : undefined;

  // Handle Escape key & body overflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Accessible Backdrop Blur */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity duration-200"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        className={`relative w-full ${sizes[size]} bg-[#131B2E] border border-[#1E293B] rounded-2xl shadow-2xl z-10 overflow-hidden flex flex-col text-left transition-all duration-200 ${className}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-[#1E293B]">
          <div className="space-y-1 pr-6">
            {title && (
              <h3 id={titleId} className="text-xl font-bold text-white tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p id={descId} className="text-sm text-gray-300 leading-relaxed">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/80 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-140px)] text-sm text-gray-200 leading-relaxed">
          {children}
        </div>

        {/* Optional Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-4 sm:p-5 border-t border-[#1E293B] bg-[#0B0F19]/60">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

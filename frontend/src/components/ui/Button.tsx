import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary:
      'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 border border-blue-400/30 focus-visible:ring-blue-500 active:scale-[0.98]',
    secondary:
      'bg-[#131B2E] hover:bg-[#1A253D] text-gray-200 hover:text-white border border-[#1E293B] hover:border-gray-600 focus-visible:ring-indigo-500 shadow-sm active:scale-[0.98]',
    ghost:
      'bg-transparent hover:bg-gray-800/60 text-gray-300 hover:text-white border border-transparent focus-visible:ring-gray-500 active:scale-[0.98]',
    danger:
      'bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 border border-red-500/40 hover:border-red-500/60 focus-visible:ring-red-500 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'text-sm px-3.5 py-1.5 gap-1.5 rounded-xl',
    md: 'text-sm px-5 py-2.5 gap-2 rounded-xl',
    lg: 'text-base px-6 py-3.5 gap-2.5 rounded-xl',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" aria-hidden="true" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  disabled,
  ...props
}) => {
  const generatedId = React.useId();
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : generatedId);
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-gray-200">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        <input
          id={inputId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full bg-[#131B2E] border ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#1E293B] hover:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          } rounded-xl text-gray-100 placeholder-gray-500 text-sm py-2.5 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
            {rightIcon}
          </span>
        )}
      </div>
      {error && (
        <p id={errorId} className="text-sm text-red-400 font-medium" role="alert">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={helperId} className="text-sm text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

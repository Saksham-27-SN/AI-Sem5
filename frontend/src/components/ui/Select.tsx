import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: SelectOption[];
  placeholder?: string;
  leftIcon?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options = [],
  placeholder,
  leftIcon,
  className = '',
  id,
  children,
  disabled,
  ...props
}) => {
  const generatedId = React.useId();
  const selectId = id || (label ? `select-${label.toLowerCase().replace(/[^a-z0-9]/g, '-')}` : generatedId);
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText ? `${selectId}-helper` : undefined;
  const describedBy = error ? errorId : helperId;

  return (
    <div className="w-full space-y-1.5 text-left">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-semibold text-gray-200">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <span className="absolute left-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
            {leftIcon}
          </span>
        )}
        <select
          id={selectId}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={describedBy}
          className={`w-full appearance-none bg-[#131B2E] border ${
            error
              ? 'border-red-500/80 focus:border-red-500 focus:ring-red-500/20'
              : 'border-[#1E293B] hover:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
          } rounded-xl text-gray-100 text-sm py-2.5 ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } pr-10 transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="bg-[#131B2E] text-gray-500">
              {placeholder}
            </option>
          )}
          {options.length > 0
            ? options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="bg-[#131B2E] text-gray-100 py-1.5"
                >
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <span className="absolute right-3.5 text-gray-400 pointer-events-none flex items-center justify-center">
          <ChevronDown className="w-4 h-4" />
        </span>
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

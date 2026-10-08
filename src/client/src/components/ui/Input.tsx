import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { FiEye, FiEyeOff, FiX } from 'react-icons/fi';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  clearable?: boolean;
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      clearable = false,
      type = 'text',
      className = '',
      disabled,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const showClear = clearable && value && !disabled;

    const handleClear = () => {
      if (onChange) {
        onChange({ target: { value: '' } } as React.ChangeEvent<HTMLInputElement>);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-secondary-300 mb-1.5">
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary-500">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            value={value}
            onChange={onChange}
            disabled={disabled}
            className={`w-full bg-secondary-900 border border-secondary-700 rounded-lg
              ${leftIcon ? 'pl-10' : 'pl-3'}
              ${(rightIcon || showClear || isPassword) ? 'pr-10' : 'pr-3'}
              py-2.5 text-white placeholder-secondary-500
              focus:outline-none focus:ring-1 focus:ring-primary-500
              disabled:opacity-50 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500' : ''}
              ${className}`}
            {...props}
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {isPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-secondary-500 hover:text-white transition-colors p-0.5"
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            )}

            {showClear && (
              <button
                type="button"
                onClick={handleClear}
                className="text-secondary-500 hover:text-white transition-colors p-0.5"
              >
                <FiX size={16} />
              </button>
            )}

            {rightIcon && !showClear && !isPassword && (
              <span className="text-secondary-500">{rightIcon}</span>
            )}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500 mt-1">{error}</p>
        )}

        {hint && !error && (
          <p className="text-sm text-secondary-500 mt-1">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;

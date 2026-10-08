import { forwardRef, ButtonHTMLAttributes } from 'react';
import { FiLoader2 } from 'react-icons/fi';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      inline-flex items-center justify-center font-medium transition-colors duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-secondary-950
      disabled:opacity-50 disabled:cursor-not-allowed
    `;

    const variants = {
      primary: `
        bg-primary-600 text-white
        hover:bg-primary-500 active:bg-primary-700
        focus:ring-primary-500
      `,
      secondary: `
        bg-secondary-800 text-secondary-50
        hover:bg-secondary-700 active:bg-secondary-900
        focus:ring-secondary-500
      `,
      ghost: `
        text-secondary-400
        hover:text-secondary-50 hover:bg-secondary-800/50
        focus:ring-secondary-500
      `,
      danger: `
        bg-red-600 text-white
        hover:bg-red-500 active:bg-red-700
        focus:ring-red-500
      `,
      outline: `
        border border-secondary-600 text-secondary-300
        hover:bg-secondary-800/50 active:bg-secondary-800
        focus:ring-secondary-500
      `,
    };

    const sizes = {
      sm: 'px-2 py-1 text-sm gap-1.5',
      md: 'px-4 py-2 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2.5',
    };

    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <>
            <FiLoader2 className="animate-spin" size={14} />
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex items-center">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex items-center">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;

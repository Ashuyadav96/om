import { FiLoader2 } from 'react-icons/fi';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  text?: string;
}

const sizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export const LoadingSpinner = ({
  size = 'md',
  className = '',
  text,
}: LoadingSpinnerProps) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      <FiLoader2 
        className={`animate-spin ${sizes[size]} ${className}`}
        aria-label="Loading"
      />
      {text && (
        <span className="text-sm text-secondary-400">{text}</span>
      )}
    </div>
  );
};

export const FullPageLoading = ({
  message = 'Loading...',
}: {
  message?: string;
}) => {
  return (
    <div className="fixed inset-0 bg-secondary-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-50">
      <LoadingSpinner size="xl" />
      <p className="text-white mt-4">{message}</p>
    </div>
  );
};

export const LoadingOverlay = ({
  isLoading,
  message = 'Loading...',
}: {
  isLoading: boolean;
  message?: string;
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-secondary-950/50 backdrop-blur-sm flex items-center justify-center z-50">
      <LoadingSpinner size="lg" text={message} />
    </div>
  );
};

export const LoadingState = ({
  message = 'Loading...',
  className = '',
}: {
  message?: string;
  className?: string;
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <LoadingSpinner size="lg" />
      <p className="text-secondary-400 mt-4">{message}</p>
    </div>
  );
};

export const Skeleton = ({
  className = '',
  lines = 1,
}: {
  className?: string;
  lines?: number;
}) => {
  return (
    <div className={`space-y-2 ${className}`} aria-label="Loading">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="bg-secondary-800 rounded animate-pulse h-4"
          style={{ animationDelay: `${index * 0.1}s` }}
        />
      ))}
    </div>
  );
};

export const SkeletonText = ({
  lines = 3,
  className = '',
}: {
  lines?: number;
  className?: string;
}) => {
  return (
    <div className={`space-y-2 ${className}`} aria-label="Loading text">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="bg-secondary-800 rounded animate-pulse h-3"
          style={{
            width: `${80 + Math.random() * 20}%`,
            animationDelay: `${index * 0.1}s`,
          }}
        />
      ))}
    </div>
  );
};

export const SkeletonAvatar = ({
  size = 'md',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) => {
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div
      className={`rounded-full bg-secondary-800 animate-pulse ${sizes[size]} ${className}`}
      aria-label="Loading avatar"
    />
  );
};

export const SkeletonCard = ({
  className = '',
}: {
  className?: string;
}) => {
  return (
    <div className={`bg-secondary-800 rounded-lg p-4 animate-pulse ${className}`} aria-label="Loading card">
      <SkeletonText lines={3} />
    </div>
  );
};

export default LoadingSpinner;

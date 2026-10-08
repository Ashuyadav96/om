import { useEffect, useRef, useState, KeyboardEvent, ReactNode } from 'react';

interface KeyboardNavigationProps {
  children: (props: {
    focusedIndex: number;
    setFocusedIndex: (index: number) => void;
    handleKeyDown: (e: KeyboardEvent) => void;
  }) => ReactNode;
  items: any[];
  onSelect?: (item: any) => void;
  className?: string;
}

export const KeyboardNavigation = ({
  children,
  items,
  onSelect,
  className = '',
}: KeyboardNavigationProps) => {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to focused item
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll('[tabindex], [data-focusable]');
    if (items[focusedIndex]) {
      items[focusedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [focusedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, items.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect && items[focusedIndex]) {
          onSelect(items[focusedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        // Could close the navigation
        break;
      case 'Home':
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusedIndex(items.length - 1);
        break;
      case 'Tab':
        // Let Tab work normally
        break;
      default:
        // Search/filter functionality could be added here
        break;
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      role="listbox"
      aria-activedescendant={`item-${focusedIndex}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {children({
        focusedIndex,
        setFocusedIndex,
        handleKeyDown,
      })}
    </div>
  );
};

// Hook for keyboard shortcuts
interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        if (
          e.key === shortcut.key &&
          (shortcut.ctrlKey ? e.ctrlKey || e.metaKey : true) &&
          (shortcut.metaKey ? e.metaKey || e.ctrlKey : true) &&
          (shortcut.shiftKey ? e.shiftKey : true) &&
          (shortcut.altKey ? e.altKey : true)
        ) {
          e.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
};

// Focus trap for modals and dropdowns
export const useFocusTrap = (ref: React.RefObject<HTMLElement>, onEscape?: () => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onEscape) {
        onEscape();
        return;
      }

      if (e.key === 'Tab' && ref.current) {
        const focusableElements = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    const handleFocusIn = () => {
      if (ref.current) {
        const focusableElements = ref.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    
    if (ref.current) {
      ref.current.addEventListener('focusin', handleFocusIn);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (ref.current) {
        ref.current.removeEventListener('focusin', handleFocusIn);
      }
    };
  }, [ref, onEscape]);
};

// Skip link for keyboard navigation
export const SkipLink = ({
  href = '#main',
  className = '',
}: {
  href?: string;
  className?: string;
}) => {
  return (
    <a
      href={href}
      className={`fixed top-0 left-0 -translate-y-full focus:translate-y-0 bg-primary-600 text-white px-4 py-2 rounded-b-lg z-50 transition-transform duration-200 ${className}`}
      style={{ zIndex: 1000 }}
    >
      Skip to main content
    </a>
  );
};

// Visually hidden component for screen readers
export const VisuallyHidden = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <div
      className={`absolute w-px h-px px-0 py-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

// Screen reader only text
export const ScreenReaderText = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <span className={`sr-only ${className}`}>
      {children}
    </span>
  );
};

// Focus indicator
export const FocusIndicator = ({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) => {
  return (
    <span className={`focus-indicator ${className}`}>
      {children}
    </span>
  );
};

export default KeyboardNavigation;

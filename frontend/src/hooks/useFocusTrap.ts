import { useEffect, useRef } from 'react';

/**
 * Traps focus within a container while active.
 * Tab / Shift+Tab cycle through focusable elements inside the container.
 */
export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = () =>
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );

    // Focus the first focusable element (or the container itself)
    const elements = focusable();
    if (elements.length > 0) {
      (elements[0] as HTMLElement).focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      const els = focusable();
      if (els.length === 0) return;

      const first = els[0] as HTMLElement;
      const last = els[els.length - 1] as HTMLElement;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [active]);

  return containerRef;
}

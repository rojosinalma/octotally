import { useEffect, useRef } from 'react';

export type KeyHandler = (e: KeyboardEvent) => void;

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Global single-key shortcuts (GitHub style). Keys map by `event.key`; handlers are skipped while
 * typing in a field unless the binding is marked `global`. `?` arrives as `?` on most layouts.
 */
export function useKeyboard(
  bindings: Record<string, KeyHandler | { global?: boolean; handler: KeyHandler }>,
): void {
  const ref = useRef(bindings);
  ref.current = bindings;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const binding = ref.current[e.key];
      if (!binding) return;
      const { global, handler } =
        typeof binding === 'function' ? { global: false, handler: binding } : binding;
      if (!global && isEditable(e.target)) return;
      handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

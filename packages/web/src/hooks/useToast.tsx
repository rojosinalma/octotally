import { useCallback, useMemo } from 'react';
import { useToasts } from 'tailor-react';

export type ToastVariant = 'success' | 'info' | 'warning' | 'critical';

interface ToastApi {
  toast: (title: string, opts?: { description?: string; variant?: ToastVariant; ttlMs?: number }) => void;
}

const TONES = { success: 'success', info: 'info', warning: 'warning', critical: 'danger' } as const;
/** Failures stay longer so the reason can be read. */
const DEFAULT_TTL_MS = 2500;
const CRITICAL_TTL_MS = 6000;

/**
 * App toasts on the tailor toast layer (`Ui.Provider`): title plus an optional reason.
 * Toast only what failed or needs attention; a success shows in place (button state, list update).
 */
export function useToast(): ToastApi {
  const { toast: show } = useToasts();
  const toast = useCallback<ToastApi['toast']>(
    (title, opts = {}) => {
      const variant = opts.variant ?? 'success';
      const message = opts.description ? `${title}: ${opts.description}` : title;
      const timeout = opts.ttlMs ?? (variant === 'critical' ? CRITICAL_TTL_MS : DEFAULT_TTL_MS);
      show(TONES[variant], message, { timeout });
    },
    [show],
  );
  return useMemo(() => ({ toast }), [toast]);
}

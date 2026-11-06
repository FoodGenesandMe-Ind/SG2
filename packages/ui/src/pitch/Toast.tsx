import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface ToastMessage {
  id: number;
  text: string;
  icon?: string;
}

/** A short message at the bottom of the screen that fades on its own. */
export function Toast({ toast, onDone }: { toast: ToastMessage; onDone: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 2800);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDone]);
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-md border border-line-strong bg-surface-raised px-3 text-sm text-fg"
      style={{ height: 'var(--sgp-row-compact)', boxShadow: 'var(--sgp-shadow-overlay)' }}
    >
      {toast.icon && <Icon name={toast.icon} size={14} className="text-fg-subtle" />}
      {toast.text}
    </div>
  );
}

/** One toast at a time; showing a new one replaces the last and restarts its timer. */
export function useToast() {
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const seq = useRef(0);
  const show = useCallback((text: string, icon?: string) => {
    seq.current += 1;
    setToast({ id: seq.current, text, icon });
  }, []);
  const clear = useCallback(() => setToast(null), []);
  return { show, element: toast ? <Toast key={toast.id} toast={toast} onDone={clear} /> : null };
}

import type { StatusDisplay } from '@sgp/mock-data';
import { useEffect, useRef } from 'react';
import { Icon } from './Icon';

const DISPLAY_OPTIONS: Array<{ value: StatusDisplay; label: string }> = [
  { value: 'long', label: 'Long name' },
  { value: 'short', label: 'Short name' },
  { value: 'icon', label: 'Icon only' },
];

/** Right-click menu for a column header. Only "Display as" is wired up in the prototype. */
export function ColumnMenu({
  x,
  y,
  columnLabel,
  statusDisplay,
  onStatusDisplay,
  onClose,
}: {
  x: number;
  y: number;
  columnLabel: string;
  statusDisplay?: StatusDisplay;
  onStatusDisplay?: (display: StatusDisplay) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);

  const item = 'flex w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-row-hover';
  const height = { height: 'var(--sgp-row-compact)' };

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`${columnLabel} column`}
      tabIndex={-1}
      className="fixed z-50 flex w-56 flex-col rounded-md border border-line-strong bg-surface-raised p-1 text-fg outline-none"
      style={{ left: x, top: y, boxShadow: 'var(--sgp-shadow-overlay)' }}
    >
      <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{columnLabel}</span>
      <button role="menuitem" className={`${item} text-fg-muted`} style={height}>
        <Icon name="arrow-down-a-z" /> Sort ascending
      </button>
      <button role="menuitem" className={`${item} text-fg-muted`} style={height}>
        <Icon name="arrow-up-z-a" /> Sort descending
      </button>
      <button role="menuitem" className={`${item} text-fg-muted`} style={height}>
        <Icon name="group" /> Group by this column
      </button>
      {onStatusDisplay && (
        <>
          <div className="my-1 border-t border-line" />
          <span className="px-2 py-1 text-xs text-fg-subtle">Display as</span>
          {DISPLAY_OPTIONS.map((option) => (
            <button
              key={option.value}
              role="menuitemradio"
              aria-checked={statusDisplay === option.value}
              className={item}
              style={height}
              onClick={() => {
                onStatusDisplay(option.value);
                onClose();
              }}
            >
              <span className="flex w-3.5 justify-center text-accent">
                {statusDisplay === option.value && <Icon name="check" />}
              </span>
              {option.label}
            </button>
          ))}
        </>
      )}
      <div className="my-1 border-t border-line" />
      <button role="menuitem" className={`${item} text-fg-muted`} style={height}>
        <Icon name="eye-off" /> Hide column
      </button>
    </div>
  );
}

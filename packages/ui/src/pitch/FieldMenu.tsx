import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Icon } from './Icon';

export interface FieldChoice {
  code: string;
  label: string;
}

export interface FieldMenuSection {
  id: string;
  title: string;
  /** Checked field codes. */
  selected: string[];
  onToggle: (code: string) => void;
}

export interface FieldMenuAction {
  id: string;
  label: string;
  icon: string;
  danger?: boolean;
  onClick: () => void;
}

const rowHeight = { height: 'var(--sgp-row-compact)' };
const MENU_MARGIN = 8;

/** The visible box a menu must stay inside: the viewport, and any ancestor that clips its children. */
function clipBounds(node: HTMLElement | null) {
  let top = 0;
  let left = 0;
  let right = window.innerWidth;
  let bottom = window.innerHeight;
  let current = node?.parentElement ?? null;
  while (current && current !== document.documentElement) {
    const style = getComputedStyle(current);
    const clips = [style.overflow, style.overflowX, style.overflowY].some((value) =>
      value === 'auto' || value === 'hidden' || value === 'clip' || value === 'scroll',
    );
    if (clips) {
      const rect = current.getBoundingClientRect();
      top = Math.max(top, rect.top);
      left = Math.max(left, rect.left);
      right = Math.min(right, rect.right);
      bottom = Math.min(bottom, rect.bottom);
    }
    current = current.parentElement;
  }
  return { top, left, right, bottom };
}

/**
 * Keeps a fixed menu inside the visible area. When the menu is taller than the room it has,
 * it takes the larger side and scrolls.
 */
function useMenuFrame(x: number, y: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState<{ left: number; top: number; maxHeight?: number }>({ left: x, top: y });
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const bounds = clipBounds(menu);
    const width = menu.offsetWidth;
    const height = menu.scrollHeight;
    const left = Math.min(Math.max(bounds.left + MENU_MARGIN, x), Math.max(bounds.left + MENU_MARGIN, bounds.right - width - MENU_MARGIN));
    const below = bounds.bottom - MENU_MARGIN - y;
    const above = y - bounds.top - MENU_MARGIN;
    const room = Math.max(below, above);
    const maxHeight = height > room ? Math.max(96, room) : undefined;
    const openUp = maxHeight !== undefined ? above > below : height > below;
    const top = openUp ? Math.max(bounds.top + MENU_MARGIN, maxHeight ? y - maxHeight : y - height) : y;
    setFrame((prev) => (prev.left === left && prev.top === top && prev.maxHeight === maxHeight ? prev : { left, top, maxHeight }));
  }, [x, y]);
  return { ref, frame };
}

/** Right-click menu for which fields a card or thumbnail shows, in the same shape as the gantt bar-label menu. */
export function FieldMenu({
  x,
  y,
  sections,
  fields,
  actions = [],
  onClose,
}: {
  x: number;
  y: number;
  sections: FieldMenuSection[];
  fields: FieldChoice[];
  actions?: FieldMenuAction[];
  onClose: () => void;
}) {
  const { ref, frame } = useMenuFrame(x, y);
  useEffect(() => {
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
  const item = 'flex w-full shrink-0 items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-row-hover';
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Fields"
      className="fixed z-50 flex w-56 flex-col rounded-md border border-line-strong bg-surface-raised p-1 text-fg [&>*]:shrink-0"
      style={{
        left: frame.left,
        top: frame.top,
        maxHeight: frame.maxHeight,
        overflowY: frame.maxHeight ? 'auto' : undefined,
        boxShadow: 'var(--sgp-shadow-overlay)',
      }}
    >
      {sections.map((section, index) => (
        <div key={section.id} className="flex shrink-0 flex-col [&>*]:shrink-0">
          {index > 0 && <div className="my-1 border-t border-line" />}
          <span className="px-2 py-1 text-xs text-fg-subtle">{section.title}</span>
          {fields.map((field) => {
            const on = section.selected.includes(field.code);
            return (
              <button
                key={field.code}
                role="menuitemcheckbox"
                aria-checked={on}
                className={item}
                style={rowHeight}
                onClick={() => section.onToggle(field.code)}
              >
                <span className="flex w-3.5 justify-center text-accent">{on && <Icon name="check" />}</span>
                {field.label}
              </button>
            );
          })}
        </div>
      ))}
      {actions.length > 0 && (
        <>
          <div className="my-1 border-t border-line" />
          {actions.map((action) => (
            <button
              key={action.id}
              role="menuitem"
              className={`${item} ${action.danger ? 'text-danger' : ''}`}
              style={rowHeight}
              onClick={() => {
                action.onClick();
                onClose();
              }}
            >
              <Icon name={action.icon} className={action.danger ? '' : 'text-fg-subtle'} /> {action.label}
            </button>
          ))}
        </>
      )}
    </div>
  );
}

/** Greedy rows of fields. Every card uses the same rows, so a field keeps its column down the list. */
export function packFields(widths: number[], available: number, gap = 16): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];
  let used = 0;
  widths.forEach((width, index) => {
    const fits = width <= available ? width : available;
    const next = row.length ? used + gap + fits : fits;
    if (row.length && next > available) {
      rows.push(row);
      row = [index];
      used = fits;
    } else {
      row.push(index);
      used = row.length === 1 ? fits : next;
    }
  });
  if (row.length) rows.push(row);
  return rows;
}

/** Spread leftover width across a row in proportion, so the card fills and the stops stay put. */
export function rowTracks(indexes: number[], widths: number[], available: number, gap = 16): string {
  const capped = indexes.map((index) => Math.min(widths[index], available));
  const sum = capped.reduce((total, width) => total + width, 0);
  const extra = Math.max(0, available - sum - gap * Math.max(0, indexes.length - 1));
  return capped.map((width) => `${width + (sum > 0 ? (extra * width) / sum : 0)}px`).join(' ');
}

import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './Icon';

export type HeaderSelection = 'none' | 'some' | 'all';

/** Clicking these keeps the selection, so toolbars, menus, and dialogs can act on it. */
const KEEPS_SELECTION =
  'button, a, input, select, textarea, label, [role="menu"], [role="dialog"], [role="separator"], [role="columnheader"], [role="radio"], [role="link"], [role="tab"]';

/** Pressing on these never starts a drag-select (column headers have their own drag to move columns). */
const NO_DRAG = 'a, button, input, select, textarea, [role="link"], [role="separator"], [role="columnheader"], [role="menu"], [role="dialog"]';

const preventTextSelection = (event: Event) => event.preventDefault();

const DRAG_THRESHOLD = 5;

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const overlaps = (a: DOMRect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/**
 * Row selection with the usual conventions: click selects one row and clicking it again deselects it;
 * Cmd/Ctrl+click toggles a row; Shift+click selects a range from the last clicked row.
 * Press and drag also selects, starting on a row or on empty space around the rows: across rows in a table
 * (`drag: 'range'`), or with a lasso rectangle over cards and thumbnails (`drag: 'lasso'`). Holding Cmd, Ctrl,
 * or Shift while dragging adds to the selection. Dragging never highlights text.
 * Clicking empty space, or pressing Escape, clears the selection. Clicks on links and buttons are ignored.
 * Spread `itemProps(id)` on every selectable element and `containerProps` on the scrolling area around them;
 * render `lasso` inside it.
 */
export function useRowSelection(ids: string[], initial: string[] = [], { drag = 'range' }: { drag?: 'range' | 'lasso' } = {}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const [lassoBox, setLassoBox] = useState<Rect | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const anchor = useRef<string | null>(initial[0] ?? null);
  const suppressClick = useRef(false);
  const scope = useId();
  const hasSelection = selected.size > 0;
  const itemSelector = `[data-select-scope="${scope}"][data-select-id]`;

  useEffect(() => {
    if (!hasSelection) return;
    const clear = () => setSelected(new Set());
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      if (target.closest(`[data-select-scope="${scope}"]`) || target.closest(`[data-select-container="${scope}"]`)) return;
      if (target.closest(KEEPS_SELECTION)) return;
      clear();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      // The first Escape closes an open menu or dialog; the next one clears the selection.
      if (event.key === 'Escape' && !document.querySelector('[role="menu"], [role="dialog"]')) clear();
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hasSelection, scope]);

  const idsKey = ids.join('\0');
  useEffect(() => {
    const allowed = new Set(ids);
    setSelected((prev) => {
      let changed = false;
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
        else changed = true;
      }
      return changed ? next : prev;
    });
    // idsKey tracks the id list; `ids` is read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const startDrag = (event: ReactPointerEvent, pressedId: string | null) => {
    if (event.button !== 0 || (event.target as Element).closest(NO_DRAG)) return;
    // Started on empty space, a range drag begins at the first row the pointer reaches.
    let startId = pressedId;
    document.addEventListener('selectstart', preventTextSelection);
    const additive = event.metaKey || event.ctrlKey || event.shiftKey;
    const base = additive ? [...selectedRef.current] : [];
    const x0 = event.clientX;
    const y0 = event.clientY;
    let moved = false;
    suppressClick.current = false;

    const move = (e: PointerEvent) => {
      if (!moved && Math.hypot(e.clientX - x0, e.clientY - y0) < DRAG_THRESHOLD) return;
      if (!moved) {
        moved = true;
        document.body.style.userSelect = 'none';
        window.getSelection()?.removeAllRanges();
      }
      if (drag === 'lasso') {
        const box = { left: Math.min(x0, e.clientX), right: Math.max(x0, e.clientX), top: Math.min(y0, e.clientY), bottom: Math.max(y0, e.clientY) };
        setLassoBox(box);
        const hits = [...document.querySelectorAll<HTMLElement>(itemSelector)]
          .filter((el) => overlaps(el.getBoundingClientRect(), box))
          .map((el) => el.dataset.selectId!);
        setSelected(new Set([...base, ...hits]));
        return;
      }
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>(itemSelector);
      if (!over) return;
      startId ??= over.dataset.selectId!;
      const from = ids.indexOf(startId);
      const to = ids.indexOf(over.dataset.selectId!);
      anchor.current = startId;
      setSelected(new Set([...base, ...ids.slice(Math.min(from, to), Math.max(from, to) + 1)]));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.removeEventListener('selectstart', preventTextSelection);
      document.body.style.userSelect = '';
      setLassoBox(null);
      if (moved) suppressClick.current = true;
      // A plain click on empty space around the rows clears the selection, like a click outside.
      else if (!pressedId && !additive) setSelected(new Set());
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onRowClick = (id: string, event: MouseEvent) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    // The second click of a double-click must not undo the first. The cell uses that double-click to edit.
    if (event.detail > 1) return;
    if ((event.target as HTMLElement).closest('a, button, input, textarea, [role="link"]')) return;
    if (event.shiftKey && anchor.current) {
      const from = ids.indexOf(anchor.current);
      const to = ids.indexOf(id);
      const range = ids.slice(Math.min(from, to), Math.max(from, to) + 1);
      setSelected((prev) => new Set(event.metaKey || event.ctrlKey ? [...prev, ...range] : range));
      return;
    }
    anchor.current = id;
    if (event.metaKey || event.ctrlKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      // Clicking the only selected row deselects it; clicking one of several narrows the selection to it.
      setSelected((prev) => (prev.has(id) && prev.size === 1 ? new Set() : new Set([id])));
    }
  };

  const header: HeaderSelection = selected.size === 0 ? 'none' : selected.size >= ids.length ? 'all' : 'some';
  const onHeaderClick = () => setSelected(header === 'all' ? new Set() : new Set(ids));

  return {
    isSelected: (id: string) => selected.has(id),
    count: selected.size,
    onRowClick,
    /** Keeps Shift+click from selecting text. */
    onRowMouseDown: (event: MouseEvent) => {
      if (event.shiftKey) event.preventDefault();
    },
    itemProps: (id: string) => ({
      'data-select-scope': scope,
      'data-select-id': id,
      onPointerDown: (event: ReactPointerEvent) => startDrag(event, id),
    }),
    containerProps: {
      'data-select-container': scope,
      onPointerDown: (event: ReactPointerEvent) => {
        if (!(event.target as Element).closest(itemSelector)) startDrag(event, null);
      },
    },
    lasso: lassoBox ? (
      <span
        aria-hidden
        className="pointer-events-none fixed z-50 rounded-sm border border-accent bg-accent/15"
        style={{ left: lassoBox.left, top: lassoBox.top, width: lassoBox.right - lassoBox.left, height: lassoBox.bottom - lassoBox.top }}
      />
    ) : null,
    header,
    onHeaderClick,
  };
}

function Box({ checked, faded }: { checked: boolean; faded?: boolean }) {
  return (
    <span
      className={`flex size-4 items-center justify-center rounded-sm border ${
        checked ? 'border-accent bg-accent text-fg-inverse' : 'border-line-strong'
      } ${faded ? 'opacity-50' : ''}`}
    >
      {checked && <Icon name="check" size={11} strokeWidth={3} />}
    </span>
  );
}

/** The record-type icon (Shot, Task, Note...), which becomes a ticked box when the row is selected. */
export function RowTypeIcon({ icon, selected, label }: { icon: string; selected: boolean; label: string }) {
  return (
    <span className="sgp-cf-keep flex w-full items-center justify-center" aria-label={selected ? `${label}, selected` : label} title={label}>
      {selected ? <Box checked /> : <Icon name={icon} size={14} className="text-fg-subtle" />}
    </span>
  );
}

/** Appears once anything is selected: faded tick for some rows, solid tick for all. Click selects all or clears. */
export function HeaderSelectBox({ state, onClick, count }: { state: HeaderSelection; onClick: () => void; count: number }) {
  if (state === 'none') return null;
  return (
    <button
      className="flex w-full items-center justify-center"
      aria-label={state === 'all' ? 'Clear selection' : `Select all (${count} selected)`}
      title={state === 'all' ? 'Clear selection' : `${count} selected. Click to select all`}
      onClick={onClick}
    >
      <Box checked faded={state === 'some'} />
    </button>
  );
}

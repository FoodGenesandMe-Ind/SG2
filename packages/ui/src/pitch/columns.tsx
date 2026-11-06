import { useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

const MIN_WIDTH = 40;
const MAX_AUTO_WIDTH = 640;
const DRAG_THRESHOLD = 4;

/** The grid track for a column: the width the user set, else the column's default. */
export const trackWidth = (widths: Record<string, number>, code: string, fallback: string) =>
  widths[code] ? `${widths[code]}px` : fallback;

/** Moves a column so it lands before the column now at insertAt (or last when insertAt is the length). */
export function moveColumn(order: string[], code: string, insertAt: number) {
  const from = order.indexOf(code);
  const next = order.filter((c) => c !== code);
  next.splice(insertAt > from ? insertAt - 1 : insertAt, 0, code);
  return next;
}

/** Widest natural width of every cell in a column, as Excel does on a double-click of the header edge. */
function fitWidth(table: HTMLElement, code: string) {
  const cells = [...table.querySelectorAll<HTMLElement>(`[data-col="${CSS.escape(code)}"]`)];
  const previous = cells.map((cell) => cell.style.width);
  cells.forEach((cell) => (cell.style.width = 'max-content'));
  const widest = Math.max(...cells.map((cell) => cell.getBoundingClientRect().width));
  cells.forEach((cell, i) => (cell.style.width = previous[i]));
  return Math.min(MAX_AUTO_WIDTH, Math.max(MIN_WIDTH, Math.ceil(widest) + 2));
}

interface DragState {
  code: string;
  label: string;
  x: number;
  y: number;
  insertAt: number;
  lineX: number;
}

function track(onMove: (event: PointerEvent) => void, onUp: () => void, cursor: string) {
  const previousCursor = document.body.style.cursor;
  const previousSelect = document.body.style.userSelect;
  const up = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', up);
    document.body.style.cursor = previousCursor;
    document.body.style.userSelect = previousSelect;
    onUp();
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', up);
  document.body.style.userSelect = 'none';
  return () => (document.body.style.cursor = cursor);
}

/**
 * Drag a column header to move the column; drag a header's right edge to resize it; double-click the edge to fit it.
 * Header cells carry role="columnheader" and data-col; body cells carry data-col so fitting can measure them.
 */
export function useColumnLayout({
  tableRef,
  order,
  onOrder,
  onWidth,
}: {
  tableRef: RefObject<HTMLElement | null>;
  order: string[];
  onOrder?: (order: string[]) => void;
  onWidth?: (code: string, width: number) => void;
}) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const startMove = (code: string, label: string) => (event: ReactPointerEvent) => {
    const table = tableRef.current;
    if (event.button !== 0 || !onOrder || !table) return;
    const startX = event.clientX;
    let setCursor: (() => void) | null = null;
    const move = (e: PointerEvent) => {
      if (!dragRef.current && Math.abs(e.clientX - startX) < DRAG_THRESHOLD) return;
      setCursor?.();
      const headers = [...table.querySelectorAll<HTMLElement>('[role=columnheader][data-col]')];
      const rects = headers.map((h) => h.getBoundingClientRect());
      const found = rects.findIndex((r) => e.clientX < r.left + r.width / 2);
      const insertAt = found < 0 ? rects.length : found;
      const edge = insertAt < rects.length ? rects[insertAt].left : rects[rects.length - 1].right;
      const next = { code, label, x: e.clientX, y: e.clientY, insertAt, lineX: edge - table.getBoundingClientRect().left };
      dragRef.current = next;
      setDrag(next);
    };
    setCursor = track(
      move,
      () => {
        const done = dragRef.current;
        dragRef.current = null;
        setDrag(null);
        if (!done) return;
        const next = moveColumn(order, code, done.insertAt);
        if (next.join() !== order.join()) onOrder(next);
      },
      'grabbing',
    );
  };

  const startResize = (code: string) => (event: ReactPointerEvent<HTMLElement>) => {
    event.stopPropagation();
    event.preventDefault();
    const header = event.currentTarget.parentElement;
    if (event.button !== 0 || !onWidth || !header) return;
    const startX = event.clientX;
    const startWidth = header.getBoundingClientRect().width;
    setResizing(code);
    const setCursor = track(
      (e) => onWidth(code, Math.max(MIN_WIDTH, Math.round(startWidth + e.clientX - startX))),
      () => setResizing(null),
      'col-resize',
    );
    setCursor();
  };

  const fit = (code: string) => (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (tableRef.current && onWidth) onWidth(code, fitWidth(tableRef.current, code));
  };

  /** Props for a header cell (add `relative` to its class so the resize handle can sit on its edge). */
  const headerProps = (code: string, label: string) => ({
    'data-col': code,
    onPointerDown: startMove(code, label),
  });

  const handle = (code: string, label: string) =>
    onWidth ? (
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label={`Resize ${label}`}
        title="Drag to resize, double-click to fit"
        onPointerDown={startResize(code)}
        onDoubleClick={fit(code)}
        className="group/resize absolute top-0 -right-1 z-10 flex h-full w-2 cursor-col-resize justify-center"
      >
        <span
          className={`h-full w-0.5 ${resizing === code ? 'bg-accent' : 'bg-transparent group-hover/resize:bg-accent'}`}
        />
      </span>
    ) : null;

  /** The insertion line and the floating label while a column is being moved; render inside the (relative) table. */
  const overlay = drag ? (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-accent"
        style={{ left: drag.lineX - 1 }}
      />
      <span
        aria-hidden
        className="pointer-events-none fixed z-50 rounded-sm border border-accent bg-surface-raised px-2 py-0.5 text-sm font-medium text-fg"
        style={{ left: drag.x + 10, top: drag.y + 10, boxShadow: 'var(--sgp-shadow-overlay)' }}
      >
        {drag.label}
      </span>
    </>
  ) : null;

  return { headerProps, handle, overlay, movingCode: drag?.code ?? null };
}

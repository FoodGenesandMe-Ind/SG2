import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

/**
 * The standard drag to reorder. The list holds still while dragging: the dragged item dims, and a hairline
 * glides to where it will land. Releasing moves it there; Escape cancels. A drop that changes nothing shows no line.
 *
 * Mark the list with `listRef` (relative), each item with `itemProps(id)`, render `indicator` inside the list,
 * and start a drag from a grip (or the item) with `startDrag(id, event)`.
 */
export function useReorder({
  ids,
  onReorder,
  axis = 'y',
  threshold = 0,
  onClick,
}: {
  ids: string[];
  onReorder: (ids: string[]) => void;
  /** 'y' for a column of rows; 'wrap' for items that flow in lines, such as chips. */
  axis?: 'y' | 'wrap';
  /** Pixels the pointer moves before a press becomes a drag, so a click still works. */
  threshold?: number;
  /** A press that never became a drag. */
  onClick?: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const idsRef = useRef(ids);
  idsRef.current = ids;
  const [dragging, setDragging] = useState<string | null>(null);
  const [line, setLine] = useState<{ index: number; left: number; top: number; length: number } | null>(null);

  const measure = (x: number, y: number) => {
    const list = listRef.current;
    if (!list) return null;
    const box = list.getBoundingClientRect();
    const rects = [...list.querySelectorAll<HTMLElement>('[data-reorder-id]')].map((node) => node.getBoundingClientRect());
    if (rects.length === 0) return null;
    if (axis === 'y') {
      let index = rects.findIndex((rect) => y < rect.top + rect.height / 2);
      if (index < 0) index = rects.length;
      // Between two items the line sits in the middle of the gap; at either end it sits on the edge.
      const above = rects[index - 1];
      const below = rects[index];
      const edge = above && below ? (above.bottom + below.top) / 2 : below ? below.top : above!.bottom;
      return { index, left: 0, top: edge - box.top, length: box.width };
    }
    // Wrap: find the line the pointer is on, then the gap within it.
    const rows = [...new Set(rects.map((rect) => Math.round(rect.top)))];
    const rowTop = rows.reduce((best, top) => {
      const rowRect = rects.find((rect) => Math.round(rect.top) === top)!;
      const distance = y < rowRect.top ? rowRect.top - y : y > rowRect.bottom ? y - rowRect.bottom : 0;
      const bestRect = rects.find((rect) => Math.round(rect.top) === best)!;
      const bestDistance = y < bestRect.top ? bestRect.top - y : y > bestRect.bottom ? y - bestRect.bottom : 0;
      return distance < bestDistance ? top : best;
    }, rows[0]!);
    const inRow = rects.map((rect, index) => ({ rect, index })).filter(({ rect }) => Math.round(rect.top) === rowTop);
    const hit = inRow.find(({ rect }) => x < rect.left + rect.width / 2);
    const index = hit ? hit.index : inRow[inRow.length - 1]!.index + 1;
    const anchor = hit ? hit.rect : inRow[inRow.length - 1]!.rect;
    const before = hit && hit.index > 0 ? rects[hit.index - 1] : undefined;
    const sameLine = before && Math.round(before.top) === rowTop;
    const edge = hit ? (sameLine ? (before!.right + anchor.left) / 2 : anchor.left - 2) : anchor.right + 2;
    return { index, left: edge - box.left, top: anchor.top - box.top, length: anchor.height };
  };

  const startDrag = (id: string, event: ReactPointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const from = idsRef.current.indexOf(id);
    if (from < 0) return;
    const x0 = event.clientX;
    const y0 = event.clientY;
    let started = threshold === 0;
    let target = from;
    const begin = () => {
      started = true;
      setDragging(id);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    };
    const update = (x: number, y: number) => {
      const next = measure(x, y);
      if (!next) return;
      target = next.index;
      setLine(next);
    };
    if (started) {
      begin();
      update(x0, y0);
    }
    const move = (e: PointerEvent) => {
      if (!started) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < threshold) return;
        begin();
      }
      update(e.clientX, e.clientY);
    };
    let finished = false;
    const finish = (commit: boolean) => {
      if (finished) return;
      finished = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key, true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDragging(null);
      setLine(null);
      if (!started) {
        if (commit) onClick?.(id);
        return;
      }
      if (!commit) return;
      const landing = target > from ? target - 1 : target;
      if (landing === from) return;
      const next = [...idsRef.current];
      const [item] = next.splice(from, 1);
      next.splice(landing, 0, item!);
      onReorder(next);
    };
    const up = () => finish(true);
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || !started) return;
      // Escape cancels the drag only; a dialog around the list stays open.
      e.stopImmediatePropagation();
      finish(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key, true);
  };

  const from = dragging ? ids.indexOf(dragging) : -1;
  const moves = !!line && from >= 0 && line.index !== from && line.index !== from + 1;

  const indicator = moves ? (
    axis === 'y' ? (
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 h-px bg-accent transition-[top] duration-100 ease-out"
        style={{ top: line.top, left: line.left, width: line.length }}
      >
        <span className="absolute top-1/2 -left-0.5 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
      </span>
    ) : (
      <span
        aria-hidden
        className="pointer-events-none absolute z-10 w-px bg-accent transition-[left,top] duration-100 ease-out"
        style={{ left: line.left, top: line.top, height: line.length }}
      >
        <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-accent" />
      </span>
    )
  ) : null;

  return {
    listRef,
    startDrag,
    indicator,
    dragging,
    /** Props for each item; the dragged one dims. */
    itemProps: (id: string) => ({ 'data-reorder-id': id, 'data-reorder-dragging': dragging === id ? '' : undefined }),
    /** Classes that dim the item being dragged. */
    dimClass: (id: string) => (dragging === id ? 'opacity-50' : ''),
  };
}

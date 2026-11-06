import { useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { MONTH_NAMES } from './dates';
import { TODAY } from './Gantt';
import { Icon } from './Icon';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MARGIN = 8;

function monthOf(iso: string) {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) - 1 };
}

/** A month of days under a date cell. Picking a day saves it; typing in the cell still works. */
export function DatePicker({
  anchorRef,
  value,
  onPick,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  /** The date in the cell as ISO, or null when it is empty or not a date yet. */
  value: string | null;
  onPick: (iso: string) => void;
}) {
  const [view, setView] = useState(() => monthOf(value ?? TODAY));
  const [place, setPlace] = useState<{ left: number; top: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const valueMonth = value ? `${value.slice(0, 7)}` : '';

  useLayoutEffect(() => {
    if (value) setView(monthOf(value));
  }, [valueMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    const reposition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = boxRef.current?.offsetWidth ?? 224;
      const height = boxRef.current?.offsetHeight ?? 290;
      const left = Math.min(Math.max(MARGIN, anchor.left), window.innerWidth - width - MARGIN);
      const below = anchor.bottom + 4;
      const top = below + height > window.innerHeight - MARGIN ? Math.max(MARGIN, anchor.top - height - 4) : below;
      setPlace((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [anchorRef]);

  const first = new Date(Date.UTC(view.year, view.month, 1));
  const lead = first.getUTCDay();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(Date.UTC(view.year, view.month, 1 - lead + index));
    return { iso: date.toISOString().slice(0, 10), day: date.getUTCDate(), inMonth: date.getUTCMonth() === view.month };
  });
  const step = (delta: number) =>
    setView((current) => {
      const next = new Date(Date.UTC(current.year, current.month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });
  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Pick a date"
      className="fixed z-50 flex w-56 flex-col gap-1 rounded-md border border-line-strong bg-surface-raised p-2 text-fg"
      style={{ left: place?.left ?? -9999, top: place?.top ?? -9999, boxShadow: 'var(--sgp-shadow-overlay)' }}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={stop}
      onClick={stop}
      onDoubleClick={stop}
    >
      <div className="flex items-center justify-between">
        <button type="button" aria-label="Previous month" className="flex size-7 items-center justify-center rounded-sm text-fg-muted hover:bg-row-hover hover:text-fg" onClick={() => step(-1)}>
          <Icon name="chevron-left" />
        </button>
        <span className="text-sm font-semibold">
          {MONTH_NAMES[view.month]} {view.year}
        </span>
        <button type="button" aria-label="Next month" className="flex size-7 items-center justify-center rounded-sm text-fg-muted hover:bg-row-hover hover:text-fg" onClick={() => step(1)}>
          <Icon name="chevron-right" />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-xs text-fg-subtle">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1">
            {day}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell) => {
          const selected = cell.iso === value;
          const today = cell.iso === TODAY;
          return (
            <button
              key={cell.iso}
              type="button"
              aria-label={cell.iso}
              aria-pressed={selected}
              className={`flex size-7 items-center justify-center rounded-sm text-sm tabular-nums ${
                selected ? 'bg-accent font-semibold text-fg-inverse' : cell.inMonth ? 'text-fg hover:bg-row-hover' : 'text-fg-subtle hover:bg-row-hover'
              } ${today && !selected ? 'ring-1 ring-accent ring-inset' : ''}`}
              onClick={() => onPick(cell.iso)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between border-t border-line pt-1.5">
        <span className="text-xs text-fg-subtle">Or type 12-Dec-2026</span>
        <button
          type="button"
          className="rounded-sm px-2 text-sm text-accent hover:bg-row-hover"
          style={{ height: 'var(--sgp-row-compact)' }}
          onClick={() => onPick(TODAY)}
        >
          Today
        </button>
      </div>
    </div>
  );
}
import { useRef, useState, type MouseEvent } from 'react';
import { Icon } from './Icon';

export type HeaderSelection = 'none' | 'some' | 'all';

/**
 * Row selection with the usual conventions: click selects one row, Cmd/Ctrl+click toggles a row,
 * Shift+click selects a range from the last clicked row. Clicks on links and buttons are ignored.
 */
export function useRowSelection(ids: string[], initial: string[] = []) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial));
  const anchor = useRef<string | null>(initial[0] ?? null);

  const onRowClick = (id: string, event: MouseEvent) => {
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
      setSelected(new Set([id]));
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
    <span className="flex w-full items-center justify-center" aria-label={selected ? `${label}, selected` : label} title={label}>
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

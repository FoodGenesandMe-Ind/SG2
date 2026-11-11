import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { Icon } from './Icon';
import { Popover } from './Popover';

export interface ChoiceOption {
  id: string;
  label: string;
  /** Extra words that also match a search, such as a code. */
  keywords?: string;
  detail?: string;
  /** How the option looks in the list and as a chip, for example a status pill. */
  node?: ReactNode;
}

const PAGE = 10;
const MARGIN = 8;
const row = { height: 'var(--sgp-row-compact)' };

/** Matches when any word of the label or keywords starts with what was typed. "P" finds Pip and Pocket watch. */
export function matchesChoice(option: ChoiceOption, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const words = `${option.label} ${option.keywords ?? ''}`.toLowerCase().split(/\s+/);
  return option.label.toLowerCase().startsWith(needle) || words.some((word) => word.startsWith(needle));
}

/**
 * Edits a pick-list cell: a status or list value, a link, or several links.
 * Multiple values show as chips; the list shows ten at a time and loads ten more as it scrolls.
 */
export function ChoiceEditor({
  anchorRef,
  options,
  value,
  multiple,
  canRemove = true,
  onCommit,
}: {
  anchorRef: RefObject<HTMLElement | null>;
  options: ChoiceOption[];
  /** Chosen ids. A single pick has at most one. */
  value: string[];
  multiple: boolean;
  /** Removing chips needs permission; without it, chips stay and only additions are allowed. */
  canRemove?: boolean;
  onCommit: (value: string | string[], how: 'save' | 'cancel', tab: -1 | 0 | 1) => void;
}) {
  const [chosen, setChosen] = useState<string[]>(value);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [active, setActive] = useState(() => (multiple ? 0 : Math.max(0, options.findIndex((option) => option.id === value[0]))));
  const [chipFocus, setChipFocus] = useState<string | null>(null);
  const [place, setPlace] = useState<{ left: number; top: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  const byId = useMemo(() => new Map(options.map((option) => [option.id, option])), [options]);
  const matches = options.filter((option) => (!multiple || !chosen.includes(option.id)) && matchesChoice(option, query));
  const visible = matches.slice(0, limit);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const typed = useRef(false);
  useEffect(() => {
    if (!typed.current) {
      typed.current = true;
      if (active >= PAGE) setLimit(Math.ceil((active + 1) / PAGE) * PAGE);
      return;
    }
    setLimit(PAGE);
    setActive(0);
    listRef.current?.scrollTo({ top: 0 });
    // Runs when the search changes; the first run keeps the current value highlighted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useLayoutEffect(() => {
    const reposition = () => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      const width = Math.max(anchor.width, 224);
      const height = boxRef.current?.offsetHeight ?? 260;
      const left = Math.min(Math.max(MARGIN, anchor.left), window.innerWidth - width - MARGIN);
      const top = anchor.top + height > window.innerHeight - MARGIN ? Math.max(MARGIN, anchor.bottom - height) : anchor.top;
      setPlace((prev) => (prev && prev.left === left && prev.top === top && prev.width === width ? prev : { left, top, width }));
    };
    reposition();
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [anchorRef, chosen.length, visible.length]);

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const finish = (how: 'save' | 'cancel', tab: -1 | 0 | 1 = 0, next = chosen) => {
    if (done.current) return;
    done.current = true;
    onCommit(multiple ? next : next[0] ?? '', how, tab);
  };

  const pick = (option: ChoiceOption) => {
    if (!multiple) {
      finish('save', 0, [option.id]);
      return;
    }
    setChosen((current) => [...current, option.id]);
    setQuery('');
    setChipFocus(null);
    inputRef.current?.focus();
  };

  const remove = (id: string) => {
    if (!canRemove) return;
    setChosen((current) => current.filter((item) => item !== id));
    setChipFocus(null);
    inputRef.current?.focus();
  };

  const loadMore = () => {
    const list = listRef.current;
    if (!list || limit >= matches.length) return;
    if (list.scrollTop + list.clientHeight >= list.scrollHeight - 8) setLimit((current) => current + PAGE);
  };

  const stop = (event: { stopPropagation: () => void }) => event.stopPropagation();

  return (
    <Popover anchorRef={anchorRef}>
    <div
      ref={boxRef}
      role="dialog"
      aria-label="Choose a value"
      className="fixed z-50 flex flex-col rounded-md border border-accent bg-surface-raised text-fg"
      style={{ left: place?.left ?? -9999, top: place?.top ?? -9999, width: place?.width, boxShadow: 'var(--sgp-shadow-overlay)' }}
      onMouseDown={(event) => {
        event.stopPropagation();
        if (event.target !== inputRef.current) event.preventDefault();
      }}
      onPointerDown={stop}
      onClick={stop}
      onDoubleClick={stop}
    >
      <div className="flex min-h-7 flex-wrap items-center gap-1 border-b border-line p-1">
        {multiple &&
          chosen.map((id) => {
            const option = byId.get(id);
            const focused = chipFocus === id;
            return (
              <span
                key={id}
                data-chip-id={id}
                className={`inline-flex max-w-full items-center gap-1 rounded-sm bg-accent-subtle pr-0.5 pl-1.5 text-sm ${focused ? 'outline outline-2 outline-accent' : ''}`}
                style={row}
                onClick={() => {
                  setChipFocus(focused ? null : id);
                  inputRef.current?.focus();
                }}
              >
                <span className="truncate">{option?.label ?? id}</span>
                {canRemove && (
                  <button
                    type="button"
                    aria-label={`Remove ${option?.label ?? id}`}
                    className="flex size-4 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(id);
                    }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                )}
              </span>
            );
          })}
        <input
          ref={inputRef}
          aria-label="Edit cell"
          value={query}
          placeholder={multiple ? (chosen.length ? 'Add' : 'Type to find') : byId.get(value[0] ?? '')?.label ?? 'Type to find'}
          className="min-w-16 flex-1 bg-transparent px-1 text-sm text-fg outline-none placeholder:text-fg-subtle"
          style={row}
          onChange={(event) => {
            setQuery(event.target.value);
            setChipFocus(null);
          }}
          onBlur={() => finish('save')}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              finish('cancel');
              return;
            }
            if (event.key === 'Tab') {
              event.preventDefault();
              finish('save', event.shiftKey ? -1 : 1);
              return;
            }
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              const next = Math.min(active + 1, matches.length - 1);
              if (next >= limit) setLimit((current) => current + PAGE);
              setActive(Math.max(0, next));
              return;
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive((current) => Math.max(0, current - 1));
              return;
            }
            if (event.key === 'Enter') {
              event.preventDefault();
              const option = matches[active];
              if (option && (query || !multiple)) pick(option);
              else finish('save');
              return;
            }
            if ((event.key === 'Backspace' || event.key === 'Delete') && query === '' && multiple && canRemove) {
              event.preventDefault();
              if (chipFocus) {
                remove(chipFocus);
                return;
              }
              if (event.key === 'Backspace') setChipFocus(chosen[chosen.length - 1] ?? null);
              return;
            }
            if (event.key === 'ArrowLeft' && query === '' && multiple && chosen.length) {
              event.preventDefault();
              const index = chipFocus ? chosen.indexOf(chipFocus) : chosen.length;
              setChipFocus(chosen[Math.max(0, index - 1)] ?? null);
              return;
            }
            if (event.key === 'ArrowRight' && chipFocus) {
              event.preventDefault();
              const index = chosen.indexOf(chipFocus);
              setChipFocus(chosen[index + 1] ?? null);
            }
          }}
        />
      </div>
      <div ref={listRef} role="listbox" aria-label="Options" className="max-h-44 overflow-y-auto p-1" onScroll={loadMore}>
        {visible.map((option, index) => {
          const current = !multiple && option.id === value[0];
          return (
            <div
              key={option.id}
              role="option"
              aria-selected={index === active}
              data-index={index}
              className={`flex cursor-default items-center gap-2 rounded-sm px-2 text-sm ${index === active ? 'bg-row-hover' : ''}`}
              style={row}
              onMouseEnter={() => setActive(index)}
              onClick={() => pick(option)}
            >
              <span className="flex w-3.5 shrink-0 justify-center text-accent">{current && <Icon name="check" size={12} />}</span>
              <span className="min-w-0 flex-1 truncate">{option.node ?? option.label}</span>
              {option.detail && <span className="shrink-0 text-xs text-fg-subtle">{option.detail}</span>}
            </div>
          );
        })}
        {visible.length === 0 && <p className="px-2 py-1 text-sm text-fg-subtle">{query ? 'Nothing matches.' : 'Everything is already added.'}</p>}
      </div>
      {matches.length > PAGE && (
        <p className="border-t border-line px-2 py-1 text-xs text-fg-subtle">
          {Math.min(limit, matches.length)} of {matches.length}
          {limit < matches.length ? '. Scroll for more.' : ''}
        </p>
      )}
    </div>
    </Popover>
  );
}

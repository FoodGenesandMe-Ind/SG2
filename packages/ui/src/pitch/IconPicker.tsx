import { useEffect, useMemo, useRef, useState } from 'react';
import { LUCIDE, TABLER, type IconLibrary } from '../foundations/IconLibrary';
import { Icon, registerIcon } from './Icon';

const PAGE = 240;
const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

const LIBRARIES: Array<{ library: IconLibrary; label: string; prefix: string }> = [
  { library: LUCIDE, label: 'Lucide (primary)', prefix: '' },
  { library: TABLER, label: 'Tabler (candidate)', prefix: 'tabler:' },
];

/** Every word typed must start a word of the icon's name: "arr do" finds arrow-down. */
function matches(name: string, query: string) {
  const words = query.toLowerCase().split(/[\s-]+/).filter(Boolean);
  if (words.length === 0) return true;
  const parts = name.split('-');
  return words.every((word) => parts.some((part) => part.startsWith(word)) || name.includes(word));
}

/**
 * Picks an icon from the primary library (Lucide) or the other one (Tabler).
 * Search narrows as you type; the grid loads more as it scrolls, so a whole library stays quick.
 */
export function IconPicker({ value, color, onChange }: { value: string; color: string; onChange: (name: string) => void }) {
  const [libraryIndex, setLibraryIndex] = useState(value.startsWith('tabler:') ? 1 : 0);
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const gridRef = useRef<HTMLDivElement>(null);
  const { library, prefix } = LIBRARIES[libraryIndex]!;
  const list = useMemo(() => library.icons.filter((icon) => !icon.filled && matches(icon.name, query)), [library, query]);

  useEffect(() => {
    setLimit(PAGE);
    gridRef.current?.scrollTo({ top: 0 });
  }, [libraryIndex, query]);

  const loadMore = () => {
    const grid = gridRef.current;
    if (!grid || limit >= list.length) return;
    if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight - 48) setLimit((current) => current + PAGE);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          aria-label="Icon library"
          className={`${control} w-44 shrink-0`}
          style={height}
          value={libraryIndex}
          onChange={(event) => setLibraryIndex(Number(event.target.value))}
        >
          {LIBRARIES.map((entry, index) => (
            <option key={entry.library.id} value={index}>
              {entry.label}
            </option>
          ))}
        </select>
        <label className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-fg-subtle">
            <Icon name="search" size={13} />
          </span>
          <input
            aria-label="Search icons"
            className={`${control} w-full pl-7`}
            style={height}
            value={query}
            placeholder="Search icons"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <div ref={gridRef} className="grid max-h-48 grid-cols-[repeat(auto-fill,minmax(1.75rem,1fr))] gap-0.5 overflow-y-auto rounded-md border border-line p-1" role="radiogroup" aria-label="Icon" onScroll={loadMore}>
        {list.slice(0, limit).map((icon) => {
          const name = `${prefix}${icon.name}`;
          const selected = value === name;
          const Component = icon.Component;
          return (
            <button
              key={icon.name}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={icon.name}
              title={icon.name}
              className={`flex size-7 items-center justify-center rounded-sm border ${selected ? 'border-accent bg-accent-subtle' : 'border-transparent hover:bg-row-hover'}`}
              onClick={() => {
                registerIcon(name, Component as Parameters<typeof registerIcon>[1], library.id === 'tabler');
                onChange(name);
              }}
            >
              <span style={{ color }} className="flex">
                <Component size={15} {...library.strokeProps} />
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="col-span-full px-2 py-1 text-sm text-fg-subtle">No icon matches "{query}".</p>}
      </div>
      <p className="text-xs text-fg-subtle">
        {list.length.toLocaleString('en-US')} {list.length === 1 ? 'icon' : 'icons'} in {library.name}
        {limit < list.length ? `. Showing ${limit.toLocaleString('en-US')}; scroll for more.` : '.'}
      </p>
    </div>
  );
}

import * as tabler from '@tabler/icons-react';
import { icons as lucideIcons } from 'lucide-react';
import { useMemo, useState, type ComponentType } from 'react';

type Pick = 'keep' | 'reject';
type Filter = 'all' | 'keep' | 'reject' | 'unmarked' | 'in-use';

interface LibraryIcon {
  name: string;
  Component: ComponentType<{ size?: number; strokeWidth?: number; stroke?: number }>;
  filled?: boolean;
}

export interface IconLibrary {
  id: 'lucide' | 'tabler';
  name: string;
  license: string;
  url: string;
  /** Lucide's `stroke` is a color; Tabler's `stroke` is the line width. */
  strokeProps: { strokeWidth?: number; stroke?: number };
  icons: LibraryIcon[];
  /** Icon names the prototype already uses from this library. */
  inUse: Set<string>;
}

const kebab = (pascal: string) =>
  pascal
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])(?=[A-Z])/g, '$1-')
    .replace(/(?<!\d)([a-zA-Z])(\d)/g, '$1-$2')
    .toLowerCase();

/** Lucide names the prototype already uses (from the pitch components and mock data). */
const LUCIDE_IN_USE = new Set(
  (
    'activity arrow-down-a-z arrow-right arrow-right-left arrow-up arrow-up-z-a at-sign ban bell book-open box bug building ' +
    'chart-area chart-bar chart-column chart-gantt chart-line chart-pie check chevron-down chevron-left chevron-right ' +
    'chevrons-down-up chevrons-up-down circle circle-alert circle-check circle-dashed clapperboard clock-arrow-down ' +
    'clock-arrow-up columns-3 contrast corner-down-right disc eye eye-off film flag folder-open frame git-branch grid-3x3 ' +
    'group image inbox layers layout-dashboard layout-grid layout-list layout-template list-todo list-video lock log-in mail ' +
    'mail-open message-square minus package panel-left-close panel-left-open paperclip pen-line pencil person-standing pin ' +
    'play plus receipt receipt-text reply rotate-ccw search send settings shield sliders-horizontal sparkles square-check ' +
    'square-function square-play sun table trash user user-plus users x zoom-in file file-check file-pen-line file-plus save undo-2 palette chevron-up'
  ).split(' '),
);

export const LUCIDE: IconLibrary = {
  id: 'lucide',
  name: 'Lucide',
  license: 'ISC',
  url: 'https://lucide.dev',
  strokeProps: { strokeWidth: 2 },
  inUse: LUCIDE_IN_USE,
  icons: Object.entries(lucideIcons).map(([key, Component]) => ({ name: kebab(key), Component: Component as LibraryIcon['Component'] })),
};

export const TABLER: IconLibrary = {
  id: 'tabler',
  name: 'Tabler Icons',
  license: 'MIT',
  url: 'https://tabler.io/icons',
  strokeProps: { stroke: 2 },
  /** Tabler exports renamed icons under both names; keep one entry per component, named by its current name. */
  icons: [
    ...new Map(
      Object.entries(tabler)
        .filter(([key]) => /^Icon[A-Z0-9]/.test(key))
        .map(([key, Component]) => [Component, key] as const),
    ),
  ]
    .map(([Component, key]) => ({
      name: kebab(key.replace(/^Icon/, '')),
      Component: Component as LibraryIcon['Component'],
      filled: key.endsWith('Filled'),
    }))
    .sort((a, b) => a.name.localeCompare(b.name)),
  inUse: new Set(),
};

const storageKey = (id: string) => `sgp.iconPicks.${id}`;

function loadPicks(id: string): Record<string, Pick> {
  try {
    return JSON.parse(localStorage.getItem(storageKey(id)) ?? '{}');
  } catch {
    return {};
  }
}

const NEXT: Record<string, Pick | undefined> = { none: 'keep', keep: 'reject', reject: undefined };

export function IconCurator({ library }: { library: IconLibrary }) {
  const [picks, setPicks] = useState<Record<string, Pick>>(() => loadPicks(library.id));
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [size, setSize] = useState(20);
  const [showFilled, setShowFilled] = useState(true);
  const [copied, setCopied] = useState(false);

  const save = (next: Record<string, Pick>) => {
    setPicks(next);
    localStorage.setItem(storageKey(library.id), JSON.stringify(next));
  };

  const cycle = (name: string) => {
    const nextPick = NEXT[picks[name] ?? 'none'];
    const next = { ...picks };
    if (nextPick) next[name] = nextPick;
    else delete next[name];
    save(next);
  };

  const pool = library.icons.filter((i) => showFilled || !i.filled);
  const counts = {
    all: pool.length,
    keep: pool.filter((i) => picks[i.name] === 'keep').length,
    reject: pool.filter((i) => picks[i.name] === 'reject').length,
    unmarked: pool.filter((i) => !picks[i.name]).length,
    'in-use': pool.filter((i) => library.inUse.has(i.name)).length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pool.filter((i) => {
      if (q && !i.name.includes(q)) return false;
      if (filter === 'keep') return picks[i.name] === 'keep';
      if (filter === 'reject') return picks[i.name] === 'reject';
      if (filter === 'unmarked') return !picks[i.name];
      if (filter === 'in-use') return library.inUse.has(i.name);
      return true;
    });
  }, [pool, query, filter, picks]);

  const kept = Object.keys(picks).filter((n) => picks[n] === 'keep').sort();
  const exportJson = JSON.stringify({ library: library.name, license: library.license, kept }, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      download();
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([exportJson], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${library.id}-kept-icons.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'keep', label: 'Kept' },
    { id: 'reject', label: 'Rejected' },
    { id: 'unmarked', label: 'Unmarked' },
    ...(library.inUse.size ? [{ id: 'in-use' as const, label: 'In use' }] : []),
  ];
  const button = 'rounded-md border border-line-strong px-2.5 text-sm hover:bg-row-hover';
  const height = { height: 'var(--sgp-row-compact)' };

  return (
    <div className="sgp-dir-b sgp-theme-dark flex min-h-screen flex-col bg-canvas font-sans text-md text-fg" style={{ colorScheme: 'dark' }}>
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-line bg-surface px-6 py-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-xl font-semibold">{library.name}</h1>
          <span className="text-sm text-fg-muted">
            {library.icons.length.toLocaleString('en-US')} unique icons
            {library.icons.some((i) => i.filled) &&
              ` (${library.icons.filter((i) => !i.filled).length.toLocaleString('en-US')} outline, ${library.icons
                .filter((i) => i.filled)
                .length.toLocaleString('en-US')} filled)`}
          </span>
          <span className="rounded-sm bg-accent-subtle px-1.5 text-xs">{library.license} license</span>
          <span className="text-xs text-fg-subtle">{library.url}</span>
          <span className="ml-auto text-xs text-fg-subtle">
            Click an icon to cycle: Keep, Reject, unmarked. Picks are saved in this browser.
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Filter" className="flex rounded-md border border-line-strong p-0.5 text-sm" style={height}>
            {filters.map((f) => (
              <button
                key={f.id}
                role="radio"
                aria-checked={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-1.5 rounded-sm px-2 ${filter === f.id ? 'bg-accent-subtle text-fg' : 'text-fg-muted hover:text-fg'}`}
              >
                {f.label}
                <span className="text-xs tabular-nums text-fg-subtle">{counts[f.id].toLocaleString('en-US')}</span>
              </button>
            ))}
          </div>
          <input
            aria-label="Search icons"
            placeholder="Search icons"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-56 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm outline-none placeholder:text-fg-subtle focus:border-accent"
            style={height}
          />
          <div role="radiogroup" aria-label="Icon size" className="flex rounded-md border border-line-strong p-0.5 text-sm" style={height}>
            {[16, 20, 24].map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={size === s}
                onClick={() => setSize(s)}
                className={`rounded-sm px-2 tabular-nums ${size === s ? 'bg-accent-subtle text-fg' : 'text-fg-muted'}`}
              >
                {s}px
              </button>
            ))}
          </div>
          {library.icons.some((i) => i.filled) && (
            <label className="flex items-center gap-1.5 text-sm text-fg-muted">
              <input type="checkbox" checked={showFilled} onChange={(e) => setShowFilled(e.target.checked)} className="accent-[var(--sgp-color-accent)]" />
              Include filled variants
            </label>
          )}
          <span className="ml-auto text-sm text-fg-subtle">
            Showing {visible.length.toLocaleString('en-US')}
          </span>
          <button className={button} style={height} onClick={copy} disabled={kept.length === 0}>
            {copied ? 'Copied' : `Copy kept list (${kept.length})`}
          </button>
          <button className={button} style={height} onClick={download} disabled={kept.length === 0}>
            Download JSON
          </button>
          <button
            className={`${button} text-danger`}
            style={height}
            onClick={() => {
              if (confirm(`Clear all ${Object.keys(picks).length} picks for ${library.name}?`)) save({});
            }}
          >
            Clear picks
          </button>
        </div>
      </header>

      <div className="grid gap-1.5 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(7.5rem, 1fr))' }}>
        {visible.map(({ name, Component, filled }) => {
          const pick = picks[name];
          return (
            <button
              key={name}
              onClick={() => cycle(name)}
              title={`${name}${filled ? ' (filled)' : ''}${library.inUse.has(name) ? ', in use in the prototype' : ''}`}
              className={`relative flex flex-col items-center gap-2 rounded-md border px-1.5 pt-3 pb-2 ${
                pick === 'keep'
                  ? 'border-success bg-success/10'
                  : pick === 'reject'
                    ? 'border-danger/60 bg-danger/5 opacity-40'
                    : 'border-line bg-surface hover:border-line-strong'
              }`}
              style={{ contentVisibility: 'auto', containIntrinsicSize: '6rem' }}
            >
              <Component size={size} {...library.strokeProps} />
              <span className="w-full truncate text-center text-xs text-fg-muted">{name}</span>
              {library.inUse.has(name) && (
                <span className="absolute top-1 left-1 rounded-sm bg-accent-subtle px-1 text-xs leading-4 text-fg">in use</span>
              )}
              {pick && (
                <span
                  className={`absolute top-1 right-1 rounded-sm px-1 text-xs leading-4 font-semibold ${
                    pick === 'keep' ? 'bg-success text-fg-inverse' : 'bg-danger text-fg-inverse'
                  }`}
                >
                  {pick === 'keep' ? 'Keep' : 'No'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

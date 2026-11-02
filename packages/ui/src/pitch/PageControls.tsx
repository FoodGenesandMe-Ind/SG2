import type { TableView } from '@sgp/mock-data';
import { Icon } from './Icon';
import { VIEW_ICON, VIEW_LABEL } from './shotsPage';

export const THUMB_SIZE = { min: 96, max: 384, step: 8 };
export const CARD_COLUMNS = { min: 1, max: 10 };

const rowHeight = { height: 'var(--sgp-row-compact)' };

export function ViewSwitcher({
  views,
  view,
  onView,
}: {
  views: TableView[];
  view: TableView;
  onView: (view: TableView) => void;
}) {
  return (
    <div role="radiogroup" aria-label="View" className="flex rounded-md border border-line-strong p-0.5 text-sm" style={rowHeight}>
      {views.map((v) => (
        <button
          key={v}
          role="radio"
          aria-checked={view === v}
          aria-label={VIEW_LABEL[v]}
          title={VIEW_LABEL[v]}
          onClick={() => onView(v)}
          className={`flex items-center rounded-sm px-1.5 ${view === v ? 'bg-accent-subtle text-fg' : 'text-fg-muted hover:text-fg'}`}
        >
          <Icon name={VIEW_ICON[v]} />
        </button>
      ))}
    </div>
  );
}

export function ThumbSizeSlider({ size, onSize }: { size: number; onSize: (size: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-fg-subtle" title="Thumbnail size">
      <Icon name="image" size={12} />
      <input
        type="range"
        aria-label="Thumbnail size"
        min={THUMB_SIZE.min}
        max={THUMB_SIZE.max}
        step={THUMB_SIZE.step}
        value={size}
        onChange={(event) => onSize(Number(event.target.value))}
        className="w-28 accent-[var(--sgp-color-accent)]"
      />
      <Icon name="image" size={17} />
    </label>
  );
}

export function CardColumnsPicker({ columns, onStep }: { columns: number; onStep: (delta: number) => void }) {
  const button =
    'flex h-full w-6 items-center justify-center text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div className="flex items-center overflow-hidden rounded-md border border-line-strong text-sm" style={rowHeight}>
      <span className="flex items-center gap-1 px-2 text-fg-subtle">
        <Icon name="columns-3" size={13} /> Columns
      </span>
      <button className={button} aria-label="Fewer columns" disabled={columns <= CARD_COLUMNS.min} onClick={() => onStep(-1)}>
        <Icon name="minus" size={12} />
      </button>
      <span role="status" aria-label="Card columns" className="w-6 text-center font-medium tabular-nums">
        {columns}
      </span>
      <button className={button} aria-label="More columns" disabled={columns >= CARD_COLUMNS.max} onClick={() => onStep(1)}>
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}

export const clampColumns = (n: number) => Math.min(CARD_COLUMNS.max, Math.max(CARD_COLUMNS.min, n));

export function SearchField({ label }: { label: string }) {
  return (
    <label
      className="flex w-56 items-center gap-2 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg-subtle focus-within:border-accent"
      style={rowHeight}
    >
      <Icon name="search" className="shrink-0" />
      <input
        aria-label={label}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle"
      />
    </label>
  );
}

/** The "+ Shot" style primary button used at the top right of every page. */
export function AddButton({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-2.5 text-sm font-medium text-fg-inverse hover:bg-accent-hover"
      style={rowHeight}
    >
      <Icon name="plus" /> {label}
    </button>
  );
}

import { company, type StatusDisplay, type TableView } from '@sgp/mock-data';
import { useCallback, useState } from 'react';
import { ColumnMenu } from './ColumnMenu';
import { ComponentStrip } from './ComponentStrip';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { NavTreeSpecimen, type NavMode } from './NavTreeSpecimen';
import { ShotGridSpecimen } from './ShotGridSpecimen';
import { ShotCardsView, ShotThumbsView } from './ShotViews';
import { getShotsPage, VIEW_ICON, VIEW_LABEL } from './shotsPage';

const VIEWS: TableView[] = ['table', 'card', 'thumb'];

function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-4 bg-chrome px-3 text-chrome-fg">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <Icon name="clapperboard" size={16} /> SGPipeline
      </span>
      <span className="text-sm text-chrome-muted">{company.name}</span>
      <label className="mx-auto flex h-7 w-96 items-center gap-2 rounded-md border border-chrome-muted/30 bg-chrome-fg/10 px-2 text-sm text-chrome-muted">
        <Icon name="search" className="shrink-0" />
        <input
          aria-label="Global search"
          placeholder="Global search"
          className="min-w-0 flex-1 bg-transparent text-chrome-fg outline-none placeholder:text-chrome-muted"
        />
        <kbd className="font-mono text-xs">⌘K</kbd>
      </label>
      <span className="flex items-center gap-3 text-chrome-muted">
        <Icon name="sparkles" size={16} />
        <Icon name="inbox" size={16} />
        <Icon name="bell" size={16} />
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-fg-inverse">
          NS
        </span>
      </span>
    </header>
  );
}

export const THUMB_SIZE = { min: 96, max: 384, step: 8 };
export const CARD_COLUMNS = { min: 1, max: 10 };

function ThumbSizeSlider({ size, onSize }: { size: number; onSize: (size: number) => void }) {
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

function CardColumnsPicker({ columns, onStep }: { columns: number; onStep: (delta: number) => void }) {
  const step = onStep;
  const button =
    'flex h-full w-6 items-center justify-center text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent';
  return (
    <div
      className="flex items-center overflow-hidden rounded-md border border-line-strong text-sm"
      style={{ height: 'var(--sgp-row-compact)' }}
    >
      <span className="flex items-center gap-1 px-2 text-fg-subtle">
        <Icon name="columns-3" size={13} /> Columns
      </span>
      <button className={button} aria-label="Fewer columns" disabled={columns <= CARD_COLUMNS.min} onClick={() => step(-1)}>
        <Icon name="minus" size={12} />
      </button>
      <span role="status" aria-label="Card columns" className="w-6 text-center font-medium tabular-nums">
        {columns}
      </span>
      <button className={button} aria-label="More columns" disabled={columns >= CARD_COLUMNS.max} onClick={() => step(1)}>
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}

function PageHeader({
  view,
  onView,
  thumbSize,
  onThumbSize,
  cardColumns,
  onCardColumns,
}: {
  view: TableView;
  onView: (view: TableView) => void;
  thumbSize: number;
  onThumbSize: (size: number) => void;
  cardColumns: number;
  onCardColumns: (delta: number) => void;
}) {
  const height = { height: 'var(--sgp-row-compact)' };
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1 text-xs text-fg-subtle">
        <span>The Last Lamplighter</span>
        <Icon name="chevron-right" size={12} />
        <span>Production</span>
        <Icon name="chevron-right" size={12} />
        <span className="text-fg-muted">Shots</span>
      </div>
      <div className="flex items-center gap-2">
        <h1 className="mr-2 text-xl font-semibold">Shots</h1>
        <span className="text-sm text-fg-subtle">11 shots in 3 sequences</span>
        <span className="ml-auto flex items-center">
          {view === 'thumb' && <ThumbSizeSlider size={thumbSize} onSize={onThumbSize} />}
          {view === 'card' && <CardColumnsPicker columns={cardColumns} onStep={onCardColumns} />}
        </span>
        <label
          className="flex w-56 items-center gap-2 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg-subtle focus-within:border-accent"
          style={height}
        >
          <Icon name="search" className="shrink-0" />
          <input
            aria-label="Search shots"
            placeholder="Search shots"
            className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
        <span
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-fg-muted"
          style={height}
        >
          <Icon name="sliders-horizontal" /> Sequence
        </span>
        <div role="radiogroup" aria-label="View" className="flex rounded-md border border-line-strong p-0.5 text-sm" style={height}>
          {VIEWS.map((v) => (
            <button
              key={v}
              role="radio"
              aria-checked={view === v}
              aria-label={VIEW_LABEL[v]}
              title={VIEW_LABEL[v]}
              onClick={() => onView(v)}
              className={`flex items-center rounded-sm px-1.5 ${
                view === v ? 'bg-accent-subtle text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              <Icon name={VIEW_ICON[v]} />
            </button>
          ))}
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 text-sm font-medium text-fg-inverse"
          style={height}
        >
          <Icon name="plus" /> Shot
        </span>
      </div>
    </div>
  );
}

export interface SpecimenProps {
  direction: Direction;
  theme: 'dark' | 'light';
  initialView?: TableView;
  initialStatusDisplay?: StatusDisplay;
  initialNavMode?: NavMode;
  initialNavOpen?: boolean;
  showComponents?: boolean;
  height?: number;
}

export function Specimen({
  direction,
  theme,
  initialView = 'table',
  initialStatusDisplay,
  initialNavMode = 'docked',
  initialNavOpen = false,
  showComponents = true,
  height = 600,
}: SpecimenProps) {
  const shotsPage = getShotsPage();
  const [view, setView] = useState<TableView>(initialView);
  const [statusDisplay, setStatusDisplay] = useState<StatusDisplay>(
    initialStatusDisplay ?? shotsPage.settings.status?.statusDisplay ?? 'long',
  );
  const [navMode, setNavMode] = useState<NavMode>(initialNavMode);
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [thumbSize, setThumbSize] = useState(shotsPage.page.thumbSettings?.size ?? 192);
  const [cardColumns, setCardColumns] = useState(shotsPage.page.cardSettings?.columns ?? 4);
  const [menu, setMenu] = useState<{ x: number; y: number; field: string; label: string } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  return (
    <div
      className={`sgp-dir-${direction.id} sgp-theme-${theme} overflow-hidden rounded-lg border border-line bg-canvas font-sans text-md text-fg`}
      style={{ colorScheme: theme }}
    >
      <TopBar />
      <div className="relative flex" style={{ height }}>
        <NavTreeSpecimen
          mode={navMode}
          overlayOpen={navOpen}
          onToggleDock={() => {
            setNavMode(navMode === 'docked' ? 'undocked' : 'docked');
            setNavOpen(false);
          }}
          onToggleOverlay={() => setNavOpen(!navOpen)}
        />
        <main className="flex min-w-0 flex-1 flex-col" onMouseDown={() => navMode === 'undocked' && setNavOpen(false)}>
          <PageHeader
            view={view}
            onView={setView}
            thumbSize={thumbSize}
            onThumbSize={setThumbSize}
            cardColumns={cardColumns}
            onCardColumns={(delta) =>
              setCardColumns((current) => Math.min(CARD_COLUMNS.max, Math.max(CARD_COLUMNS.min, current + delta)))
            }
          />
          {view === 'table' && (
            <ShotGridSpecimen
              direction={direction}
              statusDisplay={statusDisplay}
              shotsPage={shotsPage}
              onColumnContextMenu={(event, field) =>
                setMenu({ x: event.clientX, y: event.clientY, field: field.code, label: field.label })
              }
            />
          )}
          {view === 'card' && (
            <ShotCardsView
              direction={direction}
              statusDisplay={statusDisplay}
              columns={cardColumns}
              shotsPage={shotsPage}
            />
          )}
          {view === 'thumb' && (
            <ShotThumbsView direction={direction} statusDisplay={statusDisplay} size={thumbSize} shotsPage={shotsPage} />
          )}
        </main>
      </div>
      {showComponents && <ComponentStrip direction={direction} />}
      {menu && (
        <div className={`sgp-dir-${direction.id} sgp-theme-${theme} font-sans text-md`}>
          <ColumnMenu
            x={menu.x}
            y={menu.y}
            columnLabel={menu.label}
            statusDisplay={menu.field === 'status' ? statusDisplay : undefined}
            onStatusDisplay={menu.field === 'status' ? setStatusDisplay : undefined}
            onClose={closeMenu}
          />
        </div>
      )}
    </div>
  );
}

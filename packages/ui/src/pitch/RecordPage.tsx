import type { TableView } from '@sgp/mock-data';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Gantt, GanttZoomSlider, type GanttColumn, type GanttRow } from './Gantt';
import { Icon } from './Icon';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { AddButton, CardColumnsPicker, clampColumns, SearchField, ThumbSizeSlider, ViewSwitcher } from './PageControls';

export interface RecordColumn<T> {
  key: string;
  label: string;
  width: string;
  render: (row: T) => ReactNode;
  align?: 'end';
  /** Numeric value for the Sum shown in the Total row. */
  sum?: (row: T) => number;
  sumFormat?: (total: number) => string;
}

export interface RecordSpec<T> {
  /** Record-type icon shown at the start of each table row (becomes a tick box when selected). */
  icon: string;
  noun: string;
  plural: string;
  rows: T[];
  rowId: (row: T) => string;
  columns: RecordColumn<T>[];
  views: TableView[];
  defaultView: TableView;
  addLabel?: string;
  onAdd?: () => void;
  onOpen?: (row: T) => void;
  emptyMessage?: string;
  card: {
    columns?: number;
    /** Replaces the default card (media, title, status, fields). */
    render?: (row: T) => ReactNode;
    title?: (row: T) => ReactNode;
    status?: (row: T) => ReactNode;
    media?: (row: T) => string;
    fields?: Array<{ label: string; render: (row: T) => ReactNode }>;
  };
  thumb: { media: (row: T) => string; caption: (row: T) => ReactNode; badge?: (row: T) => ReactNode };
  gantt?:
    | { render: (zoom: number) => ReactNode; zoom?: number }
    | { columns: GanttColumn[]; rows: (rows: T[]) => GanttRow[]; zoom?: number };
}

const rowHeight = { height: 'var(--sgp-row-compact)' };

function Empty({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-fg-subtle">
      <Icon name="inbox" size={22} />
      <span className="max-w-sm text-sm">{message}</span>
    </div>
  );
}

function RecordTable<T>({ spec, direction }: { spec: RecordSpec<T>; direction: Direction }) {
  const template = `1.75rem ${spec.columns.map((c) => c.width).join(' ')}`;
  const selection = useRowSelection(spec.rows.map(spec.rowId));
  const summed = spec.columns.filter((c) => c.sum);
  const firstSum = spec.columns.findIndex((c) => c.sum);
  const labelSpan = firstSum >= 0 ? firstSum : spec.columns.length;
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <div className="min-w-max" role="table" aria-label={spec.plural}>
        <div
          className="sticky top-0 z-20 grid items-center border-b border-line-strong bg-surface-sunken text-sm font-medium text-fg-muted"
          style={{ gridTemplateColumns: template, ...rowHeight }}
          role="row"
        >
          <span className="flex justify-center">
            <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
          </span>
          {spec.columns.map((c) => (
            <span key={c.key} role="columnheader" className={`truncate px-2 ${c.align === 'end' ? 'text-right' : ''}`}>
              {c.label}
            </span>
          ))}
        </div>
        <div
          className="sticky z-10 grid items-center border-b border-line-strong bg-surface-sunken text-sm"
          style={{ gridTemplateColumns: template, top: 'var(--sgp-row-compact)', ...rowHeight }}
          aria-label="Totals"
        >
          <span className="flex items-center gap-2 px-2 font-semibold" style={{ gridColumn: `1 / span ${Math.max(1, labelSpan) + 1}` }}>
            Total
            <span className="text-xs font-normal text-fg-subtle">
              {spec.rows.length} {spec.rows.length === 1 ? spec.noun : spec.plural} on all pages
            </span>
          </span>
          {firstSum >= 0 &&
            spec.columns.slice(firstSum).map((c) => (
              <span key={c.key} className="flex items-baseline justify-end gap-1.5 px-2">
                {summed.includes(c) && (
                  <>
                    <span className="text-xs text-fg-subtle">Sum</span>
                    <span className="font-mono text-xs font-semibold tabular-nums">
                      {(c.sumFormat ?? String)(Math.round(spec.rows.reduce((a, r) => a + c.sum!(r), 0) * 10) / 10)}
                    </span>
                  </>
                )}
              </span>
            ))}
        </div>
        {spec.rows.map((row, i) => {
          const id = spec.rowId(row);
          const selected = selection.isSelected(id);
          return (
          <div
            key={id}
            role="row"
            aria-selected={selected}
            onClick={(event) => selection.onRowClick(id, event)}
            onMouseDown={selection.onRowMouseDown}
            onDoubleClick={spec.onOpen ? () => spec.onOpen!(row) : undefined}
            className={`grid cursor-default items-center border-b border-line text-md ${
              selected ? 'bg-row-selected' : direction.zebra && i % 2 === 1 ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
            }`}
            style={{ gridTemplateColumns: template, ...rowHeight }}
          >
            <span className="flex justify-center">
              <RowTypeIcon icon={spec.icon} selected={selected} label={spec.noun} />
            </span>
            {spec.columns.map((c) => (
              <span
                key={c.key}
                role="cell"
                className={`flex min-w-0 items-center overflow-hidden px-2 ${c.align === 'end' ? 'justify-end' : ''}`}
              >
                {c.render(row)}
              </span>
            ))}
          </div>
          );
        })}
      </div>
    </div>
  );
}

/** Header strip for card and thumbnail views: the selection box, the count, and how many are selected. */
function SelectionBar<T>({ spec, selection }: { spec: RecordSpec<T>; selection: ReturnType<typeof useRowSelection> }) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-3 border-b border-line-strong bg-surface-sunken px-3 text-sm"
      style={rowHeight}
    >
      <span className="flex w-5 justify-center">
        <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
      </span>
      <span className="font-semibold">Total</span>
      <span className="text-xs text-fg-subtle">
        {spec.rows.length} {spec.rows.length === 1 ? spec.noun : spec.plural} on all pages
      </span>
      {selection.count > 0 && <span className="ml-auto text-xs text-fg-muted">{selection.count} selected</span>}
    </div>
  );
}

export function RecordCards<T>({ spec, columns }: { spec: RecordSpec<T>; columns: number }) {
  const selection = useRowSelection(spec.rows.map(spec.rowId));
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <SelectionBar spec={spec} selection={selection} />
      <div className="grid items-start gap-3 p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {spec.rows.map((row) => {
          const id = spec.rowId(row);
          const selected = selection.isSelected(id);
          const select = {
            'aria-selected': selected,
            onClick: (event: MouseEvent) => selection.onRowClick(id, event),
            onMouseDown: selection.onRowMouseDown,
            onDoubleClick: spec.onOpen ? () => spec.onOpen!(row) : undefined,
          };
          const icon = <RowTypeIcon icon={spec.icon} selected={selected} label={spec.noun} />;
          return spec.card.render ? (
            <div
              key={id}
              {...select}
              className={`flex min-w-0 cursor-default gap-1.5 rounded-lg ${selected ? 'bg-row-selected ring-1 ring-accent' : ''}`}
            >
              <span className="mt-2 flex w-5 shrink-0 justify-center">{icon}</span>
              <div className="min-w-0 flex-1">{spec.card.render(row)}</div>
            </div>
          ) : (
            <article
              key={id}
              {...select}
              className={`@container flex min-w-0 cursor-default flex-col gap-2 overflow-hidden rounded-lg border p-2 ${
                selected ? 'border-accent bg-row-selected' : 'border-line bg-surface-raised hover:border-line-strong'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {spec.card.media && (
                  <span
                    className="hidden h-9 w-16 shrink-0 rounded-sm @[15rem]:block"
                    style={{ background: placeholderThumb(spec.card.media(row)) }}
                  />
                )}
                <span className="flex w-4 shrink-0 justify-center">{icon}</span>
                <span className="min-w-0 truncate font-medium">{spec.card.title?.(row)}</span>
                {spec.card.status && <span className="ml-auto shrink-0">{spec.card.status(row)}</span>}
              </div>
              {spec.card.fields && (
                <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 border-t border-line pt-2 text-sm @[17rem]:grid-cols-[6.5rem_minmax(0,1fr)] @[17rem]:gap-y-1">
                  {spec.card.fields.map((f) => (
                    <div key={f.label} className="contents">
                      <dt className="text-xs text-fg-subtle @[17rem]:text-sm">{f.label}</dt>
                      <dd className="mb-1 flex min-w-0 items-center overflow-hidden @[17rem]:mb-0">{f.render(row)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function RecordThumbs<T>({ spec, size }: { spec: RecordSpec<T>; size: number }) {
  const selection = useRowSelection(spec.rows.map(spec.rowId));
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <SelectionBar spec={spec} selection={selection} />
      <div className="grid gap-3 p-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${size}px)` }}>
        {spec.rows.map((row) => {
          const id = spec.rowId(row);
          const selected = selection.isSelected(id);
          return (
            <figure
              key={id}
              aria-selected={selected}
              onClick={(event) => selection.onRowClick(id, event)}
              onMouseDown={selection.onRowMouseDown}
              onDoubleClick={spec.onOpen ? () => spec.onOpen!(row) : undefined}
              className="group flex cursor-default flex-col gap-1.5"
              title="Click to select, double-click to open"
            >
              <div
                className={`relative aspect-video rounded-md ring-2 ${selected ? 'ring-accent' : 'ring-transparent group-hover:ring-line-strong'}`}
                style={{ background: placeholderThumb(spec.thumb.media(row)) }}
              >
                {spec.thumb.badge && (
                  <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-surface-sunken/80 px-1 text-xs text-fg">
                    {spec.thumb.badge(row)}
                  </span>
                )}
              </div>
              <figcaption className="flex min-w-0 items-center gap-2 overflow-hidden px-0.5 text-sm">
                <span className="flex w-4 shrink-0 justify-center">
                  <RowTypeIcon icon={spec.icon} selected={selected} label={spec.noun} />
                </span>
                {spec.thumb.caption(row)}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A page: the same toolbar and views whether it fills the screen or sits inside a detail-page tab.
 */
export function RecordPage<T>({ spec, direction }: { spec: RecordSpec<T>; direction: Direction }) {
  const [view, setView] = useState<TableView>(spec.defaultView);
  const [columns, setColumns] = useState(spec.card.columns ?? 3);
  const [thumbSize, setThumbSize] = useState(192);
  const [zoom, setZoom] = useState(spec.gantt?.zoom ?? 25);

  const controls =
    view === 'thumb' ? (
      <ThumbSizeSlider size={thumbSize} onSize={setThumbSize} />
    ) : view === 'card' ? (
      <CardColumnsPicker columns={columns} onStep={(d) => setColumns((c) => clampColumns(c + d))} />
    ) : view === 'gantt' ? (
      <GanttZoomSlider zoom={zoom} onZoom={setZoom} />
    ) : null;

  let body: ReactNode;
  if (spec.rows.length === 0) body = <Empty message={spec.emptyMessage ?? `No ${spec.plural} yet.`} />;
  else if (view === 'table') body = <RecordTable spec={spec} direction={direction} />;
  else if (view === 'card') body = <RecordCards spec={spec} columns={columns} />;
  else if (view === 'thumb') body = <RecordThumbs spec={spec} size={thumbSize} />;
  else if (spec.gantt && 'render' in spec.gantt) body = spec.gantt.render(zoom);
  else if (spec.gantt) body = <Gantt columns={spec.gantt.columns} rows={spec.gantt.rows(spec.rows)} zoom={zoom} zebra={direction.zebra} />;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
        <span className="text-sm text-fg-subtle">
          {spec.rows.length} {spec.rows.length === 1 ? spec.noun : spec.plural}
        </span>
        <span className="ml-auto flex items-center">{controls}</span>
        <SearchField label={`Search ${spec.plural}`} />
        <ViewSwitcher views={spec.views} view={view} onView={setView} />
        {spec.addLabel && <AddButton label={spec.addLabel} onClick={spec.onAdd} />}
      </div>
      {body}
    </div>
  );
}

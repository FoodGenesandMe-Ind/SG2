import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { GroupLevel } from '@sgp/mock-data';
import { SortArrow, trackWidth, useColumnLayout } from './columns';
import { Icon } from './Icon';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Prototype "today", matching the mock production's timeline. */
export const TODAY = '2026-11-01';

export type GanttResolution = 'days' | 'weeks' | 'months' | 'quarters' | 'years';

export const RESOLUTION_LABEL: Record<GanttResolution, string> = {
  days: 'Days',
  weeks: 'Weeks',
  months: 'Months',
  quarters: 'Quarters',
  years: 'Years',
};

/** Slider 0 (most zoomed in: days) to 100 (most zoomed out: years), on a log scale. */
export function pxPerDay(zoom: number) {
  return 40 * Math.pow(0.1 / 40, zoom / 100);
}

export function resolutionFor(zoom: number): GanttResolution {
  const ppd = pxPerDay(zoom);
  if (ppd >= 18) return 'days';
  if (ppd >= 5) return 'weeks';
  if (ppd >= 1) return 'months';
  if (ppd >= 0.27) return 'quarters';
  return 'years';
}

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const dateOf = (day: number) => new Date(day * DAY_MS);
const dayOf = (date: Date) => Math.floor(date.getTime() / DAY_MS);

type Unit = 'day' | 'week' | 'month' | 'quarter' | 'year';

function startOf(day: number, unit: Unit): number {
  const d = dateOf(day);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (unit) {
    case 'day':
      return day;
    case 'week':
      return day - ((d.getUTCDay() + 6) % 7);
    case 'month':
      return dayOf(new Date(Date.UTC(y, m, 1)));
    case 'quarter':
      return dayOf(new Date(Date.UTC(y, m - (m % 3), 1)));
    case 'year':
      return dayOf(new Date(Date.UTC(y, 0, 1)));
  }
}

function next(day: number, unit: Unit): number {
  const d = dateOf(day);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  switch (unit) {
    case 'day':
      return day + 1;
    case 'week':
      return day + 7;
    case 'month':
      return dayOf(new Date(Date.UTC(y, m + 1, 1)));
    case 'quarter':
      return dayOf(new Date(Date.UTC(y, m + 3, 1)));
    case 'year':
      return dayOf(new Date(Date.UTC(y + 1, 0, 1)));
  }
}

function label(day: number, unit: Unit, tier: 'top' | 'bottom'): string {
  const d = dateOf(day);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  if (unit === 'day') return String(d.getUTCDate());
  if (unit === 'week') return `${MONTHS[m]} ${d.getUTCDate()}`;
  if (unit === 'month') return tier === 'top' ? `${MONTHS[m]} ${y}` : MONTHS[m];
  if (unit === 'quarter') return `Q${Math.floor(m / 3) + 1}`;
  return String(y);
}

const TIERS: Record<GanttResolution, { top?: Unit; bottom: Unit; align: Unit }> = {
  days: { top: 'month', bottom: 'day', align: 'month' },
  weeks: { top: 'month', bottom: 'week', align: 'month' },
  months: { top: 'year', bottom: 'month', align: 'year' },
  quarters: { top: 'year', bottom: 'quarter', align: 'year' },
  years: { bottom: 'year', align: 'year' },
};

function ticks(start: number, end: number, unit: Unit, tier: 'top' | 'bottom') {
  const out: Array<{ day: number; days: number; label: string; weekend: boolean }> = [];
  for (let day = startOf(start, unit); day < end; day = next(day, unit)) {
    const dow = dateOf(day).getUTCDay();
    out.push({ day, days: next(day, unit) - day, label: label(day, unit, tier), weekend: unit === 'day' && (dow === 0 || dow === 6) });
  }
  return out;
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

const DEPENDENCY_LABEL: Record<DependencyType, string> = {
  FS: 'Finish-to-start',
  SS: 'Start-to-start',
  FF: 'Finish-to-finish',
  SF: 'Start-to-finish',
};

/** Dates are never moved automatically; a broken dependency is only flagged. */
function isViolated(type: DependencyType, pred: { start: number; end: number }, succ: { start: number; end: number }) {
  if (type === 'FS') return succ.start <= pred.end;
  if (type === 'SS') return succ.start < pred.start;
  if (type === 'FF') return succ.end < pred.end;
  return succ.end < pred.start;
}

export interface GanttColumn {
  key: string;
  label: string;
  width: string;
}

/** The left pane as the user arranged it: column order and widths, and where the divider sits. Saved with the page. */
export interface GanttLayout {
  order?: string[];
  widths?: Record<string, number>;
  /** Pane width in pixels; absent = exactly as wide as its columns. */
  pane?: number;
  /** Task columns the page shows to the left of the chart; the task name always shows. Read by the task gantt. */
  shown?: string[];
  /** Order of the tasks, set by clicking a column header. Read by the task gantt. */
  sort?: GroupLevel[];
}

const MIN_PANE = 120;
const MIN_CHART = 160;

export interface GanttRow {
  id: string;
  kind: 'group' | 'item';
  /** Left-pane content: one node per column for items, a single spanning node for groups. */
  cells: ReactNode[];
  start?: string;
  end?: string;
  /** Bar color (client data color, e.g. the status color). */
  color?: string;
  selected?: boolean;
  /** Record-type icon at the start of the row; it becomes a tick box when the row is selected. */
  icon?: string;
  /** Values that can be shown beside the bar, chosen from the gantt's right-click menu. */
  fields?: Record<string, string>;
  /** Conditional formatting for this row, already resolved. */
  formatClass?: string;
  formatStyle?: CSSProperties;
  dependsOn?: Array<{ rowId: string; type: DependencyType }>;
}

export interface GanttLabelOption {
  key: string;
  label: string;
}

function LabelMenu({
  x,
  y,
  options,
  left,
  right,
  onLeft,
  onRight,
  onClose,
}: {
  x: number;
  y: number;
  options: GanttLabelOption[];
  left: string;
  right: string;
  onLeft: (key: string) => void;
  onRight: (key: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && ref.current?.contains(event.target as Node)) return;
      onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);
  const item = 'flex w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-row-hover';
  const section = (title: string, value: string, onChange: (key: string) => void) => (
    <>
      <span className="px-2 py-1 text-xs text-fg-subtle">{title}</span>
      {[{ key: '', label: 'Nothing' }, ...options].map((o) => (
        <button
          key={o.key || 'none'}
          role="menuitemradio"
          aria-checked={value === o.key}
          className={item}
          style={{ height: 'var(--sgp-row-compact)' }}
          onClick={() => onChange(o.key)}
        >
          <span className="flex w-3.5 justify-center text-accent">{value === o.key && <Icon name="check" />}</span>
          {o.label}
        </button>
      ))}
    </>
  );
  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Gantt display"
      className="fixed z-50 flex w-56 flex-col rounded-md border border-line-strong bg-surface-raised p-1 text-fg"
      style={{ left: x, top: y, boxShadow: 'var(--sgp-shadow-overlay)' }}
    >
      <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Bar labels</span>
      {section('Left of bars', left, onLeft)}
      <div className="my-1 border-t border-line" />
      {section('Right of bars', right, onRight)}
    </div>
  );
}

export function Gantt({
  columns,
  rows,
  zoom,
  zebra,
  labelOptions = [],
  layout: layoutProp,
  onLayout,
  sort,
  onSortColumn,
  onColumnContextMenu,
}: {
  columns: GanttColumn[];
  rows: GanttRow[];
  zoom: number;
  zebra?: boolean;
  labelOptions?: GanttLabelOption[];
  /** Controlled layout (saved with the page); without it the gantt keeps its own. */
  layout?: GanttLayout;
  onLayout?: (layout: GanttLayout) => void;
  /** The order of the rows, and a click on a column header to sort by it or reverse it. */
  sort?: GroupLevel[];
  onSortColumn?: (key: string) => void;
  onColumnContextMenu?: (event: ReactMouseEvent, column: { key: string; label: string }) => void;
}) {
  const [ownLayout, setOwnLayout] = useState<GanttLayout>({});
  const paneLayout = layoutProp ?? ownLayout;
  const setPaneLayout = onLayout ?? setOwnLayout;
  const columnWidths = paneLayout.widths ?? {};
  const order = [
    ...(paneLayout.order ?? []).filter((key) => columns.some((c) => c.key === key)),
    ...columns.map((c) => c.key).filter((key) => !paneLayout.order?.includes(key)),
  ];
  const placed = order.map((key) => ({ column: columns.find((c) => c.key === key)!, index: columns.findIndex((c) => c.key === key) }));
  const scrollRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [panePx, setPanePx] = useState(0);
  const [draggingDivider, setDraggingDivider] = useState(false);
  const leftRef = useRef<HTMLDivElement>(null);
  const firstRowRef = useRef<HTMLDivElement>(null);
  const [available, setAvailable] = useState(0);
  const [rowPx, setRowPx] = useState(28);
  const [leftLabel, setLeftLabel] = useState('');
  const [rightLabel, setRightLabel] = useState('');
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const resolution = resolutionFor(zoom);
  const ppd = pxPerDay(zoom);
  const tiers = TIERS[resolution];
  const withIcons = rows.some((r) => r.icon);
  const columnTracks = placed.map(({ column }) => trackWidth(columnWidths, column.key, column.width));
  const widths = [...(withIcons ? ['1.75rem'] : []), ...columnTracks];
  // A widened pane gives the extra room to the last column; a narrowed one clips the columns.
  const leftTemplate = paneLayout.pane
    ? [...widths.slice(0, -1), `minmax(${widths.at(-1)}, 1fr)`].join(' ')
    : widths.join(' ');
  const leftWidth = paneLayout.pane ? `${paneLayout.pane}px` : `calc(${widths.join(' + ')})`;
  const columnLayout = useColumnLayout({
    tableRef: innerRef,
    order,
    onOrder: (next) => setPaneLayout({ ...paneLayout, order: next }),
    onWidth: (key, width) => setPaneLayout({ ...paneLayout, widths: { ...columnWidths, [key]: width } }),
  });
  const selection = useRowSelection(rows.filter((r) => r.kind === 'item').map((r) => r.id));
  const rowHeight = { height: 'var(--sgp-row-compact)' };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setAvailable(el.clientWidth - (leftRef.current?.offsetWidth ?? 0));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (firstRowRef.current) setRowPx(firstRowRef.current.offsetHeight);
  }, [rows.length]);

  useLayoutEffect(() => {
    const pane = leftRef.current?.offsetWidth ?? 0;
    setPanePx(pane);
    if (scrollRef.current) setAvailable(scrollRef.current.clientWidth - pane);
  }, [leftWidth, leftTemplate]);

  const startDivider = (event: ReactPointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const startX = event.clientX;
    const start = leftRef.current?.offsetWidth ?? 0;
    const max = (scrollRef.current?.clientWidth ?? 0) - MIN_CHART;
    setDraggingDivider(true);
    const previousCursor = document.body.style.cursor;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const move = (e: PointerEvent) =>
      setPaneLayout({ ...paneLayout, pane: Math.round(Math.min(max, Math.max(MIN_PANE, start + e.clientX - startX))) });
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = '';
      setDraggingDivider(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const { domainStart, domainEnd } = useMemo(() => {
    const days = rows.flatMap((r) => [r.start, r.end]).filter((d): d is string => !!d).map(dayNumber);
    days.push(dayNumber(TODAY));
    let min = Math.min(...days) - 14;
    let max = Math.max(...days) + 30;
    const shortfall = available / ppd - (max - min);
    if (shortfall > 0) {
      min -= Math.ceil(shortfall / 2);
      max += Math.ceil(shortfall / 2);
    }
    return { domainStart: startOf(min, tiers.align), domainEnd: next(startOf(max, tiers.align), tiers.align) };
  }, [rows, tiers.align, available, ppd]);

  const width = Math.ceil((domainEnd - domainStart) * ppd);
  const x = (day: number) => (day - domainStart) * ppd;
  const topTicks = tiers.top ? ticks(domainStart, domainEnd, tiers.top, 'top') : [];
  const bottomTicks = ticks(domainStart, domainEnd, tiers.bottom, 'bottom');
  const todayX = x(dayNumber(TODAY));

  const barDays = rows.flatMap((r) => (r.start ? [dayNumber(r.start), dayNumber(r.end ?? r.start)] : []));
  const firstBarX = barDays.length ? x(Math.min(...barDays)) : todayX;
  const lastBarX = barDays.length ? x(Math.max(...barDays)) : todayX;

  const anchoredFor = useRef('');
  useLayoutEffect(() => {
    const el = scrollRef.current;
    const key = `${todayX}-${firstBarX}-${lastBarX}`;
    // Only re-anchor when the timeline itself changes, not while the divider or columns are being dragged.
    if (!el || available <= 0 || anchoredFor.current === key) return;
    anchoredFor.current = key;
    // Center on today when it falls within the work; otherwise jump to the nearest end of the work.
    const anchor = Math.min(Math.max(todayX, firstBarX), lastBarX);
    const margin = anchor === todayX ? available * 0.35 : anchor === firstBarX ? 24 : available - 24;
    el.scrollLeft = Math.max(0, anchor - margin);
  }, [todayX, firstBarX, lastBarX, available]);

  const rowIndex = new Map(rows.map((r, i) => [r.id, i]));
  const span = (row: GanttRow) => ({ start: dayNumber(row.start!), end: dayNumber(row.end ?? row.start!) });
  const violations = new Map<string, string[]>();
  const arrows = rows.flatMap((row, i) =>
    (row.dependsOn ?? []).flatMap((dep) => {
      const j = rowIndex.get(dep.rowId);
      if (j === undefined || !row.start || !rows[j].start) return [];
      const pred = span(rows[j]);
      const succ = span(row);
      const violated = isViolated(dep.type, pred, succ);
      if (violated) {
        const message = `${DEPENDENCY_LABEL[dep.type]} dependency not met: ${rows[j].fields?.name ?? 'predecessor'} to ${row.fields?.name ?? 'this task'}`;
        violations.set(row.id, [...(violations.get(row.id) ?? []), message]);
      }
      const fromEnd = dep.type === 'FS' || dep.type === 'FF';
      const toEnd = dep.type === 'FF' || dep.type === 'SF';
      const x1 = fromEnd ? x(pred.end + 1) : x(pred.start);
      const x2 = toEnd ? x(succ.end + 1) : x(succ.start);
      const y1 = j * rowPx + rowPx / 2;
      const y2 = i * rowPx + rowPx / 2;
      const out1 = x1 + (fromEnd ? 8 : -8);
      const in2 = x2 + (toEnd ? 8 : -8);
      const midY = y2 - Math.sign(y2 - y1) * (rowPx / 2);
      return [
        {
          key: `${dep.rowId}-${row.id}`,
          path: `M ${x1} ${y1} H ${out1} V ${midY} H ${in2} V ${y2} H ${x2}`,
          toEnd,
          x2,
          y2,
          violated,
          title: violated
            ? violations.get(row.id)!.at(-1)!
            : `${DEPENDENCY_LABEL[dep.type]}: ${rows[j].fields?.name ?? ''} to ${row.fields?.name ?? ''}`,
        },
      ];
    }),
  );

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1">
    <div ref={scrollRef} className="min-w-0 flex-1 overflow-auto bg-surface" role="grid" aria-label="Gantt" {...selection.containerProps}>
      <div ref={innerRef} className="relative" style={{ width: `calc(${leftWidth} + ${width}px)` }}>
        <div className="sticky top-0 z-30 flex border-b border-line-strong bg-surface-sunken text-xs text-fg-muted">
          <div
            ref={leftRef}
            className="sticky left-0 z-40 grid shrink-0 items-end overflow-hidden border-r border-line-strong bg-surface-sunken text-sm font-medium"
            style={{ gridTemplateColumns: leftTemplate, width: leftWidth, height: 'calc(var(--sgp-row-compact) * 2)' }}
          >
            {withIcons && (
              <span className="flex items-center justify-center" style={rowHeight}>
                <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
              </span>
            )}
            {placed.map(({ column: c }) => (
              <span
                key={c.key}
                {...columnLayout.headerProps(c.key, c.label, onSortColumn)}
                role="columnheader"
                title={onSortColumn ? 'Click to sort, drag to move, right-click for options' : 'Drag to move, right-click for options'}
                onContextMenu={(event) => {
                  if (!onColumnContextMenu) return;
                  event.preventDefault();
                  onColumnContextMenu(event, { key: c.key, label: c.label });
                }}
                className={`relative flex min-w-0 cursor-grab items-center px-2 hover:bg-row-hover ${
                  columnLayout.movingCode === c.key ? 'opacity-50' : ''
                }`}
                style={rowHeight}
              >
                <span className="truncate">{c.label}</span>
                <SortArrow sort={sort} code={c.key} />
                {columnLayout.handle(c.key, c.label)}
              </span>
            ))}
          </div>
          <div className="relative shrink-0" style={{ width, height: 'calc(var(--sgp-row-compact) * 2)' }}>
            {topTicks.map((t) => (
              <span
                key={`t${t.day}`}
                className="absolute top-0 flex items-center truncate border-l border-line px-1.5 font-semibold text-fg"
                style={{ left: x(t.day), width: t.days * ppd, ...rowHeight }}
              >
                {t.label}
              </span>
            ))}
            {bottomTicks.map((t) => (
              <span
                key={`b${t.day}`}
                className={`absolute bottom-0 flex items-center justify-center truncate border-l border-t border-line ${
                  t.weekend ? 'text-fg-subtle' : ''
                }`}
                style={{ left: x(t.day), width: t.days * ppd, ...rowHeight }}
              >
                {t.days * ppd >= 16 ? t.label : ''}
              </span>
            ))}
            <span
              className="absolute bottom-0 z-10 -translate-x-1/2 rounded-sm bg-accent px-1 text-xs font-semibold text-fg-inverse"
              style={{ left: todayX }}
            >
              Today
            </span>
          </div>
        </div>

        <div
          className="pointer-events-none absolute bottom-0 z-10"
          style={{ left: leftWidth, width, top: 'calc(var(--sgp-row-compact) * 2)' }}
          aria-hidden
        >
          {bottomTicks.map((t) =>
            t.weekend ? (
              <span key={t.day} className="absolute top-0 bottom-0 bg-fg/5" style={{ left: x(t.day), width: t.days * ppd }} />
            ) : (
              <span key={t.day} className="absolute top-0 bottom-0 border-l border-line/50" style={{ left: x(t.day) }} />
            ),
          )}
          <span className="absolute top-0 bottom-0 w-px bg-accent" style={{ left: todayX }} />
          {arrows.length > 0 && (
            <svg className="absolute top-0 left-0 overflow-visible" width={width} height={rows.length * rowPx}>
              {arrows.map((a) => (
                <g key={a.key} className={a.violated ? 'text-danger' : 'text-fg-muted'}>
                  <title>{a.title}</title>
                  <path d={a.path} fill="none" stroke="currentColor" strokeWidth={a.violated ? 1.75 : 1.25} />
                  <path d={a.toEnd ? `M ${a.x2} ${a.y2} l 5 -3.5 v 7 z` : `M ${a.x2} ${a.y2} l -5 -3.5 v 7 z`} fill="currentColor" />
                  {a.violated && (
                    <g transform={`translate(${a.x2 + (a.toEnd ? 14 : -14)} ${a.y2 - 9})`}>
                      <circle r={7} fill="currentColor" />
                      <text textAnchor="middle" dy="0.35em" className="fill-fg-inverse text-xs font-bold">
                        !
                      </text>
                    </g>
                  )}
                </g>
              ))}
            </svg>
          )}
        </div>

        {rows.map((row, i) => {
          const start = row.start ? dayNumber(row.start) : undefined;
          const end = row.end ? dayNumber(row.end) : start;
          const barX = start !== undefined ? x(start) : 0;
          const barW = start !== undefined && end !== undefined ? Math.max((end - start + 1) * ppd, 4) : 0;
          const rowViolations = violations.get(row.id);
          const selected = row.kind === 'item' && (row.selected || selection.isSelected(row.id));
          const rowBg = selected
            ? 'bg-row-selected'
            : row.kind === 'group'
              ? 'bg-surface-raised'
              : zebra && i % 2 === 1
                ? 'bg-row-alt'
                : 'bg-surface';
          return (
            <div
              key={row.id}
              ref={i === 0 ? firstRowRef : undefined}
              role="row"
              aria-selected={row.kind === 'item' ? selected : undefined}
              onClick={row.kind === 'item' ? (event) => selection.onRowClick(row.id, event) : undefined}
              onMouseDown={selection.onRowMouseDown}
              {...(row.kind === 'item' ? selection.itemProps(row.id) : {})}
              className={`group flex border-b border-line ${rowBg} ${row.formatClass ?? ''}`}
              style={{ ...rowHeight, ...row.formatStyle }}
            >
              <div
                className={`sticky left-0 z-20 grid shrink-0 items-center overflow-hidden border-r border-line-strong text-md ${rowBg} group-hover:bg-row-hover`}
                style={{ gridTemplateColumns: leftTemplate, width: leftWidth, ...row.formatStyle }}
              >
                {row.kind === 'group' ? (
                  <span className="flex min-w-0 items-center gap-2 px-2 text-sm" style={{ gridColumn: '1 / -1' }}>
                    {row.cells[0]}
                  </span>
                ) : (
                  [
                    ...(withIcons
                      ? [
                          <span key="icon" className="flex items-center justify-center">
                            {row.icon && <RowTypeIcon icon={row.icon} selected={selected} label={row.fields?.name ?? 'Task'} />}
                          </span>,
                        ]
                      : []),
                    ...placed.map(({ column, index: ci }) => (
                    <span key={column.key} data-col={column.key} className="flex min-w-0 items-center gap-1 overflow-hidden px-2">
                      {ci === 0 && rowViolations && (
                        <span title={rowViolations.join('\n')} className="flex shrink-0 text-danger" aria-label="Dependency not met">
                          <Icon name="circle-alert" size={13} strokeWidth={2.25} />
                        </span>
                      )}
                      {row.cells[ci]}
                    </span>
                  )),
                  ]
                )}
              </div>
              <div
                className="relative shrink-0 group-hover:bg-row-hover/60"
                style={{ width }}
                onContextMenu={(event) => {
                  if (labelOptions.length === 0) return;
                  event.preventDefault();
                  setMenu({ x: event.clientX, y: event.clientY });
                }}
              >
                {start !== undefined &&
                  (row.kind === 'group' ? (
                    <span
                      className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-fg-subtle"
                      style={{ left: barX, width: barW }}
                    />
                  ) : (
                    <span
                      className="absolute top-1 bottom-1 rounded-sm"
                      style={{ left: barX, width: barW, background: row.color ?? 'var(--sgp-color-accent)' }}
                      title={`${row.fields?.name ?? ''} ${row.start} to ${row.end}`.trim()}
                    />
                  ))}
                {row.kind === 'item' && start !== undefined && leftLabel && row.fields?.[leftLabel] && (
                  <span
                    className="absolute top-1/2 -translate-x-full -translate-y-1/2 pr-1.5 text-xs whitespace-nowrap text-fg-muted"
                    style={{ left: barX }}
                  >
                    {row.fields[leftLabel]}
                  </span>
                )}
                {row.kind === 'item' && start !== undefined && rightLabel && row.fields?.[rightLabel] && (
                  <span
                    className="absolute top-1/2 -translate-y-1/2 pl-1.5 text-xs whitespace-nowrap text-fg-muted"
                    style={{ left: barX + barW }}
                  >
                    {row.fields[rightLabel]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        {columnLayout.overlay}
      </div>
      {menu && (
        <LabelMenu
          x={menu.x}
          y={menu.y}
          options={labelOptions}
          left={leftLabel}
          right={rightLabel}
          onLeft={setLeftLabel}
          onRight={setRightLabel}
          onClose={closeMenu}
        />
      )}
    </div>
      <span
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize the column pane"
        title="Drag to resize the columns beside the chart. Double-click to fit the columns."
        onPointerDown={startDivider}
        onDoubleClick={() => setPaneLayout({ ...paneLayout, pane: undefined })}
        className="group/divider absolute top-0 bottom-0 z-40 flex w-2 -translate-x-1/2 cursor-col-resize justify-center"
        style={{ left: panePx }}
      >
        <span className={`h-full w-0.5 ${draggingDivider ? 'bg-accent' : 'bg-transparent group-hover/divider:bg-accent'}`} />
      </span>
    </div>
  );
}

/** Time scale slider for gantt views: days (left) to years (right). */
export function GanttZoomSlider({ zoom, onZoom }: { zoom: number; onZoom: (zoom: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-fg-subtle" title="Time scale">
      <Icon name="zoom-in" size={13} />
      <span>Days</span>
      <input
        type="range"
        aria-label="Time scale"
        min={0}
        max={100}
        value={zoom}
        onChange={(event) => onZoom(Number(event.target.value))}
        className="w-32 accent-[var(--sgp-color-accent)]"
      />
      <span>Years</span>
      <span className="w-16 rounded-sm bg-accent-subtle px-1.5 text-center font-medium text-fg" aria-live="polite">
        {RESOLUTION_LABEL[resolutionFor(zoom)]}
      </span>
    </label>
  );
}

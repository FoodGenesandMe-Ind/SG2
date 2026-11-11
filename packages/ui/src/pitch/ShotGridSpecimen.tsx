import type { ConditionalFormat, EffectiveField, GroupLevel, NumberDisplay, Shot, StatusDisplay } from '@sgp/mock-data';
import { formatNumber } from './numberDisplay';
import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { CellEditor, choiceKind, choiceOptions, choiceValue, commitField, fieldEditable, fieldEditText } from './cellEdit';
import { ChoiceEditor } from './ChoiceEditor';
import { onShotSurfaceContextMenu } from './recordActions';
import { placeholderThumb } from './color';
import { SortArrow, trackWidth, useColumnLayout } from './columns';
import { formatClass, formatsFor, kindOf, styleCss } from './conditionalFormat';
import { calculateField, formulaText } from './formulaValue';
import { allGroupIds, idsAtDepth, useOpenSet } from './grouping';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { StatusPill } from './StatusPill';
import { useToast } from './Toast';
import { FitList } from './FitList';
import { canWrap } from './wrap';
import { PersonChip } from './people';
import {
  assetNameList,
  shotCellText,
  formatDate,
  getShotsPage,
  SELECTED_SHOT_ID,
  summariesFor,
  SUMMARY_LABEL,
  type ShotGroup,
  type ShotsPage,
} from './shotsPage';

/** Default thumbnail column width; widening the column enlarges the thumbnail, and the rows grow to keep it 16:9. */
const THUMB_COLUMN = '3.5rem';

const COLUMN_WIDTH: Record<string, string> = {
  image: THUMB_COLUMN,
  code: '6.5rem',
  description: 'minmax(14rem, 1fr)',
  frameIn: '4.5rem',
  frameOut: '4.5rem',
  totalFrames: '7.5rem',
  dueDate: '7rem',
  animationDue: '7.5rem',
  assetIds: '11rem',
  locked: '7.5rem',
};
const STATUS_WIDTH: Record<StatusDisplay, string> = { long: '8.5rem', short: '5rem', icon: '4rem' };

export function ShotCell({
  field,
  shot,
  direction,
  statusDisplay,
  onOpenShot,
  fields,
  wrap = false,
}: {
  field: EffectiveField;
  shot: Shot;
  direction: Direction;
  statusDisplay: StatusDisplay;
  onOpenShot?: (shotId: string) => void;
  /** Other fields, so a calculated field can use their formulas too. */
  fields?: EffectiveField[];
  /** The whole value shows over several lines (a view setting for text and multi-link fields). */
  wrap?: boolean;
}) {
  if (field.type === 'calculated') {
    const value = calculateField(field, shot as unknown as Record<string, unknown>, fields ?? [field]);
    if (typeof value === 'number' && field.display) return <DisplayedNumber value={value} display={field.display} />;
    const dated = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
    return <span className="truncate tabular-nums">{dated ? formatDate(value.slice(0, 10), field.dateFormat) : formulaText(value)}</span>;
  }
  if (field.type === 'number' && field.display) {
    const raw = shot[field.code as keyof Shot];
    return typeof raw === 'number' ? <DisplayedNumber value={raw} display={field.display} /> : null;
  }
  if (field.type === 'media') {
    return (
      <span
        className="aspect-video w-full min-w-9 rounded-sm"
        style={{ background: placeholderThumb(shot.code) }}
        aria-label={`${shot.code} thumbnail`}
      />
    );
  }
  switch (field.code) {
    case 'code':
      return onOpenShot ? (
        <ShotNameLink code={shot.code} onOpen={() => onOpenShot(shot.id)} />
      ) : (
        <span className="font-medium text-accent">{shot.code}</span>
      );
    case 'status':
      return <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />;
    case 'frameIn':
      return <span className="tabular-nums">{shot.frameIn}</span>;
    case 'frameOut':
      return <span className="tabular-nums">{shot.frameOut}</span>;
    case 'totalFrames':
      return <span className="tabular-nums">{shot.totalFrames}</span>;
    case 'dueDate':
      return <span className="tabular-nums">{formatDate(shot.dueDate, field.dateFormat)}</span>;
    case 'animationDue':
      return <span className="tabular-nums">{formatDate(shot.animationDue, field.dateFormat)}</span>;
    case 'assetIds':
      return wrap ? (
        <span className="min-w-0 whitespace-normal break-words">{assetNameList(shot.assetIds).join(', ')}</span>
      ) : (
        <FitList names={assetNameList(shot.assetIds)} />
      );
    default: {
      const raw = shot[field.code as keyof Shot];
      if (field.type === 'user' && typeof raw === 'string' && raw) return <PersonChip personId={raw} />;
      return (
        <span className={`${wrap ? 'min-w-0 whitespace-normal break-words' : 'truncate'} ${field.type === 'date' ? 'tabular-nums' : ''}`}>
          {shotCellText(field, shot, statusDisplay, fields)}
        </span>
      );
    }
  }
}

/** A formatted number. Accounting keeps the currency symbol at the left edge and the amount at the right. */
function DisplayedNumber({ value, display }: { value: number; display: NumberDisplay }) {
  const text = formatNumber(value, display);
  if (display.style === 'accounting') {
    const [symbol, ...rest] = text.split(' ');
    return (
      <span className="flex w-full justify-between gap-2 tabular-nums">
        <span>{symbol}</span>
        <span>{rest.join(' ')}</span>
      </span>
    );
  }
  return <span className="tabular-nums">{text}</span>;
}

export function SummaryValue({ kind, value, display }: { kind: keyof typeof SUMMARY_LABEL; value: number; display?: NumberDisplay }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-fg-subtle">{SUMMARY_LABEL[kind]}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">
        {display && kind !== 'count' ? formatNumber(value, display) : value.toLocaleString('en-US')}
      </span>
    </span>
  );
}

/** A single click opens the shot. A second click, arriving as a double-click, cancels that and lets the cell edit. */
function ShotNameLink({ code, onOpen }: { code: string; onOpen: () => void }) {
  const openTimer = useRef(0);
  return (
    <button
      className="font-medium text-accent hover:underline"
      onClick={(event) => {
        event.stopPropagation();
        window.clearTimeout(openTimer.current);
        if (event.detail > 1) return;
        openTimer.current = window.setTimeout(onOpen, 250);
      }}
      onDoubleClick={(event) => {
        event.preventDefault();
        window.clearTimeout(openTimer.current);
      }}
    >
      {code}
    </button>
  );
}

type LockState = 'open' | 'locked' | 'system';
type Flash = { tone: 'ok' | 'bad'; n: number };

/**
 * Double-click editing shared by the table, cards, kanban cards, and thumbnails: one cell at a time, Enter, Tab, or
 * clicking away saves, Escape cancels, a green or red flash shows the result, and a locked record says so on itself.
 */
export function useInlineEdit({
  rootRef,
  shots,
  lockOf,
  onEditShot,
  onToggleLock,
}: {
  /** Tab moves between cells inside this element only. */
  rootRef: RefObject<HTMLElement | null>;
  shots: Shot[];
  lockOf?: (shotId: string) => LockState;
  /** Absent for viewers who can only read records. */
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
  /** Absent for viewers who cannot lock or unlock records. */
  onToggleLock?: (shotId: string) => void;
}) {
  // A field can show twice on one card (header and body), so the open editor is pinned to one place: its slot.
  const [editing, setEditing] = useState<{ shotId: string; code: string; slot: string } | null>(null);
  const [flashes, setFlashes] = useState<Record<string, Flash>>({});
  const [lockedNotice, setLockedNotice] = useState<{ shotId: string; n: number } | null>(null);
  const toast = useToast();
  const isLocked = (shotId: string) => (lockOf?.(shotId) ?? 'open') !== 'open';
  const markFlash = (key: string, tone: Flash['tone']) => setFlashes((all) => ({ ...all, [key]: { tone, n: (all[key]?.n ?? 0) + 1 } }));

  /** Whether a record can change now; otherwise the toast says why. */
  const canChange = (shotId: string) => {
    if (!onEditShot) {
      toast.show('You can view these records but not edit them.', 'eye');
      return false;
    }
    if (isLocked(shotId)) {
      setLockedNotice((current) => ({ shotId, n: (current?.n ?? 0) + 1 }));
      return false;
    }
    return true;
  };

  const startEdit = (shotId: string, field: EffectiveField, slot: string) => {
    // The lock itself stays editable on a locked record; only the system's lock is fixed.
    if (field.code === 'locked') {
      if (!onToggleLock) return;
      if (lockOf?.(shotId) === 'system') {
        setLockedNotice((current) => ({ shotId, n: (current?.n ?? 0) + 1 }));
        return;
      }
      setEditing({ shotId, code: field.code, slot });
      return;
    }
    if (!fieldEditable(field) || !canChange(shotId)) return;
    setEditing({ shotId, code: field.code, slot });
  };

  const finishEdit = (shot: Shot, field: EffectiveField, slot: string, value: string | string[], how: 'save' | 'cancel', tab: -1 | 0 | 1) => {
    const key = `${shot.id}:${field.code}`;
    const cellKey = `${key}:${slot}`;
    if (how === 'cancel') {
      setEditing(null);
      return;
    }
    if (field.code === 'locked') {
      setEditing(null);
      if ((value === 'locked') !== isLocked(shot.id)) {
        onToggleLock?.(shot.id);
        markFlash(key, 'ok');
      }
      return;
    }
    const result = commitField(field, value, shot, shots, lockOf?.(shot.id) ?? 'open');
    if (!result.ok) {
      markFlash(key, 'bad');
      setEditing(null);
      return;
    }
    if (result.changed) {
      onEditShot?.(shot.id, result.patch);
      markFlash(key, 'ok');
    }
    if (tab === 0) {
      setEditing(null);
      return;
    }
    const root = rootRef.current ?? document;
    const cells = [...root.querySelectorAll<HTMLElement>('[data-edit-cell]')].filter(
      (cell) => cell.dataset.editCell === cellKey || !isLocked(cell.dataset.shotId ?? ''),
    );
    const index = cells.findIndex((cell) => cell.dataset.editCell === cellKey);
    const next = cells[index + tab];
    if (next?.dataset.shotId && next.dataset.field) setEditing({ shotId: next.dataset.shotId, code: next.dataset.field, slot: next.dataset.slot ?? 'cell' });
    else setEditing(null);
  };

  return {
    canChange,
    /**
     * For the record itself (row, card, or thumbnail caption): a double-click that lands on padding, an icon, or a
     * field that is never edited in place still says a locked record is locked. Editable cells handle their own.
     */
    onRecordDoubleClick: (shotId: string, event: MouseEvent) => {
      const target = event.target as Element;
      if (target.closest('input, textarea') || (target.closest('button, a') && !target.closest('[data-field]'))) return;
      if (onEditShot && isLocked(shotId)) setLockedNotice((current) => ({ shotId, n: (current?.n ?? 0) + 1 }));
    },
    /** Flash a record's field, for changes made outside the editor (such as a kanban drop). */
    flash: markFlash,
    toast: toast.element,
    /** The locked notice for this record, drawn over the record itself (render it inside the record's `relative` box). */
    lockedNotice: (shotId: string, wide = false) =>
      lockedNotice?.shotId === shotId ? (
        <LockedNotice key={lockedNotice.n} wide={wide} system={lockOf?.(shotId) === 'system'} onDone={() => setLockedNotice(null)} />
      ) : null,
    /** Props for an EditableShotCell showing this field of this record, in one place on the surface (its slot). */
    cellProps: (shot: Shot, field: EffectiveField, slot = 'cell') => ({
      slot,
      editing: editing?.shotId === shot.id && editing.code === field.code && editing.slot === slot,
      flash: flashes[`${shot.id}:${field.code}`],
      onEdit: () => startEdit(shot.id, field, slot),
      onCommit: (value: string | string[], how: 'save' | 'cancel', tab: -1 | 0 | 1) => finishEdit(shot, field, slot, value, how, tab),
    }),
  };
}

/**
 * A grey film over one record with the locked message, so the answer sits on the record that was touched.
 * It fades after a moment; a click dismisses it sooner.
 */
export function LockedNotice({ onDone, wide = false, system = false }: { onDone: () => void; wide?: boolean; system?: boolean }) {
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    const timer = window.setTimeout(() => done.current(), 2600);
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <span
      role="status"
      className={`sgp-locked-notice absolute inset-0 z-20 flex items-center gap-1.5 rounded-[inherit] bg-canvas/75 px-2 text-sm font-medium text-fg ${
        wide ? 'justify-start' : 'justify-center text-center'
      }`}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onDone();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {/* A wide row can scroll sideways, so its message stays at the visible left edge. */}
      <span className={`flex items-center gap-1.5 ${wide ? 'sticky left-10' : ''}`}>
        <Icon name="lock" size={13} className="shrink-0" />
        {system ? 'System-locked records are read-only.' : 'Record is locked. Contact your admin to unlock it.'}
      </span>
    </span>
  );
}

/** The Locked field's value as text. A lock the system set reads System lock, so it is told apart from a person's. */
export function lockText(state: LockState | undefined) {
  return state === 'system' ? 'System lock' : state === 'locked' ? 'Locked' : 'Unlocked';
}

/** The Locked field's value: an icon and its text, in the same type and color as any other field. */
function LockValue({ state }: { state: LockState }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <Icon name={state === 'open' ? 'lock-open' : 'lock'} size={13} className="shrink-0" />
      <span className="truncate">{lockText(state)}</span>
    </span>
  );
}

export function EditableShotCell({
  field,
  shot,
  direction,
  statusDisplay,
  onOpenShot,
  fields,
  alignEnd = false,
  inline = false,
  wrap = false,
  lock,
  children,
  slot = 'cell',
  editing,
  flash,
  onEdit,
  onCommit,
}: {
  field: EffectiveField;
  shot: Shot;
  direction: Direction;
  statusDisplay: StatusDisplay;
  onOpenShot?: (shotId: string) => void;
  fields?: EffectiveField[];
  alignEnd?: boolean;
  /** Sits in a line of other values (a card header or body) instead of filling a table cell. */
  inline?: boolean;
  /** The view wraps this field: the whole value shows over several lines. */
  wrap?: boolean;
  /** The record's lock, shown when this is the Locked field. */
  lock?: LockState;
  /** Replaces the plain value, for example a status pill that changes with the card's width. */
  children?: ReactNode;
  /** Which place on the surface this cell is, when the same field shows more than once on a record. */
  slot?: string;
  editing: boolean;
  flash?: Flash;
  onEdit: () => void;
  onCommit: (value: string | string[], how: 'save' | 'cancel', tab: -1 | 0 | 1) => void;
}) {
  const isLock = field.code === 'locked';
  const editable = fieldEditable(field);
  const kind = isLock ? 'single' : choiceKind(field);
  const cellRef = useRef<HTMLSpanElement>(null);
  const options = () =>
    isLock
      ? LOCK_CHOICES
      : choiceOptions(field, shot).map((option) =>
          field.type === 'status' ? { ...option, node: <StatusPill code={option.id} pillStyle={direction.pillStyle} display="long" /> } : option,
        );
  const value =
    field.code === 'locked' ? (
      <LockValue state={lock ?? 'open'} />
    ) : (
      children ?? <ShotCell field={field} shot={shot} direction={direction} statusDisplay={statusDisplay} onOpenShot={onOpenShot} fields={fields} wrap={wrap} />
    );
  return (
    <span
      ref={cellRef}
      className={`relative flex min-w-0 items-center ${inline ? 'max-w-full' : 'h-full flex-1'} ${inline && editing && !kind ? 'min-w-28' : ''} ${alignEnd ? 'justify-end text-right' : ''}`}
      data-edit-cell={editable ? `${shot.id}:${field.code}:${slot}` : undefined}
      data-slot={slot}
      data-shot-id={shot.id}
      data-field={field.code}
      title={isLock && lock === 'system' ? 'Locked by the system. This cannot be unlocked.' : undefined}
      onDoubleClick={(event) => {
        if (!editable && !isLock) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit();
      }}
    >
      {editing && kind ? (
        <>
          {value}
          <ChoiceEditor
            anchorRef={cellRef}
            options={options()}
            value={isLock ? [lock && lock !== 'open' ? 'locked' : 'open'] : choiceValue(field, shot)}
            multiple={kind === 'multi'}
            onCommit={onCommit}
          />
        </>
      ) : editing ? (
        <CellEditor value={fieldEditText(field, shot)} numeric={field.type === 'number'} date={field.type === 'date'} onCommit={onCommit} />
      ) : (
        value
      )}
      {flash && (
        <span
          key={flash.n}
          aria-hidden
          className="sgp-cell-flash absolute inset-0"
          style={{ background: flash.tone === 'ok' ? 'var(--sgp-color-success)' : 'var(--sgp-color-danger)' }}
        />
      )}
    </span>
  );
}

/** The Locked field's pick list: a double-click opens it, so a stray click never changes a lock. */
const LOCK_CHOICES = [
  { id: 'locked', label: 'Locked', node: <LockValue state="locked" /> },
  { id: 'open', label: 'Unlocked', node: <LockValue state="open" /> },
];

export function ShotGridSpecimen({
  direction,
  statusDisplay: statusDisplayOverride,
  onColumnContextMenu,
  onOpenShot,
  shotsPage = getShotsPage(),
  columnOrder,
  columnWidths = {},
  onColumnOrder,
  onColumnWidth,
  formats = [],
  recordActions,
  lockOf,
  onToggleLock,
  onEditShot,
  sort = [],
  wrapFields = [],
  onSortColumn,
}: {
  direction: Direction;
  statusDisplay?: StatusDisplay;
  onColumnContextMenu?: (event: MouseEvent, field: EffectiveField) => void;
  onOpenShot?: (shotId: string) => void;
  shotsPage?: ShotsPage;
  /** Column codes in display order; defaults to the saved page's order. */
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  onColumnOrder?: (order: string[]) => void;
  onColumnWidth?: (code: string, width: number) => void;
  /** The page's conditional formats, in order. */
  formats?: ConditionalFormat[];
  recordActions?: { onRecords: (event: MouseEvent, shots: Shot[]) => void; onBlank: (event: MouseEvent) => void };
  lockOf?: (shotId: string) => 'open' | 'locked' | 'system';
  /** Absent when the viewer cannot change locks. A system lock never toggles. */
  onToggleLock?: (shotId: string) => void;
  /** Absent when the viewer can only read records; double-clicking then explains why nothing opens. */
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
  /** The page sort; the header shows an arrow (and its level when there are several). */
  sort?: GroupLevel[];
  /** Text and multi-link fields this table view wraps. */
  wrapFields?: string[];
  /** A click on a column header: sort by it, or reverse it. */
  onSortColumn?: (code: string) => void;
}) {
  const { settings, groups, allShots } = shotsPage;
  const tableRef = useRef<HTMLDivElement>(null);
  const edit = useInlineEdit({ rootRef: tableRef, shots: allShots, lockOf, onEditShot, onToggleLock });
  const columns = columnOrder
    ? columnOrder.map(shotsPage.fieldByCode).filter((f): f is EffectiveField => !!f)
    : shotsPage.columns;
  const statusDisplay = statusDisplayOverride ?? settings.status?.statusDisplay ?? 'long';
  const widthOf = (code: string) =>
    trackWidth(columnWidths, code, code === 'status' ? STATUS_WIDTH[statusDisplay] : COLUMN_WIDTH[code] ?? '8rem');
  const layout = useColumnLayout({
    tableRef,
    order: columns.map((c) => c.code),
    onOrder: onColumnOrder,
    onWidth: onColumnWidth,
  });
  const template = `1.75rem ${columns.map((c) => widthOf(c.code)).join(' ')}`;
  const thumbColumn = columns.find((c) => c.type === 'media');
  const thumbTrack = thumbColumn ? trackWidth(columnWidths, thumbColumn.code, THUMB_COLUMN) : '0px';
  // Cells have 0.5rem padding on each side; the thumbnail fills the rest at 16:9 with 2px above and below.
  const baseRowHeight = `max(var(--sgp-row-compact), calc((${thumbTrack} - 1rem) * 9 / 16 + 4px))`;
  // A wrapping column lets a row grow past one line; otherwise every row keeps the same height.
  const wrapped = (col: EffectiveField) => canWrap(col) && wrapFields.includes(col.code);
  const wraps = columns.some(wrapped);
  const recordRowHeight = wraps ? { minHeight: baseRowHeight } : { height: baseRowHeight };
  const cellLine = direction.gridLines === 'full' ? 'border-r border-line' : '';
  const headerText = direction.headerCase === 'upper' ? 'text-xs uppercase tracking-wide' : 'text-sm';
  /** Numbers, and calculated fields that give a number, sit on the right, header and cells alike. */
  const numeric = (code: string) => {
    const field = shotsPage.fieldByCode(code) ?? shotsPage.fields.find((item) => item.code === code);
    return kindOf(field, shotsPage.fields) === 'number';
  };
  const align = (code: string) => (numeric(code) ? 'justify-end text-right' : '');
  const rowHeight = { height: 'var(--sgp-row-compact)' };

  const firstSummaryIndex = columns.findIndex((c) => settings[c.code]?.summary);
  const labelSpan = 1 + (firstSummaryIndex >= 0 ? firstSummaryIndex : columns.length);
  const trailingColumns = firstSummaryIndex >= 0 ? columns.slice(firstSummaryIndex) : [];

  const summaryCells = (rows: Shot[]) => {
    const summaries = summariesFor(shotsPage, rows);
    return trailingColumns.map((col) => {
      const summary = summaries.find((s) => s.field.code === col.code);
      return (
        <span key={col.code} className={`flex h-full items-center px-2 ${cellLine} ${align(col.code)}`}>
          {summary && <SummaryValue kind={summary.kind} value={summary.value} display={(shotsPage.fieldByCode(col.code) ?? col).display} />}
        </span>
      );
    });
  };

  const selection = useRowSelection(allShots.map((s) => s.id), [SELECTED_SHOT_ID]);
  const groupKey = allGroupIds(groups).join('\n');
  const [openGroups, toggleGroup] = useOpenSet(allGroupIds(groups), groupKey || 'flat');
  let rowIndex = 0;

  return (
    <div
      className="min-w-0 flex-1 overflow-auto bg-surface"
      data-record-surface
      {...selection.containerProps}
      onContextMenu={recordActions ? (event) => onShotSurfaceContextMenu(event, allShots, selection.isSelected, recordActions) : undefined}
    >
      <div ref={tableRef} className="relative min-w-max" role="table" aria-label="Shots">
        {layout.overlay}
        <div
          className={`sticky top-0 z-20 grid items-center border-b border-line-strong bg-surface-sunken font-medium text-fg-muted ${headerText}`}
          style={{ gridTemplateColumns: template, ...rowHeight }}
          role="row"
          data-block
        >
          <span className={`flex h-full items-center justify-center ${cellLine}`}>
            <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
          </span>
          {columns.map((col) => (
            <span
              key={col.code}
              {...layout.headerProps(col.code, col.label, col.type === 'media' ? undefined : onSortColumn)}
              className={`relative flex h-full min-w-0 cursor-grab items-center gap-1 px-2 hover:bg-row-hover ${cellLine} ${align(col.code)} ${
                layout.movingCode === col.code ? 'opacity-50' : ''
              }`}
              role="columnheader"
              aria-label={col.label}
              title={`${col.label}. ${col.type === 'calculated' ? 'Calculated field. ' : ''}${onSortColumn && col.type !== 'media' ? 'Click to sort, drag' : 'Drag'} to move, right-click for options`}
              onContextMenu={(event) => {
                if (!onColumnContextMenu) return;
                event.preventDefault();
                onColumnContextMenu(event, col);
              }}
            >
              {col.type === 'calculated' && <Icon name="square-function" size={12} className="shrink-0 text-fg-subtle" />}
              {col.type === 'media' ? (
                <Icon name="image" size={13} className="mx-auto shrink-0 text-fg-subtle" />
              ) : (
                <span className="truncate">{col.label}</span>
              )}
              <SortArrow sort={sort} code={col.code} />
              {layout.handle(col.code, col.label)}
            </span>
          ))}
        </div>

        {trailingColumns.length > 0 && (
          <div
            className="sticky z-10 grid items-center border-b border-line-strong bg-surface-sunken text-sm"
            style={{ gridTemplateColumns: template, top: 'var(--sgp-row-compact)', ...rowHeight }}
            aria-label="Totals"
            data-block
          >
            <span className="flex min-w-0 items-center gap-2 overflow-hidden px-2 font-semibold whitespace-nowrap" style={{ gridColumn: `1 / span ${labelSpan}` }}>
              Total
              <span className="text-xs font-normal text-fg-subtle">{allShots.length} shots on all pages</span>
            </span>
            {summaryCells(allShots)}
          </div>
        )}

        {(groups.length === 0 ? [{ id: 'all', label: '', detail: '', depth: 0, rows: allShots, children: [] } satisfies ShotGroup] : groups).map(function renderGroup(group) {
          const open = group.id === 'all' || openGroups.has(group.id);
          const shotRow = (shot: (typeof allShots)[number]) => {
              const selected = selection.isSelected(shot.id);
              const zebra = direction.zebra && rowIndex++ % 2 === 1;
              const format = formatsFor(formats, shot as unknown as Record<string, unknown>, shotsPage.fields);
              return (
                <div
                  key={shot.id}
                  role="row"
                  aria-selected={selected}
                  data-shot-id={shot.id}
                  onClick={(event) => selection.onRowClick(shot.id, event)}
                  onDoubleClick={(event) => edit.onRecordDoubleClick(shot.id, event)}
                  onMouseDown={selection.onRowMouseDown}
                  {...selection.itemProps(shot.id)}
                  className={`relative grid cursor-default ${wraps ? 'items-stretch' : 'items-center'} border-b border-line text-md ${
                    selected ? 'bg-row-selected' : zebra ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
                  } ${formatClass(format.row)}`}
                  style={{ gridTemplateColumns: template, ...recordRowHeight, ...styleCss(format.row) }}
                >
                  <span className={`flex h-full items-center justify-center ${cellLine}`}>
                    <RowTypeIcon icon="film" selected={selected} label={`Shot ${shot.code}`} />
                  </span>
                  {edit.lockedNotice(shot.id, true)}
                  {columns.map((col) => (
                    <span
                      key={col.code}
                      data-col={col.code}
                      className={`flex h-full min-w-0 items-center overflow-hidden px-2 ${wrapped(col) ? 'py-1' : ''} ${cellLine} ${align(col.code)} ${formatClass(format.cells[col.code])}`}
                      style={styleCss(format.cells[col.code])}
                      role="cell"
                    >
                      <EditableShotCell
                        field={col}
                        shot={shot}
                        direction={direction}
                        statusDisplay={statusDisplay}
                        onOpenShot={onOpenShot}
                        fields={shotsPage.fields}
                        alignEnd={numeric(col.code)}
                        wrap={wrapped(col)}
                        lock={lockOf?.(shot.id)}
                        {...edit.cellProps(shot, col)}
                      />
                    </span>
                  ))}
                </div>
              );
            };
          return (
          <div key={group.id} role="rowgroup">
            {group.id !== 'all' && (
            <div
              className="grid items-center border-b border-line bg-surface-raised text-sm"
              style={{ gridTemplateColumns: template, ...rowHeight }}
              data-block
            >
              <span className="flex items-center gap-2 px-2" style={{ gridColumn: `1 / span ${labelSpan}`, paddingLeft: `${0.5 + group.depth * 0.875}rem` }}>
                <button
                  className="flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
                  aria-label={open ? `Collapse ${group.label}` : `Expand ${group.label}`}
                  aria-expanded={open}
                  title="Collapse or expand. Cmd+click to collapse or expand every group at this level."
                  onClick={(event) => toggleGroup(group.id, event, idsAtDepth(groups, group.depth))}
                >
                  <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
                </button>
                <span className="font-semibold">{group.label}</span>
                {group.detail && <span className="text-fg-muted">{group.detail}</span>}
                <span className="text-xs text-fg-subtle">{group.rows.length} shots</span>
              </span>
              {summaryCells(group.rows)}
            </div>
            )}
            {open && (group.children.length > 0 ? group.children.map(renderGroup) : group.rows.map(shotRow))}
          </div>
          );
        })}
      </div>
      {edit.toast}
    </div>
  );
}

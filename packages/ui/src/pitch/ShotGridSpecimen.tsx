import type { ConditionalFormat, EffectiveField, Shot, StatusDisplay } from '@sgp/mock-data';
import { useRef, useState, type MouseEvent } from 'react';
import { CellEditor, commitField, fieldEditable, fieldEditText } from './cellEdit';
import { onShotSurfaceContextMenu } from './recordActions';
import { placeholderThumb } from './color';
import { trackWidth, useColumnLayout } from './columns';
import { formatClass, formatsFor, styleCss } from './conditionalFormat';
import { calculateField, formulaText } from './formulaValue';
import { allGroupIds, idsAtDepth, useOpenSet } from './grouping';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { StatusPill } from './StatusPill';
import { useToast } from './Toast';
import {
  assetNames,
  formatDate,
  getShotsPage,
  SELECTED_SHOT_ID,
  summariesFor,
  SUMMARY_LABEL,
  type ShotGroup,
  type ShotsPage,
} from './shotsPage';

const NUMERIC_COLUMNS = new Set(['frameIn', 'frameOut', 'totalFrames']);
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
  locked: '5.5rem',
};
const STATUS_WIDTH: Record<StatusDisplay, string> = { long: '8.5rem', short: '5rem', icon: '4rem' };

export function ShotCell({
  field,
  shot,
  direction,
  statusDisplay,
  onOpenShot,
  fields,
}: {
  field: EffectiveField;
  shot: Shot;
  direction: Direction;
  statusDisplay: StatusDisplay;
  onOpenShot?: (shotId: string) => void;
  /** Other fields, so a calculated field can use their formulas too. */
  fields?: EffectiveField[];
}) {
  if (field.type === 'calculated') {
    const value = calculateField(field, shot as unknown as Record<string, unknown>, fields ?? [field]);
    const text = formulaText(value);
    const dated = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value);
    return <span className={`tabular-nums ${dated ? '' : 'font-mono text-xs'}`}>{dated ? formatDate(value.slice(0, 10)) : text}</span>;
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
      return <span className="font-mono text-xs tabular-nums text-fg-muted">{shot.frameIn}</span>;
    case 'frameOut':
      return <span className="font-mono text-xs tabular-nums text-fg-muted">{shot.frameOut}</span>;
    case 'totalFrames':
      return <span className="font-mono text-xs tabular-nums">{shot.totalFrames}</span>;
    case 'dueDate':
      return <span className="tabular-nums">{formatDate(shot.dueDate)}</span>;
    case 'animationDue':
      return <span className="tabular-nums text-fg-muted">{formatDate(shot.animationDue)}</span>;
    case 'assetIds':
      return <span className="truncate text-fg-muted">{assetNames(shot.assetIds)}</span>;
    default:
      return <span className="truncate">{String(shot[field.code as keyof Shot] ?? '')}</span>;
  }
}

export function SummaryValue({ kind, value }: { kind: keyof typeof SUMMARY_LABEL; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-fg-subtle">{SUMMARY_LABEL[kind]}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{value.toLocaleString('en-US')}</span>
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

function EditableShotCell({
  field,
  shot,
  direction,
  statusDisplay,
  onOpenShot,
  fields,
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
  editing: boolean;
  flash?: { tone: 'ok' | 'bad'; n: number };
  onEdit: () => void;
  onCommit: (text: string, how: 'save' | 'cancel', tab: -1 | 0 | 1) => void;
}) {
  const editable = fieldEditable(field);
  return (
    <span
      className="relative flex h-full min-w-0 flex-1 items-center"
      data-edit-cell={editable ? `${shot.id}:${field.code}` : undefined}
      data-shot-id={shot.id}
      data-field={field.code}
      onDoubleClick={(event) => {
        if (!editable) return;
        event.preventDefault();
        event.stopPropagation();
        onEdit();
      }}
    >
      {editing ? (
        <CellEditor value={fieldEditText(field, shot)} numeric={field.type === 'number'} date={field.type === 'date'} onCommit={onCommit} />
      ) : (
        <ShotCell field={field} shot={shot} direction={direction} statusDisplay={statusDisplay} onOpenShot={onOpenShot} fields={fields} />
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

function LockControl({ state, onToggle }: { state: 'open' | 'locked' | 'system'; onToggle?: () => void }) {
  const locked = state !== 'open';
  return (
    <button
      className={`flex items-center gap-1 rounded-sm px-1 text-sm ${locked ? 'text-fg' : 'text-fg-subtle'} ${onToggle && state !== 'system' ? 'hover:bg-row-hover' : 'cursor-default'}`}
      aria-pressed={locked}
      aria-label={state === 'system' ? 'Locked by the system' : locked ? 'Unlock record' : 'Lock record'}
      title={state === 'system' ? 'Locked by the system. This cannot be unlocked.' : locked ? 'Unlock this record' : 'Lock this record'}
      disabled={!onToggle || state === 'system'}
      onClick={onToggle}
    >
      <Icon name={locked ? 'lock' : 'lock-open'} size={13} />
      <span className="text-xs">{state === 'system' ? 'System' : locked ? 'Locked' : 'Open'}</span>
    </button>
  );
}

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
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
}) {
  const [editing, setEditing] = useState<{ shotId: string; code: string } | null>(null);
  const [flashes, setFlashes] = useState<Record<string, { tone: 'ok' | 'bad'; n: number }>>({});
  const toast = useToast();
  const isLocked = (shotId: string) => (lockOf?.(shotId) ?? 'open') !== 'open';
  const startEdit = (shotId: string, field: EffectiveField) => {
    if (!fieldEditable(field)) return;
    if (isLocked(shotId)) {
      toast.show('Record is locked, contact your admin to unlock.', 'lock');
      return;
    }
    setEditing({ shotId, code: field.code });
  };
  const { settings, groups, allShots } = shotsPage;
  const columns = columnOrder
    ? columnOrder.map(shotsPage.fieldByCode).filter((f): f is EffectiveField => !!f)
    : shotsPage.columns;
  const statusDisplay = statusDisplayOverride ?? settings.status?.statusDisplay ?? 'long';
  const widthOf = (code: string) =>
    trackWidth(columnWidths, code, code === 'status' ? STATUS_WIDTH[statusDisplay] : COLUMN_WIDTH[code] ?? '8rem');
  const tableRef = useRef<HTMLDivElement>(null);
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
  const recordRowHeight = { height: `max(var(--sgp-row-compact), calc((${thumbTrack} - 1rem) * 9 / 16 + 4px))` };
  const cellLine = direction.gridLines === 'full' ? 'border-r border-line' : '';
  const headerText = direction.headerCase === 'upper' ? 'text-xs uppercase tracking-wide' : 'text-sm';
  const align = (code: string) => (NUMERIC_COLUMNS.has(code) ? 'justify-end' : '');
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
          {summary && <SummaryValue kind={summary.kind} value={summary.value} />}
        </span>
      );
    });
  };

  const markFlash = (key: string, tone: 'ok' | 'bad') =>
    setFlashes((all) => ({ ...all, [key]: { tone, n: (all[key]?.n ?? 0) + 1 } }));

  const finishEdit = (shot: Shot, field: EffectiveField, text: string, how: 'save' | 'cancel', tab: -1 | 0 | 1) => {
    const key = `${shot.id}:${field.code}`;
    if (how === 'cancel') {
      setEditing(null);
      return;
    }
    const result = commitField(field, text, shot, allShots, lockOf?.(shot.id) ?? 'open');
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
    const cells = [...document.querySelectorAll<HTMLElement>('[data-edit-cell]')].filter(
      (cell) => cell.dataset.editCell === key || !isLocked(cell.dataset.shotId ?? ''),
    );
    const index = cells.findIndex((cell) => cell.dataset.editCell === key);
    const next = cells[index + tab];
    if (next?.dataset.shotId && next.dataset.field) setEditing({ shotId: next.dataset.shotId, code: next.dataset.field });
    else setEditing(null);
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
              {...layout.headerProps(col.code, col.label)}
              className={`relative flex h-full min-w-0 cursor-grab items-center gap-1 px-2 hover:bg-row-hover ${cellLine} ${align(col.code)} ${
                layout.movingCode === col.code ? 'bg-accent-subtle text-fg' : ''
              }`}
              role="columnheader"
              aria-label={col.label}
              title={`${col.label}. ${col.type === 'calculated' ? 'Calculated field. ' : ''}Drag to move, right-click for options`}
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
              {col.code === 'code' && <Icon name="arrow-up" size={12} className="shrink-0 text-fg-subtle" />}
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
                  onMouseDown={selection.onRowMouseDown}
                  {...selection.itemProps(shot.id)}
                  className={`grid cursor-default items-center border-b border-line text-md ${
                    selected ? 'bg-row-selected' : zebra ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
                  } ${formatClass(format.row)}`}
                  style={{ gridTemplateColumns: template, ...recordRowHeight, ...styleCss(format.row) }}
                >
                  <span className={`flex h-full items-center justify-center ${cellLine}`}>
                    <RowTypeIcon icon="film" selected={selected} label={`Shot ${shot.code}`} />
                  </span>
                  {columns.map((col) => (
                    <span
                      key={col.code}
                      data-col={col.code}
                      className={`flex h-full min-w-0 items-center overflow-hidden px-2 ${cellLine} ${align(col.code)} ${formatClass(format.cells[col.code])}`}
                      style={styleCss(format.cells[col.code])}
                      role="cell"
                    >
                      {col.code === 'locked' ? (
                        <LockControl state={lockOf?.(shot.id) ?? 'open'} onToggle={onToggleLock ? () => onToggleLock(shot.id) : undefined} />
                      ) : (
                        <EditableShotCell
                          field={col}
                          shot={shot}
                          direction={direction}
                          statusDisplay={statusDisplay}
                          onOpenShot={onOpenShot}
                          fields={shotsPage.fields}
                          editing={editing?.shotId === shot.id && editing.code === col.code}
                          flash={flashes[`${shot.id}:${col.code}`]}
                          onEdit={() => startEdit(shot.id, col)}
                          onCommit={(text, how, tab) => finishEdit(shot, col, text, how, tab)}
                        />
                      )}
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
      {toast.element}
    </div>
  );
}

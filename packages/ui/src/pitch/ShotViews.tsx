import { sequences, statusValues, type ConditionalFormat, type EffectiveField, type Shot, type StatusDisplay } from '@sgp/mock-data';
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { formatClass, formatsFor, styleCss } from './conditionalFormat';
import { FieldMenu, packFields, rowTracks, type FieldMenuAction, type FieldMenuWrap } from './FieldMenu';
import { onShotSurfaceContextMenu } from './recordActions';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { personName } from './people';
import { EditableShotCell, lockText, SummaryValue, useInlineEdit } from './ShotGridSpecimen';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { StatusPill } from './StatusPill';
import { allGroupIds, idsAtDepth, useOpenSet } from './grouping';
import { getShotsPage, SELECTED_SHOT_ID, shotCellText, summariesFor, type ShotGroup, type ShotsPage } from './shotsPage';
import { canWrap, type WrapByPlace, type WrapPlace } from './wrap';

function TotalsBar({ shotsPage, selection }: { shotsPage: ShotsPage; selection: ReturnType<typeof useRowSelection> }) {
  const summaries = summariesFor(shotsPage, shotsPage.allShots);
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-4 border-b border-line-strong bg-surface-sunken px-3 text-sm"
      style={{ height: 'var(--sgp-row-compact)' }}
      aria-label="Totals"
      data-block
    >
      <span className="flex w-5 justify-center">
        <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
      </span>
      <span className="font-semibold">Total</span>
      <span className="text-xs text-fg-subtle">{shotsPage.allShots.length} shots on all pages</span>
      {summaries.map((s) => (
        <span key={s.field.code} className="flex items-baseline gap-1.5">
          <span className="text-xs text-fg-muted">{s.field.label}</span>
          <SummaryValue kind={s.kind} value={s.value} />
        </span>
      ))}
      {selection.count > 0 && <span className="ml-auto text-xs text-fg-muted">{selection.count} selected</span>}
    </div>
  );
}

const collapseTitle = 'Collapse or expand. Cmd+click to collapse or expand every group at this level.';

function shotsLabeled(groups: ShotGroup[], label: string): Shot[] {
  return groups.flatMap((group) => (group.label === label ? group.rows : shotsLabeled(group.children, label)));
}

function GroupHeader({
  group,
  shotsPage,
  expanded,
  onToggle,
}: {
  group: ShotGroup;
  shotsPage: ShotsPage;
  expanded: boolean;
  onToggle: (event: MouseEvent) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-sm" style={{ paddingLeft: `${group.depth * 0.875}rem` }} data-block>
      <button
        className="flex size-5 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
        aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
        aria-expanded={expanded}
        title={collapseTitle}
        onClick={onToggle}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      <span className="font-semibold">{group.label}</span>
      {group.detail && <span className="text-fg-muted">{group.detail}</span>}
      <span className="text-xs text-fg-subtle">{group.rows.length} shots</span>
        {summariesFor(shotsPage, group.rows).map((s) => (
        <span key={s.field.code} className="ml-2 flex items-baseline gap-1.5">
          <span className="text-xs text-fg-subtle">{s.field.label}</span>
          <SummaryValue kind={s.kind} value={s.value} />
        </span>
      ))}
    </div>
  );
}

export function ShotCardsView({
  direction,
  statusDisplay,
  columns,
  onOpenShot,
  shotsPage = getShotsPage(),
  recordActions,
  formats = [],
  bodyFields,
  onToggleBody,
  headerFields,
  onToggleHeader,
  lockOf,
  onEditShot,
  onToggleLock,
  onCommand,
  wrap = {},
  onToggleWrap,
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  /** Cards per row, 1-10. */
  columns: number;
  onOpenShot?: (shotId: string) => void;
  shotsPage?: ShotsPage;
  recordActions?: { onRecords: (event: MouseEvent, shots: Shot[]) => void; onBlank: (event: MouseEvent) => void };
  /** The page's conditional formats. Cell rules show only on fields this card displays. */
  formats?: ConditionalFormat[];
  /** Fields in the card body. Defaults to the page's saved card fields. */
  bodyFields?: string[];
  onToggleBody?: (code: string) => void;
  /** Fields in the card header. Defaults to the page's saved header fields. */
  headerFields?: string[];
  onToggleHeader?: (code: string) => void;
  lockOf?: LockOf;
  /** Absent for viewers who can only read records. */
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
  /** Absent for viewers who cannot lock or unlock records. */
  onToggleLock?: (shotId: string) => void;
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
  /** Text and multi-link fields that wrap in each place this view shows them, and the toggle from the right-click menu. */
  wrap?: WrapByPlace;
  onToggleWrap?: (place: WrapPlace, code: string) => void;
}) {
  const { groups, page, fieldByCode } = shotsPage;
  const choices = fieldChoices(shotsPage);
  const shown = (bodyFields ?? page.cardSettings?.expandedFields ?? []).filter((code) => choices.some((f) => f.code === code));
  const fields = shown.map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const headerShown = (headerFields ?? page.cardSettings?.titleFields ?? ['code', 'status']).filter((code) => choices.some((f) => f.code === code));
  const header = headerShown.map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const groupKey = allGroupIds(groups).join('\n');
  const cardIds = shotsPage.allShots.map((shot) => shot.id);
  // LMP_030's cards start collapsed to show both states; Cmd+click on an arrow still reaches every card.
  const startOpen = cardIds.filter((id) => !shotsLabeled(groups, 'LMP_030').some((shot) => shot.id === id));
  const [openGroups, toggleGroup] = useOpenSet(allGroupIds(groups), groupKey);
  const [openCards, toggleCard] = useOpenSet(startOpen, groupKey);
  const selection = useRowSelection(shotsPage.allShots.map((s) => s.id), [SELECTED_SHOT_ID], { drag: 'lasso' });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const edit = useInlineEdit({ rootRef: scrollerRef, shots: shotsPage.allShots, lockOf, onEditShot, onToggleLock });
  const [cardWidth, setCardWidth] = useState(280);
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[]; zone: Zone } | null>(null);
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const measure = () => {
      const gap = 12 * Math.max(0, columns - 1);
      setCardWidth(Math.max(160, (el.clientWidth - 24 - gap) / columns - 18));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [columns]);
  const widths = useMemo(() => fields.map((field) => cardFieldWidth(field, shotsPage.allShots, statusDisplay)), [fields, shotsPage.allShots, statusDisplay]);
  const packed = useMemo(() => packFields(widths, cardWidth).map((row) => row.map((index) => fields[index])), [widths, cardWidth, fields]);
  const tracks = useMemo(() => packFields(widths, cardWidth).map((row) => rowTracks(row, widths, cardWidth)), [widths, cardWidth]);

  return (
    <div
      ref={scrollerRef}
      className="min-w-0 flex-1 overflow-auto bg-surface"
      data-record-surface
      {...selection.containerProps}
      onContextMenu={(event) => {
        const shotEl = (event.target as HTMLElement).closest<HTMLElement>('[data-shot-id]');
        if (!shotEl) {
          if (recordActions) onShotSurfaceContextMenu(event, shotsPage.allShots, selection.isSelected, recordActions);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const shot = shotsPage.allShots.find((s) => s.id === shotEl.dataset.shotId);
        const selected = shotsPage.allShots.filter((s) => selection.isSelected(s.id));
        setMenu({ x: event.clientX, y: event.clientY, zone: zoneOf(event.target, 'body'), shots: shot && selected.some((s) => s.id === shot.id) ? selected : shot ? [shot] : [] });
      }}
    >
      {selection.lasso}
      <TotalsBar shotsPage={shotsPage} selection={selection} />
      <div className="flex flex-col gap-3 p-3">
        {(groups.length === 0 ? [{ id: 'all', label: '', detail: '', depth: 0, rows: shotsPage.allShots, children: [] } satisfies ShotGroup] : groups).map(function renderGroup(group) {
          const leaf = group.children.length === 0;
          return (
          <section key={group.id} className="flex flex-col gap-2">
            {group.id !== 'all' && (
            <GroupHeader
              group={group}
              shotsPage={shotsPage}
              expanded={openGroups.has(group.id)}
              onToggle={(event) => toggleGroup(group.id, event, idsAtDepth(groups, group.depth))}
            />
            )}
            {(group.id === 'all' || openGroups.has(group.id)) &&
              (leaf ? (
              <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {group.rows.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    open={openCards.has(shot.id)}
                    selected={selection.isSelected(shot.id)}
                    direction={direction}
                    statusDisplay={statusDisplay}
                    format={formatsFor(formats, shot as unknown as Record<string, unknown>, shotsPage.fields)}
                    headerFields={header}
                    packed={packed}
                    tracks={tracks}
                    fields={shotsPage.fields}
                    cellProps={edit.cellProps}
                    lockOf={lockOf}
                    headerWrap={wrap.cardHeader} bodyWrap={wrap.cardBody}
                    notice={edit.lockedNotice(shot.id)}
                    onDoubleClick={(event) => edit.onRecordDoubleClick(shot.id, event)}
                    onToggle={(event) => toggleCard(shot.id, event, cardIds)}
                    onOpen={onOpenShot}
                    onSelect={selection.onRowClick}
                    onMouseDown={selection.onRowMouseDown}
                    itemProps={selection.itemProps(shot.id)}
                  />
                ))}
              </div>
              ) : (
                <div className="flex flex-col gap-2">{group.children.map(renderGroup)}</div>
              ))}
          </section>
          );
        })}
      </div>
      {menu && (
        <FieldMenu
          x={menu.x}
          y={menu.y}
          fields={choices}
          sections={[
            menu.zone === 'header'
              ? { id: 'header', title: 'Inside the card header', selected: headerShown, onToggle: (code) => onToggleHeader?.(code) }
              : { id: 'body', title: 'Inside the card body', selected: shown, onToggle: (code) => onToggleBody?.(code) },
          ]}
          wrap={wrapMenu(shotsPage, wrap, menu.zone === 'header' ? 'cardHeader' : 'cardBody', onToggleWrap)}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
      {edit.toast}
    </div>
  );
}

type CellProps = ReturnType<ReturnType<typeof useInlineEdit>['cellProps']>;
type LockOf = (shotId: string) => 'open' | 'locked' | 'system';

/** Which part of a card or thumbnail a right-click landed on; the field menu edits that part. */
type Zone = 'header' | 'body' | 'inside' | 'below';

function zoneOf(target: EventTarget | null, fallback: Zone): Zone {
  return ((target as HTMLElement | null)?.closest<HTMLElement>('[data-card-zone]')?.dataset.cardZone as Zone | undefined) ?? fallback;
}

/**
 * One header value. The shot code stays a link that opens the shot; any other field edits on a double-click.
 * A status shortens to its icon when the card is narrow.
 */
function HeaderValue({
  field,
  shot,
  direction,
  statusDisplay,
  format,
  fields,
  onOpen,
  cellProps,
  lockOf,
  wraps,
}: {
  field: EffectiveField;
  shot: Shot;
  direction: Direction;
  statusDisplay: StatusDisplay;
  format: ReturnType<typeof formatsFor>;
  fields: EffectiveField[];
  onOpen?: (shotId: string) => void;
  cellProps: (shot: Shot, field: EffectiveField, slot?: string) => CellProps;
  lockOf?: LockOf;
  wraps: (field: EffectiveField) => boolean;
}) {
  if (field.code === 'code') {
    return (
      <button
        className={`min-w-0 truncate font-medium text-accent hover:underline ${formatClass(format.cells.code)}`}
        style={styleCss(format.cells.code)}
        onClick={() => onOpen?.(shot.id)}
      >
        {shot.code}
      </button>
    );
  }
  return (
    <span className={`inline-flex min-w-0 ${formatClass(format.cells[field.code])}`} style={styleCss(format.cells[field.code])}>
      <EditableShotCell
        field={field}
        shot={shot}
        direction={direction}
        statusDisplay={statusDisplay}
        fields={fields}
        inline
        wrap={wraps(field)}
        lock={lockOf?.(shot.id)}
        {...cellProps(shot, field, 'header')}
      >
        {field.code === 'status' ? (
          <>
            <span className="hidden @[15rem]:inline-flex">
              <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
            </span>
            <span className="inline-flex @[15rem]:hidden">
              <StatusPill code={shot.status} pillStyle={direction.pillStyle} display="icon" />
            </span>
          </>
        ) : undefined}
      </EditableShotCell>
    </span>
  );
}

function ShotCard({
  shot,
  open,
  selected,
  direction,
  statusDisplay,
  format,
  headerFields,
  packed,
  tracks,
  fields,
  cellProps,
  lockOf,
  headerWrap = [],
  bodyWrap = [],
  dragging = false,
  notice,
  onToggle,
  onOpen,
  onSelect,
  onMouseDown,
  onDoubleClick,
  itemProps,
}: {
  shot: Shot;
  open: boolean;
  selected: boolean;
  direction: Direction;
  statusDisplay: StatusDisplay;
  format: ReturnType<typeof formatsFor>;
  /** Header fields in order: the first at the left, the rest together at the right. */
  headerFields: EffectiveField[];
  packed: EffectiveField[][];
  tracks: string[];
  /** Every field, so calculated values can use one another. */
  fields: EffectiveField[];
  cellProps: (shot: Shot, field: EffectiveField, slot?: string) => CellProps;
  lockOf?: LockOf;
  /** Fields that wrap in the header, and in the body; each place has its own list. */
  headerWrap?: string[];
  bodyWrap?: string[];
  /** Being moved to another kanban column. */
  dragging?: boolean;
  /** Drawn over the whole card, such as the locked notice. */
  notice?: ReactNode;
  onToggle: (event: MouseEvent) => void;
  onOpen?: (shotId: string) => void;
  onSelect: (id: string, event: MouseEvent) => void;
  onMouseDown: (event: MouseEvent) => void;
  onDoubleClick?: (event: MouseEvent) => void;
  itemProps: Record<string, unknown>;
}) {
  const [lead, ...rest] = headerFields;
  const wraps = (field: EffectiveField) => canWrap(field) && bodyWrap.includes(field.code);
  const headerWraps = (field: EffectiveField) => canWrap(field) && headerWrap.includes(field.code);
  const valueProps = { shot, direction, statusDisplay, format, fields, onOpen, cellProps, lockOf, wraps: headerWraps };
  return (
    <article
      aria-selected={selected}
      data-shot-id={shot.id}
      data-card-zone="body"
      onClick={(event) => onSelect(shot.id, event)}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
      {...itemProps}
      className={`@container relative flex min-w-0 cursor-default flex-col gap-2 overflow-hidden rounded-lg border bg-surface-raised p-2 transition-opacity ${
        selected ? 'border-accent bg-row-selected' : 'border-line hover:border-line-strong'
      } ${dragging ? 'opacity-50' : ''} ${formatClass(format.row)}`}
      style={styleCss(format.row)}
    >
      {notice}
      <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1" data-card-zone="header">
        <button
          className="flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
          aria-label={open ? `Collapse ${shot.code}` : `Expand ${shot.code}`}
          aria-expanded={open}
          title={collapseTitle}
          onClick={onToggle}
        >
          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
        </button>
        <span className="hidden h-9 w-16 shrink-0 rounded-sm @[15rem]:block" style={{ background: placeholderThumb(shot.code) }} />
        <span className="flex w-4 shrink-0 justify-center">
          <RowTypeIcon icon="film" selected={selected} label={`Shot ${shot.code}`} />
        </span>
        {lead && <HeaderValue field={lead} {...valueProps} />}
        {rest.length > 0 && (
          // Extra header fields share the right side; when they do not fit beside the code they wrap to a second line.
          <span className="ml-auto flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1">
            {rest.map((field) => (
              <HeaderValue key={field.code} field={field} {...valueProps} />
            ))}
          </span>
        )}
      </div>
      {open && packed.length > 0 && (
        <div className="flex flex-col gap-y-1 border-t border-line pt-2 text-sm">
          {packed.map((row, rowIndex) => (
            <div key={row.map((field) => field.code).join('-')} className="grid items-baseline gap-x-4" style={{ gridTemplateColumns: tracks[rowIndex] }}>
              {row.map((field) => (
                <div key={field.code} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2">
                  <dt className="flex items-center gap-1 whitespace-nowrap text-fg-subtle">
                    {field.type === 'calculated' && <Icon name="square-function" size={12} />}
                    {field.label}
                  </dt>
                  <dd className={`min-w-0 ${wraps(field) ? 'whitespace-normal break-words' : 'truncate'} ${formatClass(format.cells[field.code])}`} style={styleCss(format.cells[field.code])}>
                    <EditableShotCell
                      field={field}
                      shot={shot}
                      direction={direction}
                      statusDisplay={statusDisplay}
                      fields={fields}
                      onOpenShot={onOpen}
                      inline
                      wrap={wraps(field)}
                      lock={lockOf?.(shot.id)}
                      {...cellProps(shot, field, 'body')}
                    />
                  </dd>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

/** Status, list, link, and person fields can head a kanban column. Plain text and ids cannot. */
export function kanbanFields(fields: EffectiveField[]) {
  return fields.filter((field) => field.code !== 'id' && (field.type === 'status' || field.type === 'list' || field.type === 'entity' || field.type === 'user'));
}

interface KanbanColumn {
  id: string;
  label: string;
  detail?: string;
  status?: string;
  shots: Shot[];
}

function kanbanColumnsFor(field: EffectiveField, page: ShotsPage): KanbanColumn[] {
  const shots = page.allShots;
  const valueOf = (shot: Shot) => String(shot[field.code as keyof Shot] ?? '');
  if (field.type === 'status' || field.type === 'list') {
    const codes = field.validValues ?? [];
    const known = new Set(codes);
    const columns: KanbanColumn[] = codes.map((code) => ({
      id: code,
      label: field.type === 'status' ? statusValues.find((item) => item.code === code)?.label ?? code : code,
      status: field.type === 'status' ? code : undefined,
      shots: shots.filter((shot) => valueOf(shot) === code),
    }));
    const rest = shots.filter((shot) => !known.has(valueOf(shot)));
    if (rest.length) columns.push({ id: 'none', label: 'None', shots: rest });
    return columns;
  }
  if (field.code === 'sequenceId') {
    const projectId = page.page.query.filters.find((filter) => filter.field === 'projectId')?.value;
    return sequences
      .filter((seq) => seq.projectId === projectId)
      .map((seq) => ({ id: seq.id, label: seq.code, detail: seq.name, shots: shots.filter((shot) => shot.sequenceId === seq.id) }));
  }
  const ids = [...new Set(shots.map(valueOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const columns = ids.map((id) => ({
    id,
    label: field.type === 'user' ? personName(id) : id,
    shots: shots.filter((shot) => valueOf(shot) === id),
  }));
  const blank = shots.filter((shot) => !valueOf(shot));
  if (blank.length) columns.push({ id: 'none', label: 'None', shots: blank });
  return columns;
}

/**
 * Dragging a kanban card sets the column's value on the shot (its status, by default) and places the card where it
 * was dropped, so the order inside a column is yours. Dragging within a column only reorders it. Dragging one of
 * several selected cards moves them all. Locked records stay put and say so on themselves.
 */
function useKanbanMove({
  shots,
  isSelected,
  canChange,
  onMove,
}: {
  shots: Shot[];
  isSelected: (id: string) => boolean;
  canChange: (shotId: string) => boolean;
  /** `before` is the card the moving cards now sit above, or null for the end of the column. */
  onMove: (shots: Shot[], columnId: string, before: string | null) => void;
}) {
  const [drag, setDrag] = useState<{ ids: string[]; over: string | null; x: number; y: number; line: number | null; noop: boolean } | null>(null);
  const justDragged = useRef(false);

  /** The gap under the pointer among the column's other cards, and where its hairline sits. */
  const landing = (list: HTMLElement, ids: string[], y: number) => {
    const all = [...list.querySelectorAll<HTMLElement>(':scope > [data-shot-id]')];
    const cards = all.filter((card) => !ids.includes(card.dataset.shotId!));
    const rects = cards.map((card) => card.getBoundingClientRect());
    let index = rects.findIndex((rect) => y < rect.top + rect.height / 2);
    if (index < 0) index = rects.length;
    const box = list.getBoundingClientRect();
    const above = rects[index - 1];
    const below = rects[index];
    const edge = above && below ? (above.bottom + below.top) / 2 : below ? below.top - 4 : above ? above.bottom + 4 : box.top + 4;
    // Dropping a card back where it already is changes nothing.
    const first = all.findIndex((card) => ids.includes(card.dataset.shotId!));
    const before = cards[index]?.dataset.shotId ?? null;
    const noop = first >= 0 && all.filter((card, i) => i < first && !ids.includes(card.dataset.shotId!)).length === index;
    // The list scrolls and clips, so a line above the first card stays just inside its top edge.
    return { top: Math.max(1, edge - box.top) + list.scrollTop, before, noop };
  };

  const startDrag = (shotId: string, event: React.PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest('button, a, input, select, textarea, [role="dialog"]')) return;
    const x0 = event.clientX;
    const y0 = event.clientY;
    const ids = isSelected(shotId) ? shots.filter((shot) => isSelected(shot.id)).map((shot) => shot.id) : [shotId];
    let started = false;
    let over: string | null = null;
    let before: string | null = null;
    let noop = true;
    const columnAt = (x: number, y: number) => {
      const element = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-kanban-column]') ?? null;
      return element?.dataset.kanbanColumn === 'none' ? null : element;
    };
    const move = (e: PointerEvent) => {
      if (!started) {
        if (Math.hypot(e.clientX - x0, e.clientY - y0) < 5) return;
        started = true;
        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';
      }
      const column = columnAt(e.clientX, e.clientY);
      const list = column?.querySelector<HTMLElement>('[data-kanban-list]') ?? null;
      over = column?.dataset.kanbanColumn ?? null;
      const spot = list ? landing(list, ids, e.clientY) : null;
      before = spot?.before ?? null;
      noop = !spot || spot.noop;
      setDrag({ ids, over, x: e.clientX, y: e.clientY, line: spot?.top ?? null, noop });
    };
    let done = false;
    const finish = (commit: boolean) => {
      if (done) return;
      done = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('keydown', key, true);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setDrag(null);
      if (!started) return;
      justDragged.current = true;
      if (!commit || !over || noop) return;
      const allowed = shots.filter((shot) => ids.includes(shot.id) && canChange(shot.id));
      if (allowed.length) onMove(allowed, over, before);
    };
    const up = () => finish(true);
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      finish(false);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key, true);
  };

  const moving = drag ? shots.filter((shot) => drag.ids.includes(shot.id)) : [];
  const isTarget = (columnId: string) => !!drag && drag.over === columnId && !drag.noop;

  return {
    startDrag,
    isDragging: (id: string) => !!drag?.ids.includes(id),
    /** The column the cards would land in, when the drop changes something. */
    isTarget,
    /** The standard drop hairline: it follows the pointer to the gap the cards will drop into. */
    indicator: (columnId: string) =>
      isTarget(columnId) && drag?.line != null ? (
        <span
          aria-hidden
          className="pointer-events-none absolute right-0 left-0 z-10 h-px bg-accent transition-[top] duration-100 ease-out"
          style={{ top: drag.line }}
        >
          <span className="absolute top-1/2 -left-0.5 size-1.5 -translate-y-1/2 rounded-full bg-accent" />
        </span>
      ) : null,
    /** A click that ends a drag is not a selection click. */
    takeClick: () => {
      const was = justDragged.current;
      justDragged.current = false;
      return was;
    },
    ghost: drag ? (
      <span
        aria-hidden
        className="pointer-events-none fixed z-50 rounded-sm border border-accent bg-surface-raised px-2 py-0.5 text-sm font-medium text-fg"
        style={{ left: drag.x + 12, top: drag.y + 12, boxShadow: 'var(--sgp-shadow-overlay)' }}
      >
        {moving.length === 1 ? moving[0]!.code : `${moving.length} shots`}
      </span>
    ) : null,
  };
}

export function ShotKanbanView({
  direction,
  statusDisplay,
  fieldCode,
  visibleColumns,
  onOpenShot,
  shotsPage = getShotsPage(),
  recordActions,
  formats = [],
  bodyFields,
  onToggleBody,
  headerFields,
  onToggleHeader,
  cardOrder = [],
  onCardOrder,
  lockOf,
  onEditShot,
  onToggleLock,
  onCommand,
  wrap = {},
  onToggleWrap,
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  fieldCode: string;
  visibleColumns: number;
  onOpenShot?: (shotId: string) => void;
  shotsPage?: ShotsPage;
  recordActions?: { onRecords: (event: MouseEvent, shots: Shot[]) => void; onBlank: (event: MouseEvent) => void };
  formats?: ConditionalFormat[];
  bodyFields?: string[];
  onToggleBody?: (code: string) => void;
  headerFields?: string[];
  onToggleHeader?: (code: string) => void;
  /** Card order set by dropping cards; empty follows the page sort. */
  cardOrder?: string[];
  onCardOrder?: (order: string[]) => void;
  lockOf?: LockOf;
  /** Absent for viewers who can only read records; then cards do not move between columns either. */
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
  /** Absent for viewers who cannot lock or unlock records. */
  onToggleLock?: (shotId: string) => void;
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
  /** Text and multi-link fields that wrap in each place this view shows them, and the toggle from the right-click menu. */
  wrap?: WrapByPlace;
  onToggleWrap?: (place: WrapPlace, code: string) => void;
}) {
  const { page, fieldByCode } = shotsPage;
  const choices = fieldChoices(shotsPage);
  const shown = (bodyFields ?? page.cardSettings?.expandedFields ?? []).filter((code) => choices.some((field) => field.code === code));
  const fields = shown.map(fieldByCode).filter((field): field is EffectiveField => !!field);
  const headerShown = (headerFields ?? page.cardSettings?.titleFields ?? ['code', 'status']).filter((code) => choices.some((f) => f.code === code));
  const header = headerShown.map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const field = fieldByCode(fieldCode) ?? shotsPage.fields.find((item) => item.code === 'status')!;
  // Cards keep the order they were dropped in; any shot not placed yet follows the page sort after them.
  const sortedIds = shotsPage.allShots.map((shot) => shot.id);
  const rank = [...cardOrder.filter((id) => sortedIds.includes(id)), ...sortedIds.filter((id) => !cardOrder.includes(id))];
  const rankOf = new Map(rank.map((id, index) => [id, index]));
  const columns = kanbanColumnsFor(field, shotsPage).map((column) => ({
    ...column,
    shots: [...column.shots].sort((a, b) => (rankOf.get(a.id) ?? 0) - (rankOf.get(b.id) ?? 0)),
  }));
  const visible = Math.min(Math.max(1, visibleColumns), Math.max(1, columns.length));
  const [start, setStart] = useState(0);
  const offset = Math.min(start, Math.max(0, columns.length - visible));
  const windowColumns = columns.slice(offset, offset + visible);
  const cardIds = shotsPage.allShots.map((shot) => shot.id);
  const [openCards, toggleCard] = useOpenSet(cardIds, field.code);
  const selection = useRowSelection(cardIds, [SELECTED_SHOT_ID], { drag: 'lasso' });
  const boardRef = useRef<HTMLDivElement>(null);
  const edit = useInlineEdit({ rootRef: boardRef, shots: shotsPage.allShots, lockOf, onEditShot, onToggleLock });
  const [cardWidth, setCardWidth] = useState(220);
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[]; zone: Zone } | null>(null);
  const move = useKanbanMove({
    shots: shotsPage.allShots,
    isSelected: selection.isSelected,
    canChange: edit.canChange,
    onMove: (moving, columnId, before) => {
      for (const shot of moving) {
        if (String(shot[field.code as keyof Shot] ?? '') === columnId) continue;
        onEditShot?.(shot.id, { [field.code]: columnId } as Partial<Shot>);
        edit.flash(`${shot.id}:${field.code}`, 'ok');
      }
      const ids = moving.map((shot) => shot.id);
      const rest = rank.filter((id) => !ids.includes(id));
      const target = columns.find((column) => column.id === columnId);
      const lastInColumn = target?.shots.filter((shot) => !ids.includes(shot.id)).at(-1)?.id;
      const at = before ? rest.indexOf(before) : lastInColumn ? rest.indexOf(lastInColumn) + 1 : rest.length;
      onCardOrder?.([...rest.slice(0, at), ...ids, ...rest.slice(at)]);
    },
  });
  useLayoutEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const measure = () => setCardWidth(Math.max(140, (el.clientWidth - 24) / visible - 28));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);
  const widths = useMemo(() => fields.map((item) => cardFieldWidth(item, shotsPage.allShots, statusDisplay)), [fields, shotsPage.allShots, statusDisplay]);
  const packed = useMemo(() => packFields(widths, cardWidth).map((row) => row.map((index) => fields[index])), [widths, cardWidth, fields]);
  const tracks = useMemo(() => packFields(widths, cardWidth).map((row) => rowTracks(row, widths, cardWidth)), [widths, cardWidth]);
  const canEarlier = offset > 0;
  const canLater = offset + visible < columns.length;
  const nudge = (delta: number) => setStart(Math.min(Math.max(0, columns.length - visible), offset + delta));

  return (
    <div
      className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface"
      data-record-surface
      {...selection.containerProps}
      onContextMenu={(event) => {
        const shotEl = (event.target as HTMLElement).closest<HTMLElement>('[data-shot-id]');
        if (!shotEl) {
          if (recordActions) onShotSurfaceContextMenu(event, shotsPage.allShots, selection.isSelected, recordActions);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const shot = shotsPage.allShots.find((item) => item.id === shotEl.dataset.shotId);
        const selected = shotsPage.allShots.filter((item) => selection.isSelected(item.id));
        setMenu({ x: event.clientX, y: event.clientY, zone: zoneOf(event.target, 'body'), shots: shot && selected.some((item) => item.id === shot.id) ? selected : shot ? [shot] : [] });
      }}
    >
      {selection.lasso}
      {move.ghost}
      <TotalsBar shotsPage={shotsPage} selection={selection} />
      <div className="flex min-h-0 flex-1 items-stretch gap-1 p-3">
        {columns.length > visible && (
          <button
            className="flex w-7 shrink-0 items-center justify-center rounded-md border border-line text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40"
            aria-label="Show earlier columns"
            disabled={!canEarlier}
            onClick={() => nudge(-1)}
          >
            <Icon name="chevron-left" />
          </button>
        )}
        <div ref={boardRef} className="grid min-h-0 min-w-0 flex-1 gap-3" style={{ gridTemplateColumns: `repeat(${visible}, minmax(0, 1fr))` }}>
          {windowColumns.map((column) => (
            <section
              key={column.id}
              data-kanban-column={column.id}
              className={`flex min-h-0 min-w-0 flex-col gap-2 rounded-md p-2 transition-colors ${
                move.isTarget(column.id) ? 'bg-accent-subtle' : 'bg-surface-sunken'
              }`}
              aria-label={column.label}
            >
              <header className="flex items-center gap-2 px-1 text-sm">
                {column.status ? (
                  <StatusPill code={column.status} pillStyle={direction.pillStyle} display={statusDisplay} />
                ) : (
                  <span className="min-w-0 truncate font-semibold">{column.label}</span>
                )}
                {column.detail && <span className="min-w-0 truncate text-fg-muted">{column.detail}</span>}
                <span className="ml-auto shrink-0 text-xs text-fg-subtle">{column.shots.length}</span>
              </header>
              {/* Cards keep their full height; a column that runs out of room scrolls instead. */}
              <div className="relative flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto [&>article]:shrink-0" data-kanban-list={column.id}>
                {move.indicator(column.id)}
                {column.shots.length === 0 && <p className="px-1 text-sm text-fg-subtle">No shots</p>}
                {column.shots.map((shot) => (
                  <ShotCard
                    key={shot.id}
                    shot={shot}
                    open={openCards.has(shot.id)}
                    selected={selection.isSelected(shot.id)}
                    direction={direction}
                    statusDisplay={statusDisplay}
                    format={formatsFor(formats, shot as unknown as Record<string, unknown>, shotsPage.fields)}
                    headerFields={header}
                    packed={packed}
                    tracks={tracks}
                    fields={shotsPage.fields}
                    cellProps={edit.cellProps}
                    lockOf={lockOf}
                    headerWrap={wrap.kanbanHeader} bodyWrap={wrap.kanbanBody}
                    notice={edit.lockedNotice(shot.id)}
                    onDoubleClick={(event) => edit.onRecordDoubleClick(shot.id, event)}
                    onToggle={(event) => toggleCard(shot.id, event, cardIds)}
                    onOpen={onOpenShot}
                    onSelect={(id, event) => {
                      if (!move.takeClick()) selection.onRowClick(id, event);
                    }}
                    onMouseDown={selection.onRowMouseDown}
                    dragging={move.isDragging(shot.id)}
                    itemProps={{
                      ...selection.itemProps(shot.id),
                      // Pressing a card and dragging moves it to another column, instead of drawing a selection box.
                      onPointerDown: (event: React.PointerEvent<HTMLElement>) => onEditShot && move.startDrag(shot.id, event),
                      title: onEditShot ? 'Drag to another column to change it' : undefined,
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
        {columns.length > visible && (
          <button
            className="flex w-7 shrink-0 items-center justify-center rounded-md border border-line text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40"
            aria-label="Show later columns"
            disabled={!canLater}
            onClick={() => nudge(1)}
          >
            <Icon name="chevron-right" />
          </button>
        )}
      </div>
      {menu && (
        <FieldMenu
          x={menu.x}
          y={menu.y}
          fields={choices}
          sections={[
            menu.zone === 'header'
              ? { id: 'header', title: 'Inside the kanban header', selected: headerShown, onToggle: (code) => onToggleHeader?.(code) }
              : { id: 'body', title: 'Inside the kanban body', selected: shown, onToggle: (code) => onToggleBody?.(code) },
          ]}
          wrap={wrapMenu(shotsPage, wrap, menu.zone === 'header' ? 'kanbanHeader' : 'kanbanBody', onToggleWrap)}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
      {edit.toast}
    </div>
  );
}

export function ShotThumbsView({
  direction,
  statusDisplay,
  size,
  onOpenShot,
  shotsPage = getShotsPage(),
  recordActions,
  formats = [],
  insideFields = [],
  belowFields = [],
  onPlace,
  lockOf,
  onEditShot,
  onToggleLock,
  onCommand,
  wrap = {},
  onToggleWrap,
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  /** Thumbnail width in pixels. */
  size: number;
  onOpenShot?: (shotId: string) => void;
  shotsPage?: ShotsPage;
  recordActions?: { onRecords: (event: MouseEvent, shots: Shot[]) => void; onBlank: (event: MouseEvent) => void };
  /** The page's conditional formats. A field's format shows wherever that field is placed. */
  formats?: ConditionalFormat[];
  insideFields?: string[];
  belowFields?: string[];
  /** Show or hide a field in one place (on the image or below it); the other place is not affected. */
  onPlace?: (zone: 'inside' | 'below', code: string) => void;
  lockOf?: LockOf;
  /** Absent for viewers who can only read records. */
  onEditShot?: (shotId: string, patch: Partial<Shot>) => void;
  /** Absent for viewers who cannot lock or unlock records. */
  onToggleLock?: (shotId: string) => void;
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
  /** Text and multi-link fields that wrap in each place this view shows them, and the toggle from the right-click menu. */
  wrap?: WrapByPlace;
  onToggleWrap?: (place: WrapPlace, code: string) => void;
}) {
  const { groups, fieldByCode } = shotsPage;
  const choices = fieldChoices(shotsPage);
  const placed = (codes: string[]) => codes.map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const inside = placed(insideFields);
  const below = placed(belowFields);
  const insideRoom = Math.max(48, size - 12);
  const belowFirst = Math.max(48, size - 24);
  const belowRest = Math.max(48, size - 4);
  const groupKey = allGroupIds(groups).join('\n');
  const [openGroups, toggleGroup] = useOpenSet(allGroupIds(groups), groupKey);
  const selection = useRowSelection(shotsPage.allShots.map((s) => s.id), [SELECTED_SHOT_ID], { drag: 'lasso' });
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[]; zone: Zone } | null>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const edit = useInlineEdit({ rootRef: wallRef, shots: shotsPage.allShots, lockOf, onEditShot, onToggleLock });
  const wrapsInside = (field: EffectiveField) => canWrap(field) && (wrap.thumbInside ?? []).includes(field.code);
  const wrapsBelow = (field: EffectiveField) => canWrap(field) && (wrap.thumbBelow ?? []).includes(field.code);

  return (
    <div
      ref={wallRef}
      className="min-w-0 flex-1 overflow-auto bg-surface"
      data-record-surface
      {...selection.containerProps}
      onContextMenu={(event) => {
        const shotEl = (event.target as HTMLElement).closest<HTMLElement>('[data-shot-id]');
        if (!shotEl) {
          if (recordActions) onShotSurfaceContextMenu(event, shotsPage.allShots, selection.isSelected, recordActions);
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        const shot = shotsPage.allShots.find((s) => s.id === shotEl.dataset.shotId);
        const selected = shotsPage.allShots.filter((s) => selection.isSelected(s.id));
        setMenu({ x: event.clientX, y: event.clientY, zone: zoneOf(event.target, 'below'), shots: shot && selected.some((s) => s.id === shot.id) ? selected : shot ? [shot] : [] });
      }}
    >
      {selection.lasso}
      <TotalsBar shotsPage={shotsPage} selection={selection} />
      <div className="flex flex-col gap-3 p-3">
        {(groups.length === 0 ? [{ id: 'all', label: '', detail: '', depth: 0, rows: shotsPage.allShots, children: [] } satisfies ShotGroup] : groups).map(function renderGroup(group) {
          const leaf = group.children.length === 0;
          return (
          <section key={group.id} className="flex flex-col gap-2">
            {group.id !== 'all' && (
            <GroupHeader
              group={group}
              shotsPage={shotsPage}
              expanded={openGroups.has(group.id)}
              onToggle={(event) => toggleGroup(group.id, event, idsAtDepth(groups, group.depth))}
            />
            )}
            {(group.id === 'all' || openGroups.has(group.id)) &&
              (leaf ? (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${size}px)` }}>
                {group.rows.map((shot) => {
                  const selected = selection.isSelected(shot.id);
                  const format = formatsFor(formats, shot as unknown as Record<string, unknown>, shotsPage.fields);
                  const rowStyle = styleCss(format.row);
                  const thumbImage = placeholderThumb(shot.code);
                  const belowLayout = thumbLayout(below, shot, statusDisplay, belowRest, belowFirst, true);
                  const insideLayout = thumbLayout(inside, shot, statusDisplay, insideRoom);
                  return (
                    <figure
                      key={shot.id}
                      data-shot-id={shot.id}
                      aria-selected={selected}
                      onClick={(event) => selection.onRowClick(shot.id, event)}
                      onMouseDown={selection.onRowMouseDown}
                      {...selection.itemProps(shot.id)}
                      className={`group relative flex cursor-default flex-col gap-1.5 rounded-md ${formatClass(format.row)}`}
                      style={rowStyle}
                    >
                      {edit.lockedNotice(shot.id)}
                      <div
                        title="Click to select, double-click to open"
                        data-card-zone="inside"
                        onDoubleClick={() => onOpenShot?.(shot.id)}
                        className={`relative aspect-video cursor-pointer rounded-md ring-2 ${
                          selected ? 'ring-accent' : 'ring-transparent group-hover:ring-line-strong'
                        }`}
                        style={{ backgroundImage: rowStyle.backgroundImage ? `${rowStyle.backgroundImage}, ${thumbImage}` : thumbImage, boxShadow: rowStyle.boxShadow }}
                      >
                        {insideLayout.packed.length > 0 && (
                          <span className="absolute right-1.5 bottom-1.5 left-1.5 flex flex-col items-start gap-0.5">
                            {insideLayout.packed.map((row, rowIndex) => (
                              <span key={row.map((field) => field.code).join('-')} className="grid justify-start gap-x-1" style={{ gridTemplateColumns: insideLayout.tracks[rowIndex] }}>
                                {row.map((field) => (
                                  <span
                                    key={field.code}
                                    className={`min-w-0 rounded-sm bg-surface-sunken/80 px-1 text-left font-mono text-xs tabular-nums text-fg ${wrapsInside(field) ? 'whitespace-normal break-words' : insideLayout.clips.get(field.code) ? 'truncate' : 'whitespace-nowrap'} ${formatClass(format.cells[field.code])}`}
                                    style={styleCss(format.cells[field.code])}
                                  >
                                    {field.code === 'locked'
                                      ? lockText(lockOf?.(shot.id))
                                      : field.code === 'totalFrames' && !field.display
                                        ? `${shotCellText(field, shot, statusDisplay, shotsPage.fields)}f`
                                        : shotCellText(field, shot, statusDisplay, shotsPage.fields)}
                                  </span>
                                ))}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <figcaption
                        className="flex flex-col gap-0.5 px-0.5 text-sm"
                        data-card-zone="below"
                        onDoubleClick={(event) => edit.onRecordDoubleClick(shot.id, event)}
                      >
                        {(belowLayout.packed.length > 0 ? belowLayout.packed : [[]]).map((row, rowIndex) => (
                          <span key={row.map((field) => field.code).join('-') || 'icon'} className={rowIndex === 0 ? 'flex items-center gap-1' : 'grid items-center gap-x-2'} style={rowIndex === 0 ? undefined : { gridTemplateColumns: belowLayout.tracks[rowIndex] }}>
                            {rowIndex === 0 && (
                              <span className="flex w-4 shrink-0 justify-center">
                                <RowTypeIcon icon="film" selected={selected} label={`Shot ${shot.code}`} />
                              </span>
                            )}
                            {rowIndex === 0 ? (
                              <span className="grid min-w-0 items-center gap-x-2" style={{ gridTemplateColumns: belowLayout.tracks[0] }}>
                                {row.map((field) => thumbField(field, shot, direction, statusDisplay, format, belowLayout.clips, onOpenShot, edit.cellProps, lockOf, shotsPage.fields, wrapsBelow(field)))}
                              </span>
                            ) : (
                              row.map((field) => thumbField(field, shot, direction, statusDisplay, format, belowLayout.clips, onOpenShot, edit.cellProps, lockOf, shotsPage.fields, wrapsBelow(field)))
                            )}
                          </span>
                        ))}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
              ) : (
                <div className="flex flex-col gap-2">{group.children.map(renderGroup)}</div>
              ))}
          </section>
          );
        })}
      </div>
      {menu && (
        <FieldMenu
          x={menu.x}
          y={menu.y}
          fields={choices}
          sections={[
            menu.zone === 'inside'
              ? { id: 'inside', title: 'Inside the thumbnail', selected: insideFields, onToggle: (code) => onPlace?.('inside', code) }
              : { id: 'below', title: 'Below the thumbnail', selected: belowFields, onToggle: (code) => onPlace?.('below', code) },
          ]}
          wrap={wrapMenu(shotsPage, wrap, menu.zone === 'inside' ? 'thumbInside' : 'thumbBelow', onToggleWrap)}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
      {edit.toast}
    </div>
  );
}

/**
 * Every field Manage fields lists (the same `fields`), so a card or thumbnail can show any of them: page columns first,
 * then the rest by name. Only the thumbnail is left out, because it is already the card's image.
 */
function fieldChoices(shotsPage: ShotsPage) {
  const eligible = shotsPage.fields.filter((field) => field.type !== 'media');
  const inColumns = shotsPage.columns.map((column) => eligible.find((field) => field.code === column.code)).filter((field): field is EffectiveField => !!field);
  const rest = eligible.filter((field) => !inColumns.includes(field)).sort((a, b) => a.label.localeCompare(b.label));
  return [...inColumns, ...rest].map((field) => ({ code: field.code, label: field.label }));
}

/** Card columns stay compact: a long value is shortened so several fields can share a row. */
function cardFieldWidth(field: EffectiveField, shots: Shot[], statusDisplay: StatusDisplay) {
  if (field.type === 'status') return 156;
  const longest = Math.max(field.label.length, ...shots.map((shot) => shotCellText(field, shot, statusDisplay).length));
  return Math.min(340, Math.max(108, Math.min(longest, 36) * 7.2 + 36));
}

/** This thumbnail's own value. Fields wrap to the next row; only a value wider than the thumbnail is shortened. */
function thumbValueWidth(field: EffectiveField, shot: Shot, statusDisplay: StatusDisplay, labeled: boolean) {
  const text = field.code === 'totalFrames' && !field.display && !labeled ? `${shotCellText(field, shot, statusDisplay)}f` : shotCellText(field, shot, statusDisplay);
  const pad = field.type === 'status' ? 26 : 8;
  // Below the image a field reads like a card body: its name, then its value.
  const label = labeled ? field.label.length * 7.2 + 8 + (field.type === 'calculated' ? 16 : 0) : 0;
  return Math.ceil(Math.max(1, text.length) * 7.2 + pad + label);
}

function thumbLayout(fields: EffectiveField[], shot: Shot, statusDisplay: StatusDisplay, room: number, firstRoom = room, labeled = false) {
  const widths = fields.map((field) => thumbValueWidth(field, shot, statusDisplay, labeled));
  const rows = packThumbRows(widths, firstRoom, room);
  const clips = new Map<string, boolean>();
  rows.forEach((row, rowIndex) => {
    const limit = rowIndex === 0 ? firstRoom : room;
    row.forEach((index) => clips.set(fields[index].code, widths[index] > limit));
  });
  return {
    packed: rows.map((row) => row.map((index) => fields[index])),
    tracks: rows.map((row, rowIndex) => {
      const limit = rowIndex === 0 ? firstRoom : room;
      return row.map((index) => `${Math.min(widths[index], limit)}px`).join(' ');
    }),
    clips,
  };
}

/** The first row is narrower because the record icon sits at its left. Later rows use the full thumbnail width. */
function packThumbRows(widths: number[], firstRoom: number, restRoom: number, gap = 8) {
  const rows: number[][] = [];
  let current: number[] = [];
  let used = 0;
  const limit = () => (rows.length === 0 ? firstRoom : restRoom);
  widths.forEach((width, index) => {
    const cap = Math.min(width, limit());
    const next = current.length ? used + gap + cap : cap;
    if (current.length && next > limit()) {
      rows.push(current);
      current = [index];
      used = Math.min(width, limit());
    } else {
      current.push(index);
      used = current.length === 1 ? cap : next;
    }
  });
  if (current.length) rows.push(current);
  return rows;
}

function thumbField(
  field: EffectiveField,
  shot: Shot,
  direction: Direction,
  statusDisplay: StatusDisplay,
  format: ReturnType<typeof formatsFor>,
  clips: Map<string, boolean>,
  onOpenShot: ((shotId: string) => void) | undefined,
  cellProps: (shot: Shot, field: EffectiveField, slot?: string) => CellProps,
  lockOf: LockOf | undefined,
  fields: EffectiveField[],
  wrap: boolean,
) {
  const clip = wrap ? 'whitespace-normal break-words' : clips.get(field.code) ? 'truncate' : 'whitespace-nowrap';
  const value =
    field.code === 'code' ? (
      <button
        className={`min-w-0 text-left font-medium text-accent hover:underline ${clip} ${formatClass(format.cells.code)}`}
        style={styleCss(format.cells.code)}
        onClick={() => onOpenShot?.(shot.id)}
      >
        {shot.code}
      </button>
    ) : (
      <span className={`min-w-0 text-left ${clip} ${formatClass(format.cells[field.code])}`} style={styleCss(format.cells[field.code])}>
        <EditableShotCell field={field} shot={shot} direction={direction} statusDisplay={statusDisplay} fields={fields} inline wrap={wrap} lock={lockOf?.(shot.id)} {...cellProps(shot, field, 'below')}>
          {field.code === 'status' ? (
            <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
          ) : field.code === 'locked' ? undefined : (
            <span className={`min-w-0 ${clip}`}>{shotCellText(field, shot, statusDisplay, fields)}</span>
          )}
        </EditableShotCell>
      </span>
    );
  // The same standard as a card body: the field's name, muted, then its value.
  return (
    <span key={field.code} className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2">
      <span className="flex items-center gap-1 whitespace-nowrap text-fg-subtle">
        {field.type === 'calculated' && <Icon name="square-function" size={12} />}
        {field.label}
      </span>
      {value}
    </span>
  );
}

/** The Wrap text column for the field menu: every text and multi-link field can wrap in the place right-clicked. */
function wrapMenu(shotsPage: ShotsPage, wrap: WrapByPlace, place: WrapPlace, onToggleWrap?: (place: WrapPlace, code: string) => void): FieldMenuWrap | undefined {
  if (!onToggleWrap) return undefined;
  return { selected: wrap[place] ?? [], eligible: shotsPage.fields.filter(canWrap).map((field) => field.code), onToggle: (code) => onToggleWrap(place, code) };
}

function shotActions(shots: Shot[], onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void): FieldMenuAction[] {
  if (!onCommand || shots.length === 0) return [];
  const count = shots.length;
  return [
    { id: 'copy', label: 'Copy', icon: 'copy', onClick: () => onCommand('copy', shots) },
    { id: 'export', label: 'Export as .csv', icon: 'download', onClick: () => onCommand('export', shots) },
    { id: 'delete', label: count === 1 ? 'Delete record' : `Delete ${count} records`, icon: 'trash', danger: true, onClick: () => onCommand('delete', shots) },
  ];
}

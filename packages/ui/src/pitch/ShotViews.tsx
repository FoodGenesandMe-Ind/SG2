import { sequences, statusValues, type ConditionalFormat, type EffectiveField, type Shot, type StatusDisplay } from '@sgp/mock-data';
import { useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { formatClass, formatsFor, styleCss } from './conditionalFormat';
import { FieldMenu, packFields, rowTracks, type FieldMenuAction } from './FieldMenu';
import { onShotSurfaceContextMenu } from './recordActions';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { personName } from './people';
import { ShotCell, SummaryValue } from './ShotGridSpecimen';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { StatusPill } from './StatusPill';
import { allGroupIds, idsAtDepth, useOpenSet } from './grouping';
import { getShotsPage, SELECTED_SHOT_ID, shotCellText, summariesFor, type ShotGroup, type ShotsPage } from './shotsPage';

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
  onCommand,
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
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
}) {
  const { groups, page, fieldByCode } = shotsPage;
  const choices = fieldChoices(shotsPage);
  const shown = (bodyFields ?? page.cardSettings?.expandedFields ?? []).filter((code) => choices.some((f) => f.code === code));
  const fields = shown.map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const groupKey = allGroupIds(groups).join('\n');
  const cardIds = shotsPage.allShots.map((shot) => shot.id).filter((id) => !shotsLabeled(groups, 'LMP_030').some((shot) => shot.id === id));
  const [openGroups, toggleGroup] = useOpenSet(allGroupIds(groups), groupKey);
  const [openCards, toggleCard] = useOpenSet(cardIds, groupKey);
  const selection = useRowSelection(shotsPage.allShots.map((s) => s.id), [SELECTED_SHOT_ID], { drag: 'lasso' });
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(280);
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[] } | null>(null);
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
        setMenu({ x: event.clientX, y: event.clientY, shots: shot && selected.some((s) => s.id === shot.id) ? selected : shot ? [shot] : [] });
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
                    packed={packed}
                    tracks={tracks}
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
          sections={[{ id: 'body', title: 'In the card', selected: shown, onToggle: (code) => onToggleBody?.(code) }]}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function ShotCard({
  shot,
  open,
  selected,
  direction,
  statusDisplay,
  format,
  packed,
  tracks,
  onToggle,
  onOpen,
  onSelect,
  onMouseDown,
  itemProps,
}: {
  shot: Shot;
  open: boolean;
  selected: boolean;
  direction: Direction;
  statusDisplay: StatusDisplay;
  format: ReturnType<typeof formatsFor>;
  packed: EffectiveField[][];
  tracks: string[];
  onToggle: (event: MouseEvent) => void;
  onOpen?: (shotId: string) => void;
  onSelect: (id: string, event: MouseEvent) => void;
  onMouseDown: (event: MouseEvent) => void;
  itemProps: Record<string, unknown>;
}) {
  return (
    <article
      aria-selected={selected}
      data-shot-id={shot.id}
      onClick={(event) => onSelect(shot.id, event)}
      onMouseDown={onMouseDown}
      {...itemProps}
      className={`@container flex min-w-0 cursor-default flex-col gap-2 overflow-hidden rounded-lg border bg-surface-raised p-2 ${
        selected ? 'border-accent bg-row-selected' : 'border-line hover:border-line-strong'
      } ${formatClass(format.row)}`}
      style={styleCss(format.row)}
    >
      <div className="flex min-w-0 items-center gap-2">
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
        <button
          className={`min-w-0 truncate font-medium text-accent hover:underline ${formatClass(format.cells.code)}`}
          style={styleCss(format.cells.code)}
          onClick={() => onOpen?.(shot.id)}
        >
          {shot.code}
        </button>
        <span className={`ml-auto hidden shrink-0 @[15rem]:inline-flex ${formatClass(format.cells.status)}`} style={styleCss(format.cells.status)}>
          <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
        </span>
        <span className={`ml-auto inline-flex shrink-0 @[15rem]:hidden ${formatClass(format.cells.status)}`} style={styleCss(format.cells.status)}>
          <StatusPill code={shot.status} pillStyle={direction.pillStyle} display="icon" />
        </span>
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
                  <dd className={`min-w-0 truncate ${formatClass(format.cells[field.code])}`} style={styleCss(format.cells[field.code])}>
                    <ShotCell field={field} shot={shot} direction={direction} statusDisplay={statusDisplay} fields={packed.flat()} />
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
  onCommand,
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
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
}) {
  const { page, fieldByCode } = shotsPage;
  const choices = fieldChoices(shotsPage);
  const shown = (bodyFields ?? page.cardSettings?.expandedFields ?? []).filter((code) => choices.some((field) => field.code === code));
  const fields = shown.map(fieldByCode).filter((field): field is EffectiveField => !!field);
  const field = fieldByCode(fieldCode) ?? shotsPage.fields.find((item) => item.code === 'status')!;
  const columns = kanbanColumnsFor(field, shotsPage);
  const visible = Math.min(Math.max(1, visibleColumns), Math.max(1, columns.length));
  const [start, setStart] = useState(0);
  const offset = Math.min(start, Math.max(0, columns.length - visible));
  const windowColumns = columns.slice(offset, offset + visible);
  const cardIds = shotsPage.allShots.map((shot) => shot.id);
  const [openCards, toggleCard] = useOpenSet(cardIds, field.code);
  const selection = useRowSelection(cardIds, [SELECTED_SHOT_ID], { drag: 'lasso' });
  const boardRef = useRef<HTMLDivElement>(null);
  const [cardWidth, setCardWidth] = useState(220);
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[] } | null>(null);
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
        setMenu({ x: event.clientX, y: event.clientY, shots: shot && selected.some((item) => item.id === shot.id) ? selected : shot ? [shot] : [] });
      }}
    >
      {selection.lasso}
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
            <section key={column.id} className="flex min-h-0 min-w-0 flex-col gap-2 rounded-md bg-surface-sunken p-2" aria-label={column.label}>
              <header className="flex items-center gap-2 px-1 text-sm">
                {column.status ? (
                  <StatusPill code={column.status} pillStyle={direction.pillStyle} display={statusDisplay} />
                ) : (
                  <span className="min-w-0 truncate font-semibold">{column.label}</span>
                )}
                {column.detail && <span className="min-w-0 truncate text-fg-muted">{column.detail}</span>}
                <span className="ml-auto shrink-0 text-xs text-fg-subtle">{column.shots.length}</span>
              </header>
              <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
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
                    packed={packed}
                    tracks={tracks}
                    onToggle={(event) => toggleCard(shot.id, event, cardIds)}
                    onOpen={onOpenShot}
                    onSelect={selection.onRowClick}
                    onMouseDown={selection.onRowMouseDown}
                    itemProps={selection.itemProps(shot.id)}
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
          sections={[{ id: 'body', title: 'In the kanban card', selected: shown, onToggle: (code) => onToggleBody?.(code) }]}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
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
  onCommand,
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
  /** Move a field inside the image, under it, or hide it when it is already there. */
  onPlace?: (zone: 'inside' | 'below', code: string) => void;
  onCommand?: (command: 'copy' | 'export' | 'delete', shots: Shot[]) => void;
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
  const [menu, setMenu] = useState<{ x: number; y: number; shots: Shot[] } | null>(null);

  return (
    <div
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
        setMenu({ x: event.clientX, y: event.clientY, shots: shot && selected.some((s) => s.id === shot.id) ? selected : shot ? [shot] : [] });
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
                  const belowLayout = thumbLayout(below, shot, statusDisplay, belowRest, belowFirst);
                  const insideLayout = thumbLayout(inside, shot, statusDisplay, insideRoom);
                  return (
                    <figure
                      key={shot.id}
                      data-shot-id={shot.id}
                      aria-selected={selected}
                      onClick={(event) => selection.onRowClick(shot.id, event)}
                      onMouseDown={selection.onRowMouseDown}
                      {...selection.itemProps(shot.id)}
                      className={`group flex cursor-default flex-col gap-1.5 ${formatClass(format.row)}`}
                      style={rowStyle}
                    >
                      <div
                        title="Click to select, double-click to open"
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
                                    className={`min-w-0 rounded-sm bg-surface-sunken/80 px-1 text-left font-mono text-xs tabular-nums text-fg ${insideLayout.clips.get(field.code) ? 'truncate' : 'whitespace-nowrap'} ${formatClass(format.cells[field.code])}`}
                                    style={styleCss(format.cells[field.code])}
                                  >
                                    {field.code === 'totalFrames' ? `${shotCellText(field, shot, statusDisplay, shotsPage.fields)}f` : shotCellText(field, shot, statusDisplay, shotsPage.fields)}
                                  </span>
                                ))}
                              </span>
                            ))}
                          </span>
                        )}
                      </div>
                      <figcaption className="flex flex-col gap-0.5 px-0.5 text-sm">
                        {(belowLayout.packed.length > 0 ? belowLayout.packed : [[]]).map((row, rowIndex) => (
                          <span key={row.map((field) => field.code).join('-') || 'icon'} className={rowIndex === 0 ? 'flex items-center gap-1' : 'grid items-center gap-x-2'} style={rowIndex === 0 ? undefined : { gridTemplateColumns: belowLayout.tracks[rowIndex] }}>
                            {rowIndex === 0 && (
                              <span className="flex w-4 shrink-0 justify-center">
                                <RowTypeIcon icon="film" selected={selected} label={`Shot ${shot.code}`} />
                              </span>
                            )}
                            {rowIndex === 0 ? (
                              <span className="grid min-w-0 items-center gap-x-2" style={{ gridTemplateColumns: belowLayout.tracks[0] }}>
                                {row.map((field) => thumbField(field, shot, direction, statusDisplay, format, belowLayout.clips, onOpenShot))}
                              </span>
                            ) : (
                              row.map((field) => thumbField(field, shot, direction, statusDisplay, format, belowLayout.clips, onOpenShot))
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
            { id: 'inside', title: 'Inside the thumbnail', selected: insideFields, onToggle: (code) => onPlace?.('inside', code) },
            { id: 'below', title: 'Below the thumbnail', selected: belowFields, onToggle: (code) => onPlace?.('below', code) },
          ]}
          actions={shotActions(menu.shots, onCommand)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

function fieldChoices(shotsPage: ShotsPage) {
  return shotsPage.columns.filter((field) => field.type !== 'media').map((field) => ({ code: field.code, label: field.label }));
}

/** Card columns stay compact: a long value is shortened so several fields can share a row. */
function cardFieldWidth(field: EffectiveField, shots: Shot[], statusDisplay: StatusDisplay) {
  if (field.type === 'status') return 156;
  const longest = Math.max(field.label.length, ...shots.map((shot) => shotCellText(field, shot, statusDisplay).length));
  return Math.min(340, Math.max(108, Math.min(longest, 36) * 7.2 + 36));
}

/** This thumbnail's own value. Fields wrap to the next row; only a value wider than the thumbnail is shortened. */
function thumbValueWidth(field: EffectiveField, shot: Shot, statusDisplay: StatusDisplay) {
  const text = field.code === 'totalFrames' ? `${shotCellText(field, shot, statusDisplay)}f` : shotCellText(field, shot, statusDisplay);
  const pad = field.type === 'status' ? 26 : 8;
  return Math.ceil(Math.max(1, text.length) * 7.2 + pad);
}

function thumbLayout(fields: EffectiveField[], shot: Shot, statusDisplay: StatusDisplay, room: number, firstRoom = room) {
  const widths = fields.map((field) => thumbValueWidth(field, shot, statusDisplay));
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
  onOpenShot?: (shotId: string) => void,
) {
  const clip = clips.get(field.code) ? 'truncate' : 'whitespace-nowrap';
  if (field.code === 'code') {
    return (
      <button
        key={field.code}
        className={`min-w-0 text-left font-medium text-accent hover:underline ${clip} ${formatClass(format.cells.code)}`}
        style={styleCss(format.cells.code)}
        onClick={() => onOpenShot?.(shot.id)}
      >
        {shot.code}
      </button>
    );
  }
  if (field.code === 'status') {
    return (
      <span key={field.code} className={`min-w-0 ${formatClass(format.cells.status)}`} style={styleCss(format.cells.status)}>
        <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
      </span>
    );
  }
  return (
    <span key={field.code} className={`min-w-0 text-left text-fg-muted ${clip} ${formatClass(format.cells[field.code])}`} style={styleCss(format.cells[field.code])}>
      {shotCellText(field, shot, statusDisplay)}
    </span>
  );
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

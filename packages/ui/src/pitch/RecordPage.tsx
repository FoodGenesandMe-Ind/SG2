import type { EffectiveField, GroupLevel, TableView } from '@sgp/mock-data';
import { useRef, useState, type MouseEvent, type ReactNode } from 'react';
import { placeholderThumb } from './color';
import { nextSort, SortArrow, trackWidth, useColumnLayout } from './columns';
import type { Direction } from './directions';
import { Gantt, GanttZoomSlider, type GanttColumn, type GanttRow } from './Gantt';
import { GroupDialog, type GroupField } from './GroupDialog';
import { ColumnMenu } from './ColumnMenu';
import { ConfigureFieldDialog, ManageFieldsDialog } from './ManageFieldsDialog';
import { allGroupIds, groupByLevels, groupingLabel, idsAtDepth, useOpenSet, type DataGroup, type GroupBucket } from './grouping';
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
  /** What a click on the header sorts by, when the column's key is not a field of the record. */
  sortValue?: (row: T) => string | number | null | undefined;
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
  /** Fields the Group dialog can stack these records by. Absent means the button still opens, with nothing to pick. */
  group?: { fields: GroupField[]; value: (row: T, field: string) => GroupBucket; initial?: GroupLevel[] };
  gantt?:
    | {
        render: (
          zoom: number,
          grouping: GroupLevel[],
          onColumnContextMenu?: (event: MouseEvent, column: { key: string; label: string }) => void,
        ) => ReactNode;
        zoom?: number;
        separate?: boolean;
        taskFields?: GroupField[];
      }
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

function GroupSections<T>({
  groups,
  root,
  noun,
  plural,
  open,
  toggle,
  leaf,
}: {
  groups: DataGroup<T>[];
  root: DataGroup<T>[];
  noun: string;
  plural: string;
  open: Set<string>;
  toggle: (id: string, event?: { metaKey: boolean; ctrlKey: boolean }, allIds?: string[]) => void;
  leaf: (rows: T[]) => ReactNode;
}) {
  return groups.map(function renderGroup(group) {
    const expanded = open.has(group.id);
    return (
      <section key={group.id} className="flex flex-col">
        <div
          className="flex items-center gap-2 border-b border-line bg-surface-raised px-2 text-sm"
          style={{ ...rowHeight, paddingLeft: `${0.5 + group.depth * 0.875}rem` }}
        >
          <button
            className="flex size-5 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
            aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
            aria-expanded={expanded}
            title="Collapse or expand. Cmd+click to collapse or expand every group at this level."
            onClick={(event) => toggle(group.id, event, idsAtDepth(root, group.depth))}
          >
            <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
          </button>
          <span className="font-semibold">{group.label}</span>
          {group.detail && <span className="text-fg-muted">{group.detail}</span>}
          <span className="text-xs text-fg-subtle">
            {group.rows.length} {group.rows.length === 1 ? noun : plural}
          </span>
        </div>
        {expanded && (group.children.length > 0 ? <div className="flex flex-col">{group.children.map(renderGroup)}</div> : leaf(group.rows))}
      </section>
    );
  });
}

function RecordTable<T>({
  spec,
  direction,
  groups,
  open,
  toggle,
  columnKeys,
  onColumnKeys,
  onHeaderContextMenu,
}: {
  spec: RecordSpec<T>;
  direction: Direction;
  groups: DataGroup<T>[] | null;
  open: Set<string>;
  toggle: (id: string, event?: { metaKey: boolean; ctrlKey: boolean }, allIds?: string[]) => void;
  columnKeys?: string[];
  onColumnKeys?: (keys: string[]) => void;
  onHeaderContextMenu?: (event: MouseEvent, column: { key: string; label: string }) => void;
}) {
  const [order, setOrder] = useState(() => columnKeys ?? spec.columns.map((c) => c.key));
  const columnKey = columnKeys?.join('\n');
  const seenKey = useRef(columnKey);
  if (columnKeys && seenKey.current !== columnKey) {
    seenKey.current = columnKey;
    setOrder(columnKeys);
  }
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [sort, setSort] = useState<GroupLevel[]>([]);
  const columns = order.map((key) => spec.columns.find((c) => c.key === key)).filter((c): c is RecordColumn<T> => !!c);
  const sortedRows = (rows: T[]) => {
    const level = sort[0];
    const column = level && spec.columns.find((c) => c.key === level.field);
    if (!level || !column) return rows;
    const valueOf = (row: T) => column.sortValue?.(row) ?? ((row as Record<string, unknown>)[column.key] as string | number | null | undefined) ?? '';
    return [...rows].sort((a, b) => {
      const x = valueOf(a);
      const y = valueOf(b);
      const order = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
      return level.direction === 'desc' ? -order : order;
    });
  };
  const template = `1.75rem ${columns.map((c) => trackWidth(widths, c.key, c.width)).join(' ')}`;
  const selection = useRowSelection(spec.rows.map(spec.rowId));
  const summed = columns.filter((c) => c.sum);
  const firstSum = columns.findIndex((c) => c.sum);
  const labelSpan = firstSum >= 0 ? firstSum : columns.length;
  const tableRef = useRef<HTMLDivElement>(null);
  const layout = useColumnLayout({
    tableRef,
    order,
    onOrder: (next) => {
      setOrder(next);
      onColumnKeys?.(next);
    },
    onWidth: (key, width) => setWidths((w) => ({ ...w, [key]: width })),
  });
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface" {...selection.containerProps}>
      <div ref={tableRef} className="relative min-w-max" role="table" aria-label={spec.plural}>
        {layout.overlay}
        <div
          className="sticky top-0 z-20 grid items-center border-b border-line-strong bg-surface-sunken text-sm font-medium text-fg-muted"
          style={{ gridTemplateColumns: template, ...rowHeight }}
          role="row"
        >
          <span className="flex justify-center">
            <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
          </span>
          {columns.map((c) => (
            <span
              key={c.key}
              {...layout.headerProps(c.key, c.label, (key) => setSort((current) => nextSort(current, key)))}
              role="columnheader"
              title="Click to sort, drag to move, right-click for options"
              onContextMenu={(event) => {
                if (!onHeaderContextMenu) return;
                event.preventDefault();
                onHeaderContextMenu(event, { key: c.key, label: c.label });
              }}
              className={`relative flex h-full min-w-0 cursor-grab items-center px-2 hover:bg-row-hover ${c.align === 'end' ? 'justify-end' : ''} ${
                layout.movingCode === c.key ? 'opacity-50' : ''
              }`}
            >
              <span className="truncate">{c.label}</span>
              <SortArrow sort={sort} code={c.key} />
              {layout.handle(c.key, c.label)}
            </span>
          ))}
        </div>
        <div
          className="sticky z-10 grid items-center border-b border-line-strong bg-surface-sunken text-sm"
          style={{ gridTemplateColumns: template, top: 'var(--sgp-row-compact)', ...rowHeight }}
          aria-label="Totals"
        >
          <span
            className="flex min-w-0 items-center gap-2 overflow-hidden px-2 font-semibold whitespace-nowrap"
            style={{ gridColumn: `1 / span ${labelSpan + 1}` }}
          >
            Total
            <span className="text-xs font-normal text-fg-subtle">
              {spec.rows.length} {spec.rows.length === 1 ? spec.noun : spec.plural} on all pages
            </span>
          </span>
          {firstSum >= 0 &&
            columns.slice(firstSum).map((c) => (
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
        {(() => {
          const rowsOf = (rows: T[]) =>
            sortedRows(rows).map((row, i) => {
              const id = spec.rowId(row);
              const selected = selection.isSelected(id);
              return (
                <div
                  key={id}
                  role="row"
                  aria-selected={selected}
                  onClick={(event) => selection.onRowClick(id, event)}
                  onMouseDown={selection.onRowMouseDown}
                  {...selection.itemProps(id)}
                  onDoubleClick={spec.onOpen ? () => spec.onOpen!(row) : undefined}
                  className={`grid cursor-default items-center border-b border-line text-md ${
                    selected ? 'bg-row-selected' : direction.zebra && i % 2 === 1 ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
                  }`}
                  style={{ gridTemplateColumns: template, ...rowHeight }}
                >
                  <span className="flex justify-center">
                    <RowTypeIcon icon={spec.icon} selected={selected} label={spec.noun} />
                  </span>
                  {columns.map((c) => (
                    <span
                      key={c.key}
                      role="cell"
                      data-col={c.key}
                      className={`flex min-w-0 items-center overflow-hidden px-2 ${c.align === 'end' ? 'justify-end' : ''}`}
                    >
                      {c.render(row)}
                    </span>
                  ))}
                </div>
              );
            });
          return groups ? (
            <GroupSections groups={groups} root={groups} noun={spec.noun} plural={spec.plural} open={open} toggle={toggle} leaf={rowsOf} />
          ) : (
            rowsOf(spec.rows)
          );
        })()}
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

export function RecordCards<T>({ spec, columns, grouping = [] }: { spec: RecordSpec<T>; columns: number; grouping?: GroupLevel[] }) {
  const selection = useRowSelection(spec.rows.map(spec.rowId), [], { drag: 'lasso' });
  const groups = spec.group && grouping.length ? groupByLevels(spec.rows, grouping, spec.group.value) : null;
  const [open, toggle] = useOpenSet(groups ? allGroupIds(groups) : [], grouping.map((level) => `${level.field}:${level.direction}`).join('\n') || 'flat');
  const cardsOf = (rows: T[]) => (
    <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {rows.map((row) => {
        const id = spec.rowId(row);
        const selected = selection.isSelected(id);
        const select = {
          'aria-selected': selected,
          onClick: (event: MouseEvent) => selection.onRowClick(id, event),
          onMouseDown: selection.onRowMouseDown,
          ...selection.itemProps(id),
          onDoubleClick: spec.onOpen ? () => spec.onOpen!(row) : undefined,
        };
        const icon = <RowTypeIcon icon={spec.icon} selected={selected} label={spec.noun} />;
        return spec.card.render ? (
          <div key={id} {...select} className={`flex min-w-0 cursor-default gap-1.5 rounded-lg ${selected ? 'bg-row-selected ring-1 ring-accent' : ''}`}>
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
                <span className="hidden h-9 w-16 shrink-0 rounded-sm @[15rem]:block" style={{ background: placeholderThumb(spec.card.media(row)) }} />
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
  );
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface" {...selection.containerProps}>
      {selection.lasso}
      <SelectionBar spec={spec} selection={selection} />
      {groups ? (
        <div className="flex flex-col gap-3 p-3">
          <GroupSections groups={groups} root={groups} noun={spec.noun} plural={spec.plural} open={open} toggle={toggle} leaf={cardsOf} />
        </div>
      ) : (
        <div className="p-3">{cardsOf(spec.rows)}</div>
      )}
    </div>
  );
}

export function RecordThumbs<T>({ spec, size, grouping = [] }: { spec: RecordSpec<T>; size: number; grouping?: GroupLevel[] }) {
  const selection = useRowSelection(spec.rows.map(spec.rowId), [], { drag: 'lasso' });
  const groups = spec.group && grouping.length ? groupByLevels(spec.rows, grouping, spec.group.value) : null;
  const [open, toggle] = useOpenSet(groups ? allGroupIds(groups) : [], grouping.map((level) => `${level.field}:${level.direction}`).join('\n') || 'flat');
  const thumbsOf = (rows: T[]) => (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${size}px)` }}>
      {rows.map((row) => {
          const id = spec.rowId(row);
          const selected = selection.isSelected(id);
          return (
            <figure
              key={id}
              aria-selected={selected}
              onClick={(event) => selection.onRowClick(id, event)}
              onMouseDown={selection.onRowMouseDown}
              {...selection.itemProps(id)}
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
  );
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface" {...selection.containerProps}>
      {selection.lasso}
      <SelectionBar spec={spec} selection={selection} />
      {groups ? (
        <div className="flex flex-col gap-3 p-3">
          <GroupSections groups={groups} root={groups} noun={spec.noun} plural={spec.plural} open={open} toggle={toggle} leaf={thumbsOf} />
        </div>
      ) : (
        <div className="p-3">{thumbsOf(spec.rows)}</div>
      )}
    </div>
  );
}

/**
 * A page: the same toolbar and views whether it fills the screen or sits inside a detail-page tab.
 */
export function RecordPage<T>({
  spec,
  direction,
  grouping: groupingProp,
  onGrouping,
  taskGrouping: taskGroupingProp,
  onTaskGrouping,
  groupNote,
}: {
  spec: RecordSpec<T>;
  direction: Direction;
  /** When set, this tab's grouping is owned by the detail page, so it survives switching tabs and views. */
  grouping?: GroupLevel[];
  onGrouping?: (levels: GroupLevel[]) => void;
  /** Gantt grouping, when the gantt is tasks and this tab's table is not. */
  taskGrouping?: GroupLevel[];
  onTaskGrouping?: (levels: GroupLevel[]) => void;
  groupNote?: string;
}) {
  const [view, setView] = useState<TableView>(spec.defaultView);
  const [columns, setColumns] = useState(spec.card.columns ?? 3);
  const [thumbSize, setThumbSize] = useState(192);
  const [zoom, setZoom] = useState(spec.gantt?.zoom ?? 25);
  const [ownGrouping, setOwnGrouping] = useState<GroupLevel[]>(spec.group?.initial ?? []);
  const grouping = groupingProp ?? ownGrouping;
  const setGrouping = onGrouping ?? setOwnGrouping;
  const ganttSeparate = !!spec.gantt && 'separate' in spec.gantt && !!spec.gantt.separate;
  const [ownTaskGrouping, setOwnTaskGrouping] = useState<GroupLevel[]>([{ field: 'entityId', direction: 'asc' }]);
  const taskGrouping = taskGroupingProp ?? ownTaskGrouping;
  const setTaskGrouping = onTaskGrouping ?? setOwnTaskGrouping;
  const editingTasks = view === 'gantt' && ganttSeparate;
  const activeLevels = editingTasks ? taskGrouping : grouping;
  const activeFields = (editingTasks && spec.gantt && 'taskFields' in spec.gantt ? spec.gantt.taskFields : spec.group?.fields) ?? [];
  const [groupOpen, setGroupOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [fieldsStart, setFieldsStart] = useState<string | undefined>(undefined);
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number; key: string; label: string } | null>(null);
  const [configureField, setConfigureField] = useState<{ key: string; label: string } | null>(null);
  const [recordColumns, setRecordColumns] = useState<string[] | undefined>(undefined);
  const shownColumns = recordColumns ?? spec.columns.map((column) => column.key);
  const groups = spec.group && grouping.length ? groupByLevels(spec.rows, grouping, spec.group.value) : null;
  const [openGroups, toggleGroup] = useOpenSet(
    groups ? allGroupIds(groups) : [],
    grouping.map((level) => `${level.field}:${level.direction}`).join('\n') || 'flat',
  );

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
  else if (view === 'table') {
    body = (
      <RecordTable
        spec={spec}
        direction={direction}
        groups={groups}
        open={openGroups}
        toggle={toggleGroup}
        columnKeys={shownColumns}
        onColumnKeys={setRecordColumns}
        onHeaderContextMenu={(event, column) => setHeaderMenu({ x: event.clientX, y: event.clientY, key: column.key, label: column.label })}
      />
    );
  }
  else if (view === 'card') body = <RecordCards spec={spec} columns={columns} grouping={grouping} />;
  else if (view === 'thumb') body = <RecordThumbs spec={spec} size={thumbSize} grouping={grouping} />;
  else if (spec.gantt && 'render' in spec.gantt) {
    body = spec.gantt.render(zoom, ganttSeparate ? taskGrouping : grouping, (event, column) =>
      setHeaderMenu({ x: event.clientX, y: event.clientY, key: column.key, label: column.label }),
    );
  } else if (spec.gantt) {
    body = (
      <Gantt
        columns={spec.gantt.columns}
        rows={spec.gantt.rows(spec.rows)}
        zoom={zoom}
        zebra={direction.zebra}
        onColumnContextMenu={(event, column) => setHeaderMenu({ x: event.clientX, y: event.clientY, key: column.key, label: column.label })}
      />
    );
  }

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-line px-4 py-2">
        <span className="text-sm text-fg-subtle">
          {spec.rows.length} {spec.rows.length === 1 ? spec.noun : spec.plural}
        </span>
        <span className="ml-auto flex items-center">{controls}</span>
        <SearchField label={`Search ${spec.plural}`} />
        <button
          className="flex size-7 items-center justify-center rounded-md border border-line-strong text-fg-muted enabled:hover:bg-row-hover enabled:hover:text-fg disabled:cursor-default disabled:opacity-40"
          style={rowHeight}
          aria-label="Manage fields"
          title="Manage fields"
          onClick={() => {
            setFieldsStart(undefined);
            setColumnsOpen(true);
          }}
        >
          <Icon name="settings" size={14} />
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-fg-muted hover:bg-row-hover hover:text-fg"
          style={rowHeight}
          aria-haspopup="dialog"
          onClick={() => setGroupOpen(true)}
        >
          <Icon name="sliders-horizontal" /> Group
          {activeLevels.length > 0 && (
            <span className="font-medium text-fg">{groupingLabel(activeLevels, (code) => activeFields.find((field) => field.code === code)?.label ?? code)}</span>
          )}
        </button>
        <ViewSwitcher views={spec.views} view={view} onView={setView} />
        {spec.addLabel && <AddButton label={spec.addLabel} onClick={spec.onAdd} />}
      </div>
      {body}
      {columnsOpen && (
        <ManageFieldsDialog
          tableLabel={spec.plural}
          initialField={fieldsStart}
          fields={spec.columns.map((column) => ({ code: column.key, label: column.label, type: 'text', hidden: false }) satisfies EffectiveField)}
          shown={shownColumns}
          canManage={false}
          onSave={(shown) => setRecordColumns(shown)}
          onClose={() => setColumnsOpen(false)}
        />
      )}
      {headerMenu && (
        <ColumnMenu
          x={headerMenu.x}
          y={headerMenu.y}
          columnLabel={headerMenu.label}
          onManageFields={() => {
            setFieldsStart(headerMenu.key);
            setColumnsOpen(true);
          }}
          onConfigureField={() => setConfigureField({ key: headerMenu.key, label: headerMenu.label })}
          onClose={() => setHeaderMenu(null)}
        />
      )}
      {configureField && (
        <ConfigureFieldDialog
          field={{ code: configureField.key, label: configureField.label, type: 'text', system: true, hidden: false }}
          fields={[{ code: configureField.key, label: configureField.label, type: 'text', system: true, hidden: false }]}
          canManage={false}
          onSave={() => setConfigureField(null)}
          onClose={() => setConfigureField(null)}
        />
      )}
      {groupOpen && (
        <GroupDialog
          key={editingTasks ? 'gantt' : 'records'}
          levels={editingTasks ? taskGrouping : grouping}
          fields={activeFields}
          note={
            editingTasks
              ? 'This gantt is the tasks of these records. Its grouping stays with the gantt and does not change the table, cards, or thumbnails.'
              : ganttSeparate
                ? 'This grouping stays across table, cards, and thumbnails. It does not change the gantt, which is a view of tasks.'
                : (groupNote ?? 'This grouping stays as you switch views of these records. It is separate from any other table.')
          }
          onApply={editingTasks ? setTaskGrouping : setGrouping}
          onClose={() => setGroupOpen(false)}
        />
      )}
    </div>
  );
}

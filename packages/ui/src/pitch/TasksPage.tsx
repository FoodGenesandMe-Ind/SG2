import {
  assets,
  departments,
  pages,
  pipelineSteps,
  shots,
  statusValues,
  tasks,
  resolveTableConfig,
  type ConditionalFormat,
  type GroupLevel,
  type StatusDisplay,
  type TablePage,
  type Task,
} from '@sgp/mock-data';
import { useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { formatClass, formatsFor, styleCss } from './conditionalFormat';
import { groupByLevels, idsAtDepth, isDepartmentThenStep, type DataGroup, type GroupBucket } from './grouping';
import { trackWidth, useColumnLayout } from './columns';
import type { Direction } from './directions';
import { Gantt, type GanttColumn, type GanttLabelOption, type GanttLayout, type GanttRow } from './Gantt';
import { Icon } from './Icon';
import { PersonChip, Avatar, personName } from './people';
import { HeaderSelectBox, RowTypeIcon, useRowSelection } from './selection';
import { StatusPill } from './StatusPill';
import { formatDate } from './shotsPage';

export const TASKS_PAGE_ID = 'pg-lmp-tasks';

export function getTasksPage() {
  const page = pages.find((p): p is TablePage => p.id === TASKS_PAGE_ID && p.type === 'table')!;
  const projectId = page.query.filters.find((f) => f.field === 'projectId')!.value as string;
  return { page, projectTasks: tasks.filter((t) => t.projectId === projectId) };
}

export function entityCode(task: Task) {
  return task.entityType === 'Shot'
    ? shots.find((s) => s.id === task.entityId)?.code ?? task.entityId
    : assets.find((a) => a.id === task.entityId)?.code ?? task.entityId;
}

export function openTodos(task: Task) {
  return task.todos.filter((t) => !t.done).length;
}

export function TodoSummary({ task }: { task: Task }) {
  if (task.todos.length === 0) return <span className="text-fg-subtle">-</span>;
  const open = openTodos(task);
  return (
    <span
      className={`flex items-center gap-1 text-xs tabular-nums ${open === 0 ? 'text-fg-subtle' : 'text-fg'}`}
      title={task.todos.map((t) => `${t.done ? '[x]' : '[ ]'} ${t.text}`).join('\n')}
    >
      <Icon name={open === 0 ? 'circle-check' : 'list-todo'} size={13} />
      {open === 0 ? 'All done' : `${open} of ${task.todos.length} open`}
    </span>
  );
}

const statusColor = (code: string) => statusValues.find((s) => s.code === code)?.color;

interface TaskGroup {
  id: string;
  label: string;
  detail: string;
  depth: number;
  tasks: Task[];
}

/** Department, then pipeline step, then tasks with their sub-tasks. */
function groupTasks(projectTasks: Task[]) {
  const groups: Array<{ department: TaskGroup; steps: TaskGroup[] }> = [];
  for (const dep of departments) {
    const steps = pipelineSteps
      .filter((s) => s.departmentId === dep.id)
      .map((step) => ({
        id: step.id,
        label: step.name,
        detail: step.code,
        depth: 1,
        tasks: projectTasks.filter((t) => t.stepId === step.id),
      }))
      .filter((g) => g.tasks.length > 0);
    if (steps.length === 0) continue;
    const all = steps.flatMap((s) => s.tasks);
    groups.push({
      department: {
        id: dep.id,
        label: dep.name,
        detail: `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`,
        depth: 0,
        tasks: all,
      },
      steps,
    });
  }
  return groups;
}

function span(list: Task[]) {
  const starts = list.map((t) => t.startDate).sort();
  const ends = list.map((t) => t.dueDate).sort();
  return { start: starts[0], end: ends[ends.length - 1] };
}

function GroupLabel({
  group,
  expanded,
  onToggle,
  labelClass,
  labelStyle,
  detailClass,
  detailStyle,
}: {
  group: TaskGroup;
  expanded: boolean;
  onToggle: (event: MouseEvent) => void;
  labelClass?: string;
  labelStyle?: CSSProperties;
  detailClass?: string;
  detailStyle?: CSSProperties;
}) {
  const topLevel = group.tasks.filter((t) => !t.parentTaskId).length;
  return (
    <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${group.depth * 0.875}rem` }}>
      <button
        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
        aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
        aria-expanded={expanded}
        title="Collapse or expand. Cmd+click to collapse or expand every group at this level."
        onClick={onToggle}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      <span className={`${group.depth === 0 ? 'font-semibold' : 'font-medium'} ${labelClass ?? ''}`} style={labelStyle}>
        {group.label}
      </span>
      <span className={`truncate text-xs text-fg-subtle ${detailClass ?? ''}`} style={detailStyle}>
        {group.depth === 0 && group.detail ? group.detail : `${topLevel} tasks`}
      </span>
    </span>
  );
}

function useCollapsed(initial: string[]) {
  const [collapsed, setCollapsed] = useState(() => new Set(initial));
  const toggle = (id: string, event?: { metaKey: boolean; ctrlKey: boolean }, allIds?: string[]) => {
    if (event && (event.metaKey || event.ctrlKey) && allIds) {
      setCollapsed((prev) => {
        const allOpen = allIds.every((item) => !prev.has(item));
        const next = new Set(prev);
        allIds.forEach((item) => (allOpen ? next.add(item) : next.delete(item)));
        return next;
      });
      return;
    }
    setCollapsed((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  };
  return [collapsed, toggle] as const;
}

function taskGroupIds(projectTasks: Task[]) {
  const groups = groupTasks(projectTasks);
  return {
    departments: groups.map(({ department }) => department.id),
    steps: groups.flatMap(({ steps }) => steps.map((step) => step.id)),
  };
}

/** Tasks in display order: each top-level task followed by its sub-tasks. */
function ordered(list: Task[]) {
  return list
    .filter((t) => !t.parentTaskId)
    .flatMap((t) => [t, ...list.filter((s) => s.parentTaskId === t.id)]);
}

export type TaskGrouping = 'department' | 'shot' | 'none';

export const TASK_LABEL_OPTIONS: GanttLabelOption[] = [
  { key: 'name', label: 'Task' },
  { key: 'assignee', label: 'Assigned to' },
  { key: 'status', label: 'Status' },
  { key: 'dates', label: 'Dates' },
  { key: 'bid', label: 'Bid' },
];

/** Every gantt in SGPipeline is a gantt of tasks; only the grouping changes. */
export function taskBucket(task: Task, field: string, statusDisplay: StatusDisplay): GroupBucket {
  if (field === 'departmentId') {
    const depId = pipelineSteps.find((step) => step.id === task.stepId)?.departmentId ?? '';
    const index = departments.findIndex((dep) => dep.id === depId);
    return { key: depId || 'none', label: departments[index]?.name ?? 'None', detail: '', sort: index < 0 ? 999 : index };
  }
  if (field === 'stepId') {
    const step = pipelineSteps.find((item) => item.id === task.stepId);
    return { key: task.stepId || 'none', label: step?.name ?? 'None', detail: '', sort: step?.order ?? 999 };
  }
  if (field === 'entityId') {
    const label = entityCode(task);
    return { key: task.entityId || 'none', label, detail: '', sort: label };
  }
  if (field === 'assigneeId') {
    const label = personName(task.assigneeId);
    return { key: task.assigneeId || 'none', label, detail: '', sort: label };
  }
  if (field === 'status') {
    const value = statusValues.find((item) => item.code === task.status);
    const label = !value ? task.status : statusDisplay === 'long' ? value.label : value.shortLabel;
    const order = statusValues.findIndex((item) => item.code === task.status);
    return { key: task.status || 'none', label: label || 'None', detail: '', sort: order < 0 ? 999 : order };
  }
  const raw = task[field as keyof Task];
  if (raw == null || raw === '') return { key: 'none', label: 'None', detail: '', sort: '\uffff' };
  if (typeof raw === 'number') return { key: String(raw), label: String(raw), detail: '', sort: raw };
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return { key: raw.slice(0, 10), label: formatDate(raw.slice(0, 10)), detail: '', sort: raw.slice(0, 10) };
  }
  return { key: String(raw), label: String(raw), detail: '', sort: String(raw).toLowerCase() };
}

export function TasksGantt({
  direction,
  statusDisplay,
  zoom,
  taskList,
  grouping = 'department',
  levels,
  layout,
  onLayout,
  formats = [],
  onColumnContextMenu,
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  zoom: number;
  taskList?: Task[];
  grouping?: TaskGrouping;
  /** Page grouping. When it is not department then step, the gantt follows these levels instead. */
  levels?: GroupLevel[];
  layout?: GanttLayout;
  onLayout?: (layout: GanttLayout) => void;
  /** Shot-page conditional formats, applied to shot group rows (the fields that row shows). */
  formats?: ConditionalFormat[];
  onColumnContextMenu?: (event: MouseEvent, column: { code: string; label: string }) => void;
}) {
  const source = taskList ?? getTasksPage().projectTasks;
  const [collapsed, toggle] = useCollapsed(grouping === 'department' ? ['dep-assets'] : []);
  const builtinIds =
    grouping === 'shot'
      ? { departments: shots.filter((shot) => source.some((task) => task.entityType === 'Shot' && task.entityId === shot.id)).map((shot) => shot.id), steps: [] as string[] }
      : grouping === 'department'
        ? taskGroupIds(source)
        : { departments: [] as string[], steps: [] as string[] };

  const columns: GanttColumn[] = [
    { key: 'task', label: 'Task', width: '12rem' },
    { key: 'assignee', label: 'Assigned', width: '4.5rem' },
    { key: 'status', label: 'Status', width: statusDisplay === 'long' ? '8rem' : '4.5rem' },
    { key: 'todos', label: 'To do', width: '7rem' },
  ];

  const itemRow = (task: Task): GanttRow => {
    const sub = !!task.parentTaskId;
    const showLink = !sub && grouping !== 'shot';
    return {
      id: task.id,
      kind: 'item',
      icon: 'square-check',
      start: task.startDate,
      end: task.dueDate,
      color: statusColor(task.status),
      fields: {
        name: sub ? task.name : `${entityCode(task)} ${task.name}`,
        assignee: personName(task.assigneeId),
        status: statusValues.find((v) => v.code === task.status)?.label ?? task.status,
        dates: `${formatDate(task.startDate)} to ${formatDate(task.dueDate)}`,
        bid: `${task.bidDays}d`,
      },
      dependsOn: task.dependencies?.map((d) => ({ rowId: d.predecessorId, type: d.type })),
      cells: [
        <span key="t" className={`flex min-w-0 items-center gap-1.5 ${sub ? 'pl-5 text-fg-muted' : ''}`}>
          {sub && <Icon name="corner-down-right" size={12} className="shrink-0 text-fg-subtle" />}
          {showLink && <span className="shrink-0 font-medium text-accent">{entityCode(task)}</span>}
          <span className="truncate">{task.name}</span>
        </span>,
        <Avatar key="a" personId={task.assigneeId} />,
        <StatusPill key="s" code={task.status} pillStyle={direction.pillStyle} display={statusDisplay} />,
        <TodoSummary key="d" task={task} />,
      ],
    };
  };

  const rows: GanttRow[] = [];
  const generic = !!levels && grouping !== 'shot' && !isDepartmentThenStep(levels);
  if (generic && levels.length === 0) {
    rows.push(...ordered(source).map(itemRow));
  } else if (generic) {
    const tree = groupByLevels(source, levels, (task, field) => taskBucket(task, field, statusDisplay));
    const walk = (list: DataGroup<Task>[]) => {
      for (const group of list) {
        rows.push({
          id: group.id,
          kind: 'group',
          ...span(group.rows),
          cells: [
            <GroupLabel
              key="g"
              group={{ id: group.id, label: group.label, detail: group.detail, depth: group.depth, tasks: group.rows }}
              expanded={!collapsed.has(group.id)}
              onToggle={(event) => toggle(group.id, event, idsAtDepth(tree, group.depth))}
            />,
          ],
        });
        if (collapsed.has(group.id)) continue;
        if (group.children.length) walk(group.children);
        else rows.push(...ordered(group.rows).map(itemRow));
      }
    };
    walk(tree);
  } else if (grouping === 'none') {
    rows.push(...ordered(source).map(itemRow));
  } else if (grouping === 'shot') {
    const shotIds = [...new Set(source.filter((t) => t.entityType === 'Shot').map((t) => t.entityId))];
    for (const shot of shots.filter((s) => shotIds.includes(s.id))) {
      const shotTasks = source.filter((t) => t.entityId === shot.id);
      const group: TaskGroup = { id: shot.id, label: shot.code, detail: shot.description, depth: 0, tasks: shotTasks };
      const shotFields = resolveTableConfig('Shot', shot.projectId)?.fields ?? [];
      const format = formatsFor(formats, shot as unknown as Record<string, unknown>, shotFields);
      rows.push({
        id: shot.id,
        kind: 'group',
        ...span(shotTasks),
        formatClass: formatClass(format.row),
        formatStyle: styleCss(format.row),
        cells: [
          <GroupLabel
            key="g"
            group={group}
            expanded={!collapsed.has(shot.id)}
            onToggle={(event) => toggle(shot.id, event, builtinIds.departments)}
            labelClass={formatClass(format.cells.code)}
            labelStyle={styleCss(format.cells.code)}
            detailClass={formatClass(format.cells.description)}
            detailStyle={styleCss(format.cells.description)}
          />,
        ],
      });
      if (collapsed.has(shot.id)) continue;
      const stepOrder = (t: Task) => pipelineSteps.find((s) => s.id === t.stepId)?.order ?? 0;
      rows.push(...ordered([...shotTasks].sort((a, b) => stepOrder(a) - stepOrder(b))).map(itemRow));
    }
  } else {
    for (const { department, steps } of groupTasks(source)) {
      rows.push({
        id: department.id,
        kind: 'group',
        ...span(department.tasks),
        cells: [<GroupLabel key="g" group={department} expanded={!collapsed.has(department.id)} onToggle={(event) => toggle(department.id, event, builtinIds.departments)} />],
      });
      if (collapsed.has(department.id)) continue;
      for (const step of steps) {
        rows.push({
          id: step.id,
          kind: 'group',
          ...span(step.tasks),
          cells: [<GroupLabel key="g" group={step} expanded={!collapsed.has(step.id)} onToggle={(event) => toggle(step.id, event, builtinIds.steps)} />],
        });
        if (collapsed.has(step.id)) continue;
        rows.push(...ordered(step.tasks).map(itemRow));
      }
    }
  }

  return (
    <Gantt
      columns={columns}
      rows={rows}
      zoom={zoom}
      zebra={direction.zebra}
      labelOptions={TASK_LABEL_OPTIONS}
      layout={layout}
      onLayout={onLayout}
      onColumnContextMenu={
        onColumnContextMenu
          ? (event, column) => onColumnContextMenu(event, { code: column.key, label: column.label })
          : undefined
      }
    />
  );
}

interface TaskColumn {
  code: string;
  label: string;
  width: string;
  end?: boolean;
  render: (task: Task) => ReactNode;
  total?: (top: Task[], all: Task[]) => ReactNode;
}

function SumCell({ value }: { value: string }) {
  return (
    <>
      <span className="text-xs text-fg-subtle">Sum</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{value}</span>
    </>
  );
}

const daysTotal = (list: Task[], key: 'bidDays' | 'loggedDays') => `${Math.round(list.reduce((a, t) => a + t[key], 0) * 10) / 10}d`;

function taskColumns(direction: Direction, statusDisplay: StatusDisplay): TaskColumn[] {
  return [
    {
      code: 'name',
      label: 'Task',
      width: 'minmax(14rem, 1.4fr)',
      render: (task) => (
        <span className={`flex min-w-0 items-center gap-1.5 ${task.parentTaskId ? 'pl-4 text-fg-muted' : ''}`}>
          {task.parentTaskId && <Icon name="corner-down-right" size={12} className="shrink-0 text-fg-subtle" />}
          <span className="truncate">{task.name}</span>
        </span>
      ),
    },
    { code: 'entityId', label: 'Link', width: '8rem', render: (task) => <span className="truncate font-medium text-accent">{entityCode(task)}</span> },
    { code: 'assigneeId', label: 'Assigned to', width: '10rem', render: (task) => <PersonChip personId={task.assigneeId} /> },
    {
      code: 'status',
      label: 'Status',
      width: statusDisplay === 'long' ? '9rem' : '5rem',
      render: (task) => <StatusPill code={task.status} pillStyle={direction.pillStyle} display={statusDisplay} />,
    },
    { code: 'startDate', label: 'Start', width: '7rem', render: (task) => <span className="tabular-nums">{formatDate(task.startDate)}</span> },
    { code: 'dueDate', label: 'Due', width: '7rem', render: (task) => <span className="tabular-nums">{formatDate(task.dueDate)}</span> },
    {
      code: 'bidDays',
      label: 'Bid',
      width: '4.5rem',
      end: true,
      render: (task) => <span className="font-mono text-xs tabular-nums">{task.bidDays}d</span>,
      total: (top) => <SumCell value={daysTotal(top, 'bidDays')} />,
    },
    {
      code: 'loggedDays',
      label: 'Time logged',
      width: '6rem',
      end: true,
      render: (task) => <span className="font-mono text-xs tabular-nums">{task.loggedDays}d</span>,
      total: (top) => <SumCell value={daysTotal(top, 'loggedDays')} />,
    },
    {
      code: 'todos',
      label: 'To do',
      width: '8rem',
      render: (task) => <TodoSummary task={task} />,
      total: (_top, all) => <span className="text-xs text-fg-muted">{all.reduce((a, t) => a + openTodos(t), 0)} open</span>,
    },
  ];
}

export function TasksTable({
  direction,
  statusDisplay,
  levels = [
    { field: 'departmentId', direction: 'asc' },
    { field: 'stepId', direction: 'asc' },
  ],
  columnOrder,
  columnWidths = {},
  onColumnOrder,
  onColumnWidth,
  onColumnContextMenu,
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  levels?: GroupLevel[];
  columnOrder?: string[];
  columnWidths?: Record<string, number>;
  onColumnOrder?: (order: string[]) => void;
  onColumnWidth?: (code: string, width: number) => void;
  onColumnContextMenu?: (event: MouseEvent, column: { code: string; label: string }) => void;
}) {
  const { projectTasks } = getTasksPage();
  const [collapsed, toggle] = useCollapsed(['dep-assets']);
  const builtinIds = taskGroupIds(projectTasks);
  const all = taskColumns(direction, statusDisplay);
  const columns: TaskColumn[] = columnOrder
    ? columnOrder.map(
        (code): TaskColumn =>
          all.find((c) => c.code === code) ?? {
            code,
            label: code,
            width: '8rem',
            render: () => <span className="text-fg-subtle">—</span>,
          },
      )
    : all;
  const template = `1.75rem ${columns.map((c) => trackWidth(columnWidths, c.code, c.width)).join(' ')}`;
  const selection = useRowSelection(ordered(projectTasks).map((t) => t.id));
  const rowHeight = { height: 'var(--sgp-row-compact)' };
  const topLevel = projectTasks.filter((t) => !t.parentTaskId);
  const firstTotal = columns.findIndex((c) => c.total);
  const tableRef = useRef<HTMLDivElement>(null);
  const layout = useColumnLayout({ tableRef, order: columns.map((c) => c.code), onOrder: onColumnOrder, onWidth: onColumnWidth });

  const row = (task: Task, i: number) => {
    const selected = selection.isSelected(task.id);
    return (
      <div
        key={task.id}
        role="row"
        aria-selected={selected}
        onClick={(event) => selection.onRowClick(task.id, event)}
        onMouseDown={selection.onRowMouseDown}
        {...selection.itemProps(task.id)}
        className={`grid cursor-default items-center border-b border-line text-md ${
          selected ? 'bg-row-selected' : direction.zebra && i % 2 === 1 ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
        }`}
        style={{ gridTemplateColumns: template, ...rowHeight }}
      >
        <RowTypeIcon icon="square-check" selected={selected} label={task.parentTaskId ? 'Sub-task' : 'Task'} />
        {columns.map((c) => (
          <span key={c.code} role="cell" data-col={c.code} className={`flex min-w-0 items-center overflow-hidden px-2 ${c.end ? 'justify-end' : ''}`}>
            {c.render(task)}
          </span>
        ))}
      </div>
    );
  };

  let index = 0;
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface" {...selection.containerProps}>
      <div ref={tableRef} className="relative min-w-max" role="table" aria-label="Tasks">
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
              key={c.code}
              {...layout.headerProps(c.code, c.label)}
              role="columnheader"
              title="Drag to move, right-click for options"
              onContextMenu={(event) => {
                if (!onColumnContextMenu) return;
                event.preventDefault();
                onColumnContextMenu(event, { code: c.code, label: c.label });
              }}
              className={`relative flex h-full min-w-0 cursor-grab items-center px-2 hover:bg-row-hover ${c.end ? 'justify-end' : ''} ${
                layout.movingCode === c.code ? 'bg-accent-subtle text-fg' : ''
              }`}
            >
              <span className="truncate">{c.label}</span>
              {layout.handle(c.code, c.label)}
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
            style={{ gridColumn: `1 / span ${1 + (firstTotal >= 0 ? firstTotal : columns.length)}` }}
          >
            Total
            <span className="text-xs font-normal text-fg-subtle">{topLevel.length} tasks on all pages</span>
          </span>
          {firstTotal >= 0 &&
            columns.slice(firstTotal).map((c) => (
              <span key={c.code} className={`flex items-baseline gap-1.5 px-2 ${c.end ? 'justify-end' : ''}`}>
                {c.total?.(topLevel, projectTasks)}
              </span>
            ))}
        </div>
        {isDepartmentThenStep(levels)
          ? groupTasks(projectTasks).map(({ department, steps }) => (
          <div key={department.id} role="rowgroup">
            <div className="flex items-center border-b border-line bg-surface-raised px-2 text-sm" style={rowHeight}>
              <GroupLabel group={department} expanded={!collapsed.has(department.id)} onToggle={(event) => toggle(department.id, event, builtinIds.departments)} />
            </div>
            {!collapsed.has(department.id) &&
              steps.map((step) => (
                <div key={step.id}>
                  <div className="flex items-center border-b border-line bg-surface-raised/60 px-2 text-sm" style={rowHeight}>
                    <GroupLabel group={step} expanded={!collapsed.has(step.id)} onToggle={(event) => toggle(step.id, event, builtinIds.steps)} />
                  </div>
                  {!collapsed.has(step.id) && ordered(step.tasks).map((t) => row(t, index++))}
                </div>
              ))}
          </div>
        ))
          : levels.length === 0
            ? ordered(projectTasks).map((task) => row(task, index++))
            : groupByLevels(projectTasks, levels, (task, field) => taskBucket(task, field, statusDisplay)).map(function renderGroup(group) {
                return (
                  <div key={group.id}>
                    <div className="flex items-center border-b border-line bg-surface-raised px-2 text-sm" style={rowHeight}>
                      <GroupLabel
                        group={{ id: group.id, label: group.label, detail: group.detail, depth: group.depth, tasks: group.rows }}
                        expanded={!collapsed.has(group.id)}
                        onToggle={(event) => toggle(group.id, event, idsAtDepth(groupByLevels(projectTasks, levels, (task, field) => taskBucket(task, field, statusDisplay)), group.depth))}
                      />
                    </div>
                    {!collapsed.has(group.id) &&
                      (group.children.length > 0 ? group.children.map(renderGroup) : ordered(group.rows).map((task) => row(task, index++)))}
                  </div>
                );
              })}
      </div>
    </div>
  );
}

import {
  assets,
  departments,
  pages,
  pipelineSteps,
  shots,
  statusValues,
  tasks,
  type StatusDisplay,
  type TablePage,
  type Task,
} from '@sgp/mock-data';
import { useState } from 'react';
import type { Direction } from './directions';
import { Gantt, type GanttColumn, type GanttLabelOption, type GanttRow } from './Gantt';
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
}: {
  group: TaskGroup;
  expanded: boolean;
  onToggle: () => void;
}) {
  const topLevel = group.tasks.filter((t) => !t.parentTaskId).length;
  return (
    <span className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${group.depth * 0.875}rem` }}>
      <button
        className="flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
        aria-label={expanded ? `Collapse ${group.label}` : `Expand ${group.label}`}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      <span className={group.depth === 0 ? 'font-semibold' : 'font-medium'}>{group.label}</span>
      <span className="truncate text-xs text-fg-subtle">
        {group.depth === 0 ? group.detail : `${topLevel} tasks`}
      </span>
    </span>
  );
}

function useCollapsed(initial: string[]) {
  const [collapsed, setCollapsed] = useState(() => new Set(initial));
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(id)) nextSet.delete(id);
      else nextSet.add(id);
      return nextSet;
    });
  return [collapsed, toggle] as const;
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
export function TasksGantt({
  direction,
  statusDisplay,
  zoom,
  taskList,
  grouping = 'department',
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  zoom: number;
  taskList?: Task[];
  grouping?: TaskGrouping;
}) {
  const source = taskList ?? getTasksPage().projectTasks;
  const [collapsed, toggle] = useCollapsed(grouping === 'department' ? ['dep-assets'] : []);

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
  if (grouping === 'none') {
    rows.push(...ordered(source).map(itemRow));
  } else if (grouping === 'shot') {
    const shotIds = [...new Set(source.filter((t) => t.entityType === 'Shot').map((t) => t.entityId))];
    for (const shot of shots.filter((s) => shotIds.includes(s.id))) {
      const shotTasks = source.filter((t) => t.entityId === shot.id);
      const group: TaskGroup = { id: shot.id, label: shot.code, detail: shot.description, depth: 0, tasks: shotTasks };
      rows.push({
        id: shot.id,
        kind: 'group',
        ...span(shotTasks),
        cells: [<GroupLabel key="g" group={group} expanded={!collapsed.has(shot.id)} onToggle={() => toggle(shot.id)} />],
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
        cells: [<GroupLabel key="g" group={department} expanded={!collapsed.has(department.id)} onToggle={() => toggle(department.id)} />],
      });
      if (collapsed.has(department.id)) continue;
      for (const step of steps) {
        rows.push({
          id: step.id,
          kind: 'group',
          ...span(step.tasks),
          cells: [<GroupLabel key="g" group={step} expanded={!collapsed.has(step.id)} onToggle={() => toggle(step.id)} />],
        });
        if (collapsed.has(step.id)) continue;
        rows.push(...ordered(step.tasks).map(itemRow));
      }
    }
  }

  return <Gantt columns={columns} rows={rows} zoom={zoom} zebra={direction.zebra} labelOptions={TASK_LABEL_OPTIONS} />;
}

export function TasksTable({ direction, statusDisplay }: { direction: Direction; statusDisplay: StatusDisplay }) {
  const { projectTasks } = getTasksPage();
  const [collapsed, toggle] = useCollapsed(['dep-assets']);
  const template = `1.75rem minmax(14rem, 1.4fr) 8rem 10rem ${statusDisplay === 'long' ? '9rem' : '5rem'} 5.5rem 5.5rem 4.5rem 6rem 8rem`;
  const selection = useRowSelection(ordered(projectTasks).map((t) => t.id));
  const rowHeight = { height: 'var(--sgp-row-compact)' };
  const topLevel = projectTasks.filter((t) => !t.parentTaskId);
  const sum = (key: 'bidDays' | 'loggedDays') => Math.round(topLevel.reduce((a, t) => a + t[key], 0) * 10) / 10;
  const openTotal = projectTasks.reduce((a, t) => a + openTodos(t), 0);
  const headers = ['Task', 'Link', 'Assigned to', 'Status', 'Start', 'Due', 'Bid', 'Time logged', 'To do'];
  const numeric = new Set([6, 7]);

  const row = (task: Task, i: number) => {
    const sub = !!task.parentTaskId;
    const selected = selection.isSelected(task.id);
    return (
      <div
        key={task.id}
        role="row"
        aria-selected={selected}
        onClick={(event) => selection.onRowClick(task.id, event)}
        onMouseDown={selection.onRowMouseDown}
        className={`grid cursor-default items-center border-b border-line text-md ${
          selected ? 'bg-row-selected' : direction.zebra && i % 2 === 1 ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
        }`}
        style={{ gridTemplateColumns: template, ...rowHeight }}
      >
        <RowTypeIcon icon="square-check" selected={selected} label={sub ? 'Sub-task' : 'Task'} />
        <span className={`flex min-w-0 items-center gap-1.5 px-2 ${sub ? 'pl-6 text-fg-muted' : ''}`}>
          {sub && <Icon name="corner-down-right" size={12} className="shrink-0 text-fg-subtle" />}
          <span className="truncate">{task.name}</span>
        </span>
        <span className="truncate px-2 font-medium text-accent">{entityCode(task)}</span>
        <span className="min-w-0 px-2">
          <PersonChip personId={task.assigneeId} />
        </span>
        <span className="px-2">
          <StatusPill code={task.status} pillStyle={direction.pillStyle} display={statusDisplay} />
        </span>
        <span className="px-2 tabular-nums">{formatDate(task.startDate)}</span>
        <span className="px-2 tabular-nums">{formatDate(task.dueDate)}</span>
        <span className="px-2 text-right font-mono text-xs tabular-nums">{task.bidDays}d</span>
        <span className="px-2 text-right font-mono text-xs tabular-nums">{task.loggedDays}d</span>
        <span className="px-2">
          <TodoSummary task={task} />
        </span>
      </div>
    );
  };

  let index = 0;
  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <div className="min-w-max" role="table" aria-label="Tasks">
        <div
          className="sticky top-0 z-20 grid items-center border-b border-line-strong bg-surface-sunken text-sm font-medium text-fg-muted"
          style={{ gridTemplateColumns: template, ...rowHeight }}
          role="row"
        >
          <HeaderSelectBox state={selection.header} onClick={selection.onHeaderClick} count={selection.count} />
          {headers.map((h, i) => (
            <span key={h} role="columnheader" className={`px-2 ${numeric.has(i) ? 'text-right' : ''}`}>
              {h}
            </span>
          ))}
        </div>
        <div
          className="sticky z-10 grid items-center border-b border-line-strong bg-surface-sunken text-sm"
          style={{ gridTemplateColumns: template, top: 'var(--sgp-row-compact)', ...rowHeight }}
          aria-label="Totals"
        >
          <span className="flex items-center gap-2 px-2 font-semibold" style={{ gridColumn: '1 / span 7' }}>
            Total
            <span className="text-xs font-normal text-fg-subtle">{topLevel.length} tasks on all pages</span>
          </span>
          <span className="flex items-baseline justify-end gap-1.5 px-2">
            <span className="text-xs text-fg-subtle">Sum</span>
            <span className="font-mono text-xs font-semibold tabular-nums">{sum('bidDays')}d</span>
          </span>
          <span className="flex items-baseline justify-end gap-1.5 px-2">
            <span className="text-xs text-fg-subtle">Sum</span>
            <span className="font-mono text-xs font-semibold tabular-nums">{sum('loggedDays')}d</span>
          </span>
          <span className="px-2 text-xs text-fg-muted">{openTotal} open</span>
        </div>
        {groupTasks(projectTasks).map(({ department, steps }) => (
          <div key={department.id} role="rowgroup">
            <div className="flex items-center border-b border-line bg-surface-raised px-2 text-sm" style={rowHeight}>
              <GroupLabel group={department} expanded={!collapsed.has(department.id)} onToggle={() => toggle(department.id)} />
            </div>
            {!collapsed.has(department.id) &&
              steps.map((step) => (
                <div key={step.id}>
                  <div className="flex items-center border-b border-line bg-surface-raised/60 px-2 text-sm" style={rowHeight}>
                    <GroupLabel group={step} expanded={!collapsed.has(step.id)} onToggle={() => toggle(step.id)} />
                  </div>
                  {!collapsed.has(step.id) && ordered(step.tasks).map((t) => row(t, index++))}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

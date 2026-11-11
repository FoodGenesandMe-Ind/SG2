import {
  notes,
  pipelineSteps,
  statusValues,
  tasks as allTasks,
  versions,
  type Asset,
  type Note,
  type PipelineEvent,
  type StatusDisplay,
  type Task,
  type Version,
} from '@sgp/mock-data';
import { ganttGroupingProps, taskGroupFields, type GroupBucket } from './grouping';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { FrameGrab, formatDateTime, NoteCard } from './notes';
import { Avatar, PersonChip, personName } from './people';
import type { RecordSpec } from './RecordPage';
import { StatusPill } from './StatusPill';
import { formatDate, viewsFor } from './shotsPage';
import { entityCode, taskBucket, TasksGantt, TodoSummary } from './TasksPage';

const PROJECT_ID = 'prj01';

interface Ctx {
  direction: Direction;
  statusDisplay: StatusDisplay;
}

function textBucket(key: string, label: string, sort: number | string = label): GroupBucket {
  return { key: key || 'none', label: label || 'None', detail: '', sort: label ? sort : '\uffff' };
}

function statusBucket(code: string): GroupBucket {
  const value = statusValues.find((item) => item.code === code);
  const order = statusValues.findIndex((item) => item.code === code);
  return { key: code || 'none', label: value?.label ?? code ?? 'None', detail: '', sort: order < 0 ? 999 : order };
}

const pill = (ctx: Ctx, code: string) => (
  <StatusPill code={code} pillStyle={ctx.direction.pillStyle} display={ctx.statusDisplay} />
);

function dependencyText(task: Task) {
  return (task.dependencies ?? [])
    .map((d) => {
      const pred = allTasks.find((t) => t.id === d.predecessorId);
      const step = pipelineSteps.find((s) => s.id === pred?.stepId);
      return `${step?.code ?? '?'} ${d.type}`;
    })
    .join(', ');
}

/** Top-level tasks, each followed by its sub-tasks. */
export function orderedTasks(list: Task[]) {
  return list.filter((t) => !t.parentTaskId).flatMap((t) => [t, ...list.filter((s) => s.parentTaskId === t.id)]);
}

export function taskSpec(list: Task[], ctx: Ctx, opts: { showLink?: boolean } = {}): RecordSpec<Task> {
  const rows = orderedTasks(list);
  const name = (t: Task) => (
    <span className={`flex min-w-0 items-center gap-1.5 ${t.parentTaskId ? 'pl-4 text-fg-muted' : ''}`}>
      {t.parentTaskId && <Icon name="corner-down-right" size={12} className="shrink-0 text-fg-subtle" />}
      <span className="truncate">{t.name}</span>
    </span>
  );
  return {
    icon: 'square-check',
    noun: 'task',
    plural: 'tasks',
    rows,
    rowId: (t) => t.id,
    views: viewsFor('Task', PROJECT_ID),
    defaultView: 'table',
    addLabel: 'Task',
    columns: [
      { key: 'name', label: 'Task', width: 'minmax(12rem, 1.4fr)', render: name },
      ...(opts.showLink
        ? [{ key: 'link', label: 'Link', width: '7rem', render: (t: Task) => <span className="font-medium text-accent">{entityCode(t)}</span>, sortValue: (t: Task) => entityCode(t) }]
        : []),
      { key: 'assignee', label: 'Assigned to', width: '10rem', render: (t) => <PersonChip personId={t.assigneeId} />, sortValue: (t) => personName(t.assigneeId) },
      { key: 'status', label: 'Status', width: ctx.statusDisplay === 'long' ? '8.5rem' : '5rem', render: (t) => pill(ctx, t.status) },
      { key: 'start', label: 'Start', width: '7rem', render: (t) => formatDate(t.startDate), sortValue: (t) => t.startDate },
      { key: 'due', label: 'Due', width: '7rem', render: (t) => formatDate(t.dueDate), sortValue: (t) => t.dueDate },
      { key: 'deps', label: 'Depends on', width: '7rem', render: (t) => <span className="text-xs text-fg-muted">{dependencyText(t) || '-'}</span>, sortValue: (t) => dependencyText(t) },
      {
        key: 'bid',
        label: 'Bid',
        width: '5rem',
        align: 'end',
        render: (t) => <span className="font-mono text-xs tabular-nums">{t.bidDays}d</span>,
        sortValue: (t) => t.bidDays,
        sum: (t) => (t.parentTaskId ? 0 : t.bidDays),
        sumFormat: (n) => `${n}d`,
      },
      {
        key: 'logged',
        label: 'Time logged',
        width: '6rem',
        align: 'end',
        render: (t) => <span className="font-mono text-xs tabular-nums">{t.loggedDays}d</span>,
        sortValue: (t) => t.loggedDays,
        sum: (t) => (t.parentTaskId ? 0 : t.loggedDays),
        sumFormat: (n) => `${n}d`,
      },
      { key: 'todos', label: 'To do', width: '8rem', render: (t) => <TodoSummary task={t} />, sortValue: (t) => t.todos.filter((todo) => !todo.done).length },
    ],
    card: {
      columns: 3,
      media: (t) => entityCode(t),
      title: (t) => (
        <span className="flex min-w-0 items-center gap-1.5">
          {t.parentTaskId && <Icon name="corner-down-right" size={12} className="shrink-0 text-fg-subtle" />}
          <span className="text-accent">{entityCode(t)}</span> <span className="truncate">{t.name}</span>
        </span>
      ),
      status: (t) => pill(ctx, t.status),
      fields: [
        { label: 'Assigned to', render: (t) => <PersonChip personId={t.assigneeId} /> },
        { label: 'Start', render: (t) => formatDate(t.startDate) },
        { label: 'Due', render: (t) => formatDate(t.dueDate) },
        { label: 'Depends on', render: (t) => dependencyText(t) || '-' },
        { label: 'To do', render: (t) => <TodoSummary task={t} /> },
      ],
    },
    thumb: {
      media: (t) => entityCode(t),
      caption: (t) => (
        <>
          <span className="truncate">
            <span className="text-accent">{entityCode(t)}</span> {t.name}
          </span>
          <span className="ml-auto shrink-0">{pill({ ...ctx, statusDisplay: 'icon' }, t.status)}</span>
        </>
      ),
      badge: (t) => `${t.bidDays}d`,
    },
    group: {
      fields: [
        { code: 'departmentId', label: 'Department' },
        { code: 'stepId', label: 'Pipeline step' },
        { code: 'assigneeId', label: 'Assigned to' },
        { code: 'status', label: 'Status' },
        { code: 'startDate', label: 'Start' },
        { code: 'dueDate', label: 'Due' },
        ...(opts.showLink ? [{ code: 'entityId', label: 'Link' }] : []),
        { code: 'name', label: 'Task' },
      ],
      value: (task, field) => taskBucket(task, field, ctx.statusDisplay),
    },
    gantt: {
      zoom: 19,
      render: (zoom, grouping, onColumnContextMenu) => (
        <TasksGantt
          direction={ctx.direction}
          statusDisplay={ctx.statusDisplay}
          zoom={zoom}
          taskList={list}
          grouping={grouping.length ? 'department' : 'none'}
          levels={grouping.length ? grouping : undefined}
          onColumnContextMenu={
            onColumnContextMenu
              ? (event, column) => onColumnContextMenu(event, { key: column.code, label: column.label })
              : undefined
          }
        />
      ),
    },
  };
}

export function versionSpec(list: Version[], ctx: Ctx): RecordSpec<Version> {
  const taskName = (v: Version) => allTasks.find((t) => t.id === v.taskId)?.name ?? '';
  return {
    icon: 'square-play',
    noun: 'version',
    plural: 'versions',
    rows: list,
    rowId: (v) => v.id,
    views: viewsFor('Version', PROJECT_ID),
    defaultView: 'thumb',
    addLabel: 'Version',
    columns: [
      { key: 'code', label: 'Version', width: 'minmax(13rem, 1fr)', render: (v) => <span className="font-mono text-xs text-accent">{v.code}</span> },
      { key: 'task', label: 'Task', width: '7rem', render: taskName, sortValue: taskName },
      { key: 'artist', label: 'Artist', width: '10rem', render: (v) => <PersonChip personId={v.createdById} />, sortValue: (v) => personName(v.createdById) },
      { key: 'status', label: 'Status', width: ctx.statusDisplay === 'long' ? '8.5rem' : '5rem', render: (v) => pill(ctx, v.status) },
      { key: 'submitted', label: 'Submitted', width: '8.5rem', render: (v) => formatDateTime(v.submittedAt), sortValue: (v) => v.submittedAt },
      { key: 'desc', label: 'Description', width: 'minmax(12rem, 1fr)', render: (v) => <span className="truncate text-fg-muted">{v.description}</span>, sortValue: (v) => v.description },
    ],
    card: {
      columns: 3,
      media: (v) => v.code,
      title: (v) => <span className="font-mono text-xs text-accent">{v.code}</span>,
      status: (v) => pill(ctx, v.status),
      fields: [
        { label: 'Task', render: taskName },
        { label: 'Artist', render: (v) => <PersonChip personId={v.createdById} /> },
        { label: 'Submitted', render: (v) => formatDateTime(v.submittedAt) },
        { label: 'Description', render: (v) => <span className="truncate">{v.description}</span> },
      ],
    },
    thumb: {
      media: (v) => v.code,
      caption: (v) => (
        <>
          <span className="truncate font-mono text-xs text-accent">{v.code}</span>
          <span className="ml-auto shrink-0">{pill({ ...ctx, statusDisplay: 'icon' }, v.status)}</span>
        </>
      ),
      badge: (v) => `${v.frameOut - v.frameIn + 1}f`,
    },
    group: {
      fields: [
        { code: 'status', label: 'Status' },
        { code: 'taskId', label: 'Task' },
        { code: 'createdById', label: 'Artist' },
        { code: 'submittedAt', label: 'Submitted' },
      ],
      value: (version, field) => {
        if (field === 'status') return statusBucket(version.status);
        if (field === 'taskId') return textBucket(version.taskId, taskName(version));
        if (field === 'createdById') return textBucket(version.createdById, personName(version.createdById));
        return textBucket(version.submittedAt.slice(0, 10), formatDateTime(version.submittedAt), version.submittedAt);
      },
    },
  };
}

export function noteSpec(
  threads: Note[],
  ctx: Ctx,
  opts: { onAdd?: () => void; onOpen?: (note: Note) => void } = {},
): RecordSpec<Note> {
  const repliesOf = (n: Note) => notes.filter((r) => r.parentNoteId === n.id);
  const versionCode = (n: Note) => versions.find((v) => v.id === n.versionId)?.code ?? '';
  return {
    icon: 'message-square',
    noun: 'note',
    plural: 'notes',
    rows: threads,
    rowId: (n) => n.id,
    views: viewsFor('Note', PROJECT_ID),
    defaultView: 'card',
    addLabel: 'Note',
    onAdd: opts.onAdd,
    onOpen: opts.onOpen,
    columns: [
      {
        key: 'body',
        label: 'Note',
        width: 'minmax(16rem, 1.5fr)',
        render: (n) =>
          opts.onOpen ? (
            <button className="truncate text-left text-accent hover:underline" onClick={() => opts.onOpen!(n)}>
              {n.body}
            </button>
          ) : (
            <span className="truncate">{n.body}</span>
          ),
      },
      { key: 'regarding', label: 'Regarding', width: '11rem', render: (n) => <span className="truncate font-mono text-xs text-accent">{versionCode(n)}</span>, sortValue: (n) => versionCode(n) },
      { key: 'from', label: 'From', width: '9rem', render: (n) => <PersonChip personId={n.authorId} />, sortValue: (n) => personName(n.authorId) },
      { key: 'to', label: 'To', width: '9rem', render: (n) => <PersonChip personId={n.toId} />, sortValue: (n) => personName(n.toId) },
      { key: 'status', label: 'Status', width: '6rem', render: (n) => pill(ctx, n.status) },
      { key: 'created', label: 'Created', width: '8.5rem', render: (n) => formatDateTime(n.createdAt), sortValue: (n) => n.createdAt },
      { key: 'frame', label: 'Frame', width: '4.5rem', align: 'end', render: (n) => <span className="font-mono text-xs tabular-nums">{n.frame ?? '-'}</span> },
      { key: 'replies', label: 'Replies', width: '4.5rem', align: 'end', render: (n) => repliesOf(n).length, sum: (n) => repliesOf(n).length, sortValue: (n) => repliesOf(n).length },
    ],
    card: {
      columns: 1,
      render: (n) => (
        <NoteCard note={n} replies={repliesOf(n)} direction={ctx.direction} onOpen={opts.onOpen ? () => opts.onOpen!(n) : undefined} />
      ),
    },
    thumb: {
      media: (n) => versionCode(n),
      caption: (n) => (
        <>
          <span className="truncate text-sm">{personName(n.authorId)}</span>
          <span className="ml-auto shrink-0">{pill({ ...ctx, statusDisplay: 'icon' }, n.status)}</span>
        </>
      ),
      badge: (n) => (n.frame !== undefined ? `Frame ${n.frame}` : 'Note'),
    },
    group: {
      fields: [
        { code: 'status', label: 'Status' },
        { code: 'authorId', label: 'From' },
        { code: 'toId', label: 'To' },
        { code: 'createdAt', label: 'Created' },
      ],
      value: (note, field) => {
        if (field === 'status') return statusBucket(note.status);
        if (field === 'authorId') return textBucket(note.authorId, personName(note.authorId));
        if (field === 'toId') return textBucket(note.toId, personName(note.toId));
        return textBucket(note.createdAt.slice(0, 10), formatDateTime(note.createdAt), note.createdAt);
      },
    },
  };
}

const KIND_ICON: Record<string, string> = { create: 'plus', update: 'pencil', delete: 'trash', config: 'settings', 'sign-in': 'log-in' };

function ActivityItem({ event }: { event: PipelineEvent }) {
  const version = event.table === 'Version' ? versions.find((v) => v.id === event.recordId) : undefined;
  const note = event.table === 'Note' ? notes.find((n) => n.id === event.recordId) : undefined;
  const noteVersion = note ? versions.find((v) => v.id === note.versionId) : undefined;
  return (
    <article className="flex gap-3">
      <Avatar personId={event.userId} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <header className="flex items-center gap-2 text-sm">
          <Icon name={KIND_ICON[event.kind] ?? 'activity'} size={12} className="shrink-0 text-fg-subtle" />
          <span className="truncate">{event.description}</span>
          <span className="ml-auto shrink-0 text-xs text-fg-subtle">{formatDateTime(event.at)}</span>
        </header>
        {version && event.kind === 'create' && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2">
            <span
              className="flex aspect-video w-32 shrink-0 items-center justify-center rounded-sm"
              style={{ background: placeholderThumb(version.code) }}
            >
              <Icon name="play" size={16} className="text-on-media/80" />
            </span>
            <span className="flex min-w-0 flex-col gap-1 text-sm">
              <span className="font-mono text-xs text-accent">{version.code}</span>
              <span className="text-fg-muted">{version.description}</span>
            </span>
          </div>
        )}
        {note && noteVersion && (
          <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-raised p-2 text-md">
            {note.frame !== undefined && <FrameGrab seed={noteVersion.code} markup={note.hasMarkup} />}
            <span className="min-w-0">{note.body}</span>
          </div>
        )}
      </div>
    </article>
  );
}

/** Activity: a page on the Event table, filtered to one record and everything linked to it. */
export function activitySpec(list: PipelineEvent[]): RecordSpec<PipelineEvent> {
  return {
    icon: 'activity',
    noun: 'event',
    plural: 'activity',
    rows: list,
    rowId: (e) => String(e.id),
    views: viewsFor('Event', null),
    defaultView: 'card',
    columns: [
      { key: 'at', label: 'When', width: '8.5rem', render: (e) => formatDateTime(e.at) },
      { key: 'who', label: 'Who', width: '10rem', render: (e) => <PersonChip personId={e.userId} />, sortValue: (e) => personName(e.userId) },
      { key: 'kind', label: 'Kind', width: '5.5rem', render: (e) => <span className="capitalize text-fg-muted">{e.kind}</span> },
      { key: 'what', label: 'What happened', width: 'minmax(20rem, 1fr)', render: (e) => <span className="truncate">{e.description}</span>, sortValue: (e) => e.description },
      { key: 'id', label: 'Event', width: '5.5rem', align: 'end', render: (e) => <span className="font-mono text-xs text-fg-subtle">#{e.id}</span> },
    ],
    card: { columns: 1, render: (e) => <ActivityItem event={e} /> },
    thumb: {
      media: (e) => e.recordId,
      caption: (e) => <span className="truncate text-xs">{e.description}</span>,
      badge: (e) => e.table,
    },
    group: {
      fields: [
        { code: 'kind', label: 'Kind' },
        { code: 'userId', label: 'Who' },
        { code: 'table', label: 'Table' },
      ],
      value: (event, field) => {
        if (field === 'kind') return textBucket(event.kind, event.kind);
        if (field === 'userId') return textBucket(event.userId, personName(event.userId));
        return textBucket(event.table, event.table);
      },
    },
  };
}

export function assetSpec(list: Asset[], ctx: Ctx): RecordSpec<Asset> {
  const library = (a: Asset) =>
    a.projectId === null ? <span className="rounded-sm bg-accent-subtle px-1 text-xs text-fg">Library</span> : <span className="text-fg-subtle">Project</span>;
  return {
    icon: 'box',
    noun: 'asset',
    plural: 'assets',
    rows: list,
    rowId: (a) => a.id,
    views: viewsFor('Asset', PROJECT_ID),
    defaultView: 'card',
    addLabel: 'Asset',
    columns: [
      { key: 'name', label: 'Asset', width: 'minmax(12rem, 1fr)', render: (a) => <span className="font-medium">{a.name}</span> },
      { key: 'code', label: 'Code', width: '9rem', render: (a) => <span className="font-mono text-xs">{a.code}</span> },
      { key: 'type', label: 'Type', width: '6rem', render: (a) => <span className="capitalize">{a.type}</span> },
      { key: 'scope', label: 'Scope', width: '6rem', render: library, sortValue: (a) => (a.projectId === null ? 'Library' : 'Project') },
      { key: 'status', label: 'Status', width: '8.5rem', render: (a) => pill(ctx, a.status) },
    ],
    card: {
      columns: 3,
      media: (a) => a.code,
      title: (a) => a.name,
      status: (a) => pill(ctx, a.status),
      fields: [
        { label: 'Code', render: (a) => <span className="font-mono text-xs">{a.code}</span> },
        { label: 'Type', render: (a) => <span className="capitalize">{a.type}</span> },
        { label: 'Scope', render: library },
      ],
    },
    thumb: {
      media: (a) => a.code,
      caption: (a) => (
        <>
          <span className="truncate">{a.name}</span>
          <span className="ml-auto shrink-0">{pill({ ...ctx, statusDisplay: 'icon' }, a.status)}</span>
        </>
      ),
    },
    group: {
      fields: [
        { code: 'type', label: 'Type' },
        { code: 'status', label: 'Status' },
        { code: 'scope', label: 'Scope' },
      ],
      value: (asset, field) => {
        if (field === 'status') return statusBucket(asset.status);
        if (field === 'type') return textBucket(asset.type, asset.type);
        return textBucket(asset.projectId ?? 'library', asset.projectId === null ? 'Library' : 'Project');
      },
    },
    gantt: {
      separate: true,
      zoom: 30,
      taskFields: taskGroupFields('Asset'),
      render: (zoom, grouping, onColumnContextMenu) => (
        <TasksGantt
          direction={ctx.direction}
          statusDisplay={ctx.statusDisplay}
          zoom={zoom}
          taskList={allTasks.filter((task) => task.entityType === 'Asset' && list.some((asset) => asset.id === task.entityId))}
          {...ganttGroupingProps(grouping, false)}
          onColumnContextMenu={
            onColumnContextMenu
              ? (event, column) => onColumnContextMenu(event, { key: column.code, label: column.label })
              : undefined
          }
        />
      ),
    },
  };
}

export function publishSpec(): RecordSpec<never> {
  return {
    icon: 'package',
    noun: 'publish',
    plural: 'publishes',
    rows: [],
    rowId: () => '',
    views: ['table', 'card', 'thumb'],
    defaultView: 'table',
    emptyMessage: 'No publishes yet. Files appear here when artists submit work from their sandbox into the pipeline.',
    columns: [],
    card: {},
    thumb: { media: () => '', caption: () => null },
  };
}

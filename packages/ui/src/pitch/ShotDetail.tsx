import {
  assets,
  events,
  notes,
  pipelineSteps,
  projects,
  resolveTableConfig,
  sequences,
  shots,
  tasks,
  versions,
  type EffectiveField,
  type GroupLevel,
  type Shot,
  type StatusDisplay,
} from '@sgp/mock-data';
import { useState, type ReactNode } from 'react';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { formatDateTime } from './notes';
import { Avatar, PersonChip, personName } from './people';
import { RecordPage } from './RecordPage';
import { activitySpec, assetSpec, noteSpec, publishSpec, taskSpec, versionSpec } from './recordSpecs';
import { ShotCell } from './ShotGridSpecimen';
import { StatusPill } from './StatusPill';
import { assetNames } from './shotsPage';

export type ShotTab = 'activity' | 'info' | 'tasks' | 'versions' | 'notes' | 'publishes' | 'assets';

export function shotData(shot: Shot) {
  const shotTasks = tasks.filter((t) => t.entityType === 'Shot' && t.entityId === shot.id);
  const taskIds = new Set(shotTasks.map((t) => t.id));
  const shotVersions = versions
    .filter((v) => taskIds.has(v.taskId))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const versionIds = new Set(shotVersions.map((v) => v.id));
  const shotNotes = notes.filter((n) => versionIds.has(n.versionId));
  const threads = shotNotes.filter((n) => !n.parentNoteId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const recordIds = new Set([shot.id, ...taskIds, ...versionIds, ...shotNotes.map((n) => n.id)]);
  const activity = events.filter((e) => recordIds.has(e.recordId)).sort((a, b) => b.id - a.id);
  const linkedAssets = shot.assetIds.map((id) => assets.find((a) => a.id === id)!).filter(Boolean);
  return { shotTasks, shotVersions, shotNotes, threads, activity, linkedAssets };
}

function Field({ label, calculated, children }: { label: string; calculated?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="flex items-center gap-1 text-xs text-fg-subtle">
        {calculated && <Icon name="square-function" size={11} />}
        {label}
      </dt>
      <dd className="flex min-w-0 items-center truncate text-md">{children}</dd>
    </div>
  );
}

export function HeaderButton({ icon, children, primary }: { icon: string; children: ReactNode; primary?: boolean }) {
  return (
    <button
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 text-sm ${
        primary
          ? 'bg-accent font-medium text-fg-inverse hover:bg-accent-hover'
          : 'border border-line-strong text-fg-muted hover:bg-row-hover hover:text-fg'
      }`}
      style={{ height: 'var(--sgp-row-compact)' }}
    >
      <Icon name={icon} /> {children}
    </button>
  );
}

export function DetailTabs<T extends string>({
  tabs,
  tab,
  onTab,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>;
  tab: T;
  onTab: (tab: T) => void;
}) {
  return (
    <nav role="tablist" className="-mb-px flex gap-1" aria-label="Sections">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={tab === t.id}
          onClick={() => onTab(t.id)}
          className={`flex items-center gap-1.5 border-b-2 px-3 text-sm ${
            tab === t.id ? 'border-accent font-medium text-fg' : 'border-transparent text-fg-muted hover:text-fg'
          }`}
          style={{ height: 'calc(var(--sgp-row-compact) + 0.5rem)' }}
        >
          {t.label}
          {t.count !== undefined && <span className="text-xs text-fg-subtle">{t.count}</span>}
        </button>
      ))}
    </nav>
  );
}

function NewNoteDialog({ shot, onClose }: { shot: Shot; onClose: () => void }) {
  const { shotVersions, shotTasks } = shotData(shot);
  const current = shotTasks.find((t) => t.id === shotVersions[0]?.taskId);
  const field = 'flex items-center gap-2 border-b border-line py-2 text-sm';
  return (
    <div className="absolute inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-16" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="New note"
        className="flex w-[36rem] flex-col rounded-lg border border-line-strong bg-surface-raised p-4"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-2 flex items-center">
          <h2 className="text-lg font-semibold">New note</h2>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className={field}>
          <span className="w-20 text-fg-subtle">To</span>
          {current && (
            <span className="flex items-center gap-1 rounded-sm bg-surface-sunken px-1.5">
              <Avatar personId={current.assigneeId} /> {personName(current.assigneeId)}
            </span>
          )}
          <span className="text-fg-subtle">Add people or groups</span>
        </div>
        <div className={field}>
          <span className="w-20 text-fg-subtle">Cc</span>
          <span className="flex items-center gap-1 rounded-sm bg-surface-sunken px-1.5">
            <Icon name="users" size={12} /> Shot followers
          </span>
        </div>
        <div className={field}>
          <span className="w-20 text-fg-subtle">Regarding</span>
          <span className="font-medium text-accent">{shot.code}</span>
          {shotVersions[0] && <span className="font-mono text-xs text-fg-muted">{shotVersions[0].code}</span>}
        </div>
        <div className={field}>
          <span className="w-20 text-fg-subtle">Labels</span>
          <span className="rounded-sm bg-accent-subtle px-1.5 text-xs">Comp</span>
          <span className="rounded-sm bg-accent-subtle px-1.5 text-xs">Director note</span>
        </div>
        <textarea
          aria-label="Note"
          placeholder="Write your note..."
          rows={5}
          className="mt-3 resize-none rounded-md border border-line bg-surface-sunken p-2 text-md outline-none placeholder:text-fg-subtle focus:border-accent"
        />
        <div className="mt-3 flex items-center gap-3 text-fg-subtle">
          <Icon name="paperclip" />
          <Icon name="pen-line" />
          <Icon name="film" />
          <span className="ml-auto flex items-center gap-2">
            <button className="rounded-md px-3 text-sm text-fg-muted hover:bg-row-hover" style={{ height: 'var(--sgp-row-compact)' }} onClick={onClose}>
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-fg-inverse"
              style={{ height: 'var(--sgp-row-compact)' }}
              onClick={onClose}
            >
              <Icon name="send" /> Send
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}

function ShotInfo({ shot, direction, schemaFields }: { shot: Shot; direction: Direction; schemaFields?: EffectiveField[] }) {
  const config = resolveTableConfig('Shot', shot.projectId)!;
  const sequence = sequences.find((s) => s.id === shot.sequenceId)!;
  const project = projects.find((p) => p.id === shot.projectId);
  const [showHidden, setShowHidden] = useState(false);
  const hiddenCount = config.fields.filter((f) => f.hidden).length;
  const fields = (schemaFields ?? config.fields).filter((f) => showHidden || !f.hidden);

  const value = (f: (typeof config.fields)[number]) => {
    const raw = shot[f.code as keyof Shot];
    if (f.code === 'projectId') return project?.name ?? '-';
    if (f.code === 'sequenceId') return `${sequence.code} ${sequence.name}`;
    if (f.code === 'assetIds') return assetNames(shot.assetIds, 10);
    if (f.type === 'media') return <span className="block aspect-video w-16 rounded-sm" style={{ background: placeholderThumb(shot.code) }} />;
    if (raw === undefined || raw === null || raw === '') return <span className="text-fg-subtle">-</span>;
    if (f.type === 'user') return <PersonChip personId={String(raw)} />;
    if (f.type === 'date' && String(raw).includes('T')) return formatDateTime(String(raw));
    if (f.code === 'id') return <span className="font-mono text-xs">{String(raw)}</span>;
    return <ShotCell field={f} shot={shot} direction={direction} statusDisplay="long" fields={schemaFields} />;
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm">
        <span className="text-fg-subtle">{fields.length} fields</span>
        {hiddenCount > 0 && (
          <label className="ml-auto flex items-center gap-1.5 text-fg-muted">
            <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="accent-[var(--sgp-color-accent)]" />
            Show {hiddenCount} {hiddenCount === 1 ? 'field' : 'fields'} hidden in this project
          </label>
        )}
      </div>
      <dl className="grid grid-cols-[12rem_minmax(0,1fr)_14rem] items-center gap-x-4 px-4 text-md">
        {fields.map((f) => (
          <div key={f.code} className="contents">
            <dt className="flex items-center gap-1 border-b border-line py-1.5 text-fg-subtle">
              {f.type === 'calculated' && <Icon name="square-function" size={12} />}
              {f.label}
            </dt>
            <dd className="flex min-w-0 items-center gap-2 border-b border-line py-1.5">
              {value(f)}
              {f.hidden && <span className="rounded-sm bg-surface-sunken px-1.5 text-xs text-fg-subtle">Hidden in this project</span>}
            </dd>
            <dd className="truncate border-b border-line py-1.5 text-right font-mono text-xs text-fg-subtle">
              {f.code} · {f.type}
              {f.system ? ' · system' : ''}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function ShotDetail({
  shotId,
  direction,
  statusDisplay,
  initialTab = 'activity',
  onBack,
  onNavigate,
  onOpenNote,
  schemaFields,
}: {
  shotId: string;
  direction: Direction;
  statusDisplay: StatusDisplay;
  initialTab?: ShotTab;
  onBack: () => void;
  onNavigate: (shotId: string) => void;
  onOpenNote: (noteId: string) => void;
  /** Live field definitions, including a formula saved in this session. */
  schemaFields?: EffectiveField[];
}) {
  const shot = shots.find((s) => s.id === shotId)!;
  const sequence = sequences.find((s) => s.id === shot.sequenceId)!;
  const config = resolveTableConfig('Shot', shot.projectId)!;
  const field = (code: string) => schemaFields?.find((f) => f.code === code) ?? config.fields.find((f) => f.code === code && !f.hidden);
  const data = shotData(shot);
  const [tab, setTab] = useState<ShotTab>(initialTab);
  const [composing, setComposing] = useState(false);
  const [groupings, setGroupings] = useState<Partial<Record<ShotTab, GroupLevel[]>>>({});
  const groupingFor = (id: ShotTab) => groupings[id] ?? [];
  const setGroupingFor = (id: ShotTab) => (levels: GroupLevel[]) => setGroupings((all) => ({ ...all, [id]: levels }));
  const projectShots = shots.filter((s) => s.projectId === shot.projectId);
  const index = projectShots.findIndex((s) => s.id === shot.id);
  const topTasks = data.shotTasks.filter((t) => !t.parentTaskId);
  const openNotes = data.threads.filter((n) => n.status === 'open').length;
  const ctx = { direction, statusDisplay };

  const tabs: Array<{ id: ShotTab; label: string; count?: number }> = [
    { id: 'activity', label: 'Activity', count: data.activity.length },
    { id: 'info', label: 'Shot info' },
    { id: 'tasks', label: 'Tasks', count: topTasks.length },
    { id: 'versions', label: 'Versions', count: data.shotVersions.length },
    { id: 'notes', label: 'Notes', count: data.threads.length },
    { id: 'publishes', label: 'Publishes', count: 0 },
    { id: 'assets', label: 'Assets', count: data.linkedAssets.length },
  ];

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-surface">
      <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 pt-3">
        <div className="flex items-center gap-1 text-xs text-fg-subtle">
          <span>The Last Lamplighter</span>
          <Icon name="chevron-right" size={12} />
          <span>Production</span>
          <Icon name="chevron-right" size={12} />
          <button className="hover:text-fg hover:underline" onClick={onBack}>
            Shots
          </button>
          <Icon name="chevron-right" size={12} />
          <span className="text-fg-muted">{shot.code}</span>
        </div>

        <div className="flex gap-4">
          <div
            className="relative flex aspect-video w-64 shrink-0 items-center justify-center rounded-md"
            style={{ background: placeholderThumb(shot.code) }}
          >
            <Icon name="play" size={28} className="text-on-media/80" />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center gap-3">
              <button
                className="flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40"
                aria-label="Previous shot"
                disabled={index <= 0}
                onClick={() => onNavigate(projectShots[index - 1].id)}
              >
                <Icon name="chevron-left" />
              </button>
              <h1 className="text-2xl font-semibold">{shot.code}</h1>
              <button
                className="flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-row-hover hover:text-fg disabled:opacity-40"
                aria-label="Next shot"
                disabled={index >= projectShots.length - 1}
                onClick={() => onNavigate(projectShots[index + 1].id)}
              >
                <Icon name="chevron-right" />
              </button>
              <StatusPill code={shot.status} pillStyle={direction.pillStyle} display="long" />
              <span className="ml-auto flex items-center gap-2">
                <HeaderButton icon="play" primary>
                  Play latest
                </HeaderButton>
                <HeaderButton icon="box">Open in Blender</HeaderButton>
                <HeaderButton icon="bell">Follow</HeaderButton>
              </span>
            </div>
            <div className="text-sm text-fg-muted">
              Sequence <span className="font-medium text-fg">{sequence.code}</span> {sequence.name}
            </div>
            <p className="text-md">{shot.description}</p>
            <dl className="grid grid-cols-6 gap-x-4 gap-y-2">
              {['frameIn', 'frameOut', 'totalFrames', 'dueDate', 'animationDue'].map((code) => {
                const f = field(code);
                if (!f) return null;
                return (
                  <Field key={code} label={f.label} calculated={f.type === 'calculated'}>
                    <ShotCell field={f} shot={shot} direction={direction} statusDisplay={statusDisplay} fields={schemaFields} />
                  </Field>
                );
              })}
              <Field label="Open notes">{openNotes}</Field>
            </dl>
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Pipeline">
              {pipelineSteps
                .filter((s) => s.appliesTo === 'Shot')
                .map((step) => {
                  const task = topTasks.find((t) => t.stepId === step.id);
                  return (
                    <span
                      key={step.id}
                      className="flex items-center gap-1 rounded-md border border-line bg-surface-raised px-1.5 text-xs"
                      style={{ height: 'var(--sgp-row-compact)' }}
                      title={task ? `${step.name}: ${personName(task.assigneeId)}` : step.name}
                    >
                      <span className="font-medium text-fg-muted">{step.code}</span>
                      {task && <StatusPill code={task.status} pillStyle={direction.pillStyle} display="icon" />}
                    </span>
                  );
                })}
            </div>
          </div>
        </div>

        <DetailTabs tabs={tabs} tab={tab} onTab={setTab} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {tab === 'activity' && (
          <RecordPage
            spec={activitySpec(data.activity)}
            direction={direction}
            grouping={groupingFor('activity')}
            onGrouping={setGroupingFor('activity')}
            groupNote="This is the activity for this shot. Its grouping is separate from the Shots page, and it stays as you switch this tab's views."
          />
        )}

        {tab === 'info' && <ShotInfo shot={shot} direction={direction} schemaFields={schemaFields} />}

        {tab === 'tasks' && (
          <RecordPage
            spec={{ ...taskSpec(data.shotTasks, ctx), defaultView: 'gantt' }}
            direction={direction}
            grouping={groupingFor('tasks')}
            onGrouping={setGroupingFor('tasks')}
            groupNote="These are the tasks linked to this shot. Their grouping is separate from the Shots page, uses task fields, and stays when you switch this tab between table, cards, thumbnails, and gantt."
          />
        )}
        {tab === 'versions' && (
          <RecordPage
            spec={versionSpec(data.shotVersions, ctx)}
            direction={direction}
            grouping={groupingFor('versions')}
            onGrouping={setGroupingFor('versions')}
            groupNote="These are the versions linked to this shot. Their grouping is separate from the Shots page, and it stays as you switch this tab's views."
          />
        )}
        {tab === 'notes' && (
          <RecordPage
            spec={noteSpec(data.threads, ctx, { onAdd: () => setComposing(true), onOpen: (n) => onOpenNote(n.id) })}
            direction={direction}
            grouping={groupingFor('notes')}
            onGrouping={setGroupingFor('notes')}
            groupNote="These are the notes linked to this shot. Their grouping is separate from the Shots page, and it stays as you switch this tab's views."
          />
        )}
        {tab === 'publishes' && (
          <RecordPage
            spec={publishSpec()}
            direction={direction}
            grouping={groupingFor('publishes')}
            onGrouping={setGroupingFor('publishes')}
            groupNote="Publishes for this shot have their own grouping, separate from the Shots page."
          />
        )}
        {tab === 'assets' && (
          <RecordPage
            spec={assetSpec(data.linkedAssets, ctx)}
            direction={direction}
            grouping={groupingFor('assets')}
            onGrouping={setGroupingFor('assets')}
            groupNote="These are the assets linked to this shot. Their grouping is separate from the Shots page, and it stays as you switch this tab's views."
          />
        )}
      </div>

      {composing && <NewNoteDialog shot={shot} onClose={() => setComposing(false)} />}
    </div>
  );
}


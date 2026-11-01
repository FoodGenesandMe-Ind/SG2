import { assets, resolveTableConfig } from '@sgp/mock-data';
import type { ReactNode } from 'react';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';
import { VIEW_ICON, VIEW_LABEL } from './shotsPage';

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

function statusList(table: string, projectId: string) {
  return resolveTableConfig(table, projectId)!.fields.find((f) => f.code === 'status')!.validValues ?? [];
}

function StatusPanel({ direction }: { direction: Direction }) {
  const lmp = statusList('Shot', 'prj01');
  const groups = [
    { label: 'The Last Lamplighter shots: long name', codes: lmp, display: 'long' as const },
    { label: 'Short name', codes: lmp, display: 'short' as const },
    { label: 'Icon only (name on hover)', codes: lmp, display: 'icon' as const },
    { label: 'Lamplighter Teaser shots', codes: statusList('Shot', 'prj02'), display: 'long' as const },
    { label: 'Tasks and versions', codes: statusList('Task', 'prj01'), display: 'long' as const },
  ];
  return (
    <Panel title="Status values (client data)">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5">
          <span className="text-xs text-fg-subtle">{group.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {group.codes.map((code) => (
              <StatusPill key={code} code={code} pillStyle={direction.pillStyle} display={group.display} />
            ))}
          </div>
        </div>
      ))}
    </Panel>
  );
}

function ControlsPanel() {
  const button = 'inline-flex items-center gap-1.5 rounded-md px-3 text-sm font-medium';
  const height = { height: 'var(--sgp-row-compact)' };
  return (
    <Panel title="Controls">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`${button} bg-accent text-fg-inverse hover:bg-accent-hover`} style={height}>
          <Icon name="plus" /> Shot
        </button>
        <button className={`${button} border border-line-strong bg-surface-raised hover:bg-row-hover`} style={height}>
          Secondary
        </button>
        <button className={`${button} text-fg-muted hover:bg-row-hover hover:text-fg`} style={height}>
          Ghost
        </button>
        <button className={`${button} bg-danger text-fg-inverse`} style={height}>
          Delete
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label
          className="flex w-56 items-center gap-2 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg-subtle focus-within:border-accent"
          style={height}
        >
          <Icon name="search" />
          <input className="w-full bg-transparent text-fg outline-none placeholder:text-fg-subtle" placeholder="Search shots" />
        </label>
        <div className="flex rounded-md border border-line-strong p-0.5 text-sm" style={height}>
          {(['table', 'card', 'thumb'] as const).map((view, i) => (
            <span
              key={view}
              className={`flex items-center gap-1 rounded-sm px-2 ${i === 0 ? 'bg-accent-subtle font-medium text-fg' : 'text-fg-muted'}`}
            >
              <Icon name={VIEW_ICON[view]} /> {VIEW_LABEL[view]}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="checkbox" defaultChecked className="accent-[var(--sgp-color-accent)]" /> Show omitted
        </label>
        <span className="flex items-center gap-1.5 text-fg-muted">
          <Icon name="sliders-horizontal" /> Group by <span className="font-medium text-fg">Sequence</span>
          <Icon name="chevron-down" size={12} />
        </span>
      </div>
    </Panel>
  );
}

function CardsPanel({ direction }: { direction: Direction }) {
  const ezra = assets.find((a) => a.id === 'a-ezra')!;
  const pip = assets.find((a) => a.id === 'a-pip')!;
  return (
    <Panel title="Cards (collapsed and expanded)">
      <div className="flex items-center gap-2 rounded-md border border-line bg-surface-raised p-2">
        <Icon name="chevron-right" size={12} className="shrink-0 text-fg-subtle" />
        <span className="h-9 w-16 rounded-sm" style={{ background: placeholderThumb(pip.code) }} />
        <span className="font-medium">{pip.name}</span>
        <span className="ml-auto">
          <StatusPill code={pip.status} pillStyle={direction.pillStyle} />
        </span>
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-line bg-surface-raised p-2">
        <div className="flex items-center gap-2">
          <Icon name="chevron-down" size={12} className="shrink-0 text-fg-subtle" />
          <span className="h-9 w-16 rounded-sm" style={{ background: placeholderThumb(ezra.code) }} />
          <span className="font-medium">{ezra.name}</span>
          <span className="ml-auto">
            <StatusPill code={ezra.status} pillStyle={direction.pillStyle} />
          </span>
        </div>
        <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-1 text-sm">
          <dt className="text-fg-subtle">Asset</dt>
          <dd className="font-mono text-xs leading-5">{ezra.code}</dd>
          <dt className="text-fg-subtle">Type</dt>
          <dd className="capitalize">{ezra.type}</dd>
          <dt className="text-fg-subtle">Library</dt>
          <dd>Company library, used in 2 projects</dd>
          <dt className="text-fg-subtle">Description</dt>
          <dd>{ezra.description}</dd>
        </dl>
      </div>
    </Panel>
  );
}

function TypePanel() {
  return (
    <Panel title="Type">
      <div className="flex flex-col gap-1">
        <span className="text-2xl font-semibold">The Last Lamplighter</span>
        <span className="text-xl font-semibold">Shots</span>
        <span className="text-lg">Ezra lights the last lamp.</span>
        <span className="text-md">Body and grid text, 13px. Lamp after lamp blooms down the street.</span>
        <span className="text-sm text-fg-muted">Secondary text, 12px. Due Dec 4, animation due Nov 6.</span>
        <span className="text-xs text-fg-subtle">Caption, 11px. Updated 3 minutes ago by Lena Fischer.</span>
        <span className="font-mono text-xs tabular-nums text-fg-muted">1001 - 1096 · CHR_ezra_RIG_v003</span>
        <span className="font-script text-md">EXT. COBBLESTONE STREET - DUSK</span>
      </div>
    </Panel>
  );
}

export function ComponentStrip({ direction }: { direction: Direction }) {
  return (
    <div className="grid grid-cols-4 gap-4 p-4">
      <StatusPanel direction={direction} />
      <ControlsPanel />
      <CardsPanel direction={direction} />
      <TypePanel />
    </div>
  );
}

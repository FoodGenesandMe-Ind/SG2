import {
  assets,
  buildNavTree,
  company,
  events,
  issues,
  notes,
  pages,
  people,
  projects,
  shots,
  statusValues,
  tables,
  tasks,
  branchStatus,
  templates,
  versions,
  type NavLevel,
} from '@sgp/mock-data';

const plannedScreens = [
  'App shell and left navigation tree',
  'Table page',
  'Card view',
  'Page settings (query, filters, conditional formatting)',
  'Dashboard page and widget library',
  'Entity detail page',
  'Schema and configuration admin',
  'Branches and templates',
  'Permissions admin',
  'Events page',
  'Script room',
  'World bible',
  'Review player',
  'Sandbox and submit flow',
  'AI assistant panel',
];

const VIEWER_ID = 'p01';

function statusLabel(code: string) {
  return statusValues.find((s) => s.code === code)?.label ?? code;
}

function NavLevelOutline({ level }: { level: NavLevel }) {
  return (
    <li className="flex flex-col gap-1">
      <span className="font-semibold">{level.label}</span>
      <ul className="ml-4 flex flex-col gap-0.5 text-fg-muted">
        <li>Tables: {level.tables.map((t) => t.label).join(', ')}</li>
        {level.folders.map(({ folder, pages: folderPages }) => (
          <li key={folder.id}>
            Folder {folder.name}: {folderPages.map((p) => p.name).join(', ') || 'empty'}
          </li>
        ))}
        {level.pages.map((page) => (
          <li key={page.id}>Page {page.name}</li>
        ))}
        {level.multiProject && (
          <li>Multi-project pages: {level.multiProject.map((p) => p.name).join(', ') || 'empty'}</li>
        )}
        <li>Personal: {level.personal.map((p) => p.name).join(', ') || 'empty'}</li>
      </ul>
    </li>
  );
}

export function App() {
  const nav = buildNavTree(VIEWER_ID);
  const productions = projects.filter((p) => !p.isTemplate);
  const counts = [
    ['Projects', productions.length],
    ['Templates', templates.length],
    ['Tables', tables.length],
    ['Saved pages', pages.length],
    ['Shots', shots.length],
    ['Assets', assets.length],
    ['Tasks', tasks.length],
    ['Versions', versions.length],
    ['Notes', notes.length],
    ['Issues', issues.length],
    ['Events', events.length],
    ['People', people.length],
  ] as const;

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 p-8">
      <header className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-fg-subtle">Scaffolding, not a design</span>
        <h1 className="text-2xl font-semibold">SGPipeline prototype</h1>
        <p className="text-fg-muted">
          Screens are added here as they are designed. Each uses only Approved components from the library.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">Planned screens</h2>
        <ol className="flex flex-col gap-1">
          {plannedScreens.map((name, i) => (
            <li key={name} className="flex justify-between border-b border-line py-1">
              <span>
                {i + 1}. {name}
              </span>
              <span className="text-fg-subtle">Not started</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Mock company: {company.name}
        </h2>
        <ul className="flex flex-wrap gap-x-6 gap-y-1">
          {counts.map(([label, value]) => (
            <li key={label}>
              <span className="text-fg-subtle">{label}</span> {value}
            </li>
          ))}
        </ul>
        {productions.map((project) => {
          const projectShots = shots.filter((s) => s.projectId === project.id);
          const byStatus = [...new Set(projectShots.map((s) => s.status))].map(
            (code) => `${statusLabel(code)} ${projectShots.filter((s) => s.status === code).length}`,
          );
          const branch = branchStatus(project.id);
          const count = (status: string) => branch?.incoming.filter((c) => c.status === status).length ?? 0;
          const conflicts = branch?.incoming.filter((c) => c.status === 'queued' && c.conflictsWith).length ?? 0;
          return (
            <div key={project.id} className="flex flex-col gap-0.5">
              <span>{project.name}</span>
              <span className="text-fg-muted">Shots by status: {byStatus.join(', ')}</span>
              {branch && (
                <span className="text-fg-muted">
                  Started from {branch.template.name} v{branch.source.version} (template now v
                  {branch.latestTemplateVersion}). Incoming changes: {count('queued')} queued ({conflicts} in
                  conflict), {count('accepted')} accepted, {count('dismissed')} dismissed. Local changes:{' '}
                  {branch.localChanges.length}.
                </span>
              )}
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">
          Navigation data for {people.find((p) => p.id === VIEWER_ID)?.name}
        </h2>
        <ul className="flex flex-col gap-3">
          <NavLevelOutline level={nav.company} />
          {nav.projects.map((level) => (
            <NavLevelOutline key={level.label} level={level} />
          ))}
        </ul>
      </section>
    </main>
  );
}

import { buildNavTree, type EffectiveTable, type NavLevel, type Page } from '@sgp/mock-data';
import { createContext, useContext, useLayoutEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { VIEW_ICON } from './shotsPage';

export type NavMode = 'docked' | 'undocked';

interface NavContext {
  activePageId: string;
  onOpenPage?: (pageId: string) => void;
}

const NavCtx = createContext<NavContext>({ activePageId: '' });

/** Survives docking and undocking, so the tree reopens exactly where it was. */
let savedScrollTop = 0;

function pageIcon(page: Page) {
  return page.type === 'dashboard' ? 'layout-dashboard' : VIEW_ICON[page.view];
}

function Row({
  depth,
  icon,
  label,
  active,
  expandable,
  expanded,
  count,
  strong,
  onClick,
}: {
  depth: number;
  icon?: string;
  label: ReactNode;
  active?: boolean;
  expandable?: boolean;
  expanded?: boolean;
  count?: number;
  strong?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      role={onClick ? 'link' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-sm pr-2 text-sm hover:bg-row-hover ${onClick ? 'cursor-pointer' : ''} ${
        active ? 'bg-nav-active font-medium text-fg' : strong ? 'font-semibold text-fg' : 'text-fg-muted'
      }`}
      style={{ height: 'var(--sgp-row-compact)', paddingLeft: `${0.25 + depth * 0.875}rem` }}
    >
      <span className="flex w-3 shrink-0 justify-center text-fg-subtle">
        {expandable && <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />}
      </span>
      {icon && <Icon name={icon} className={`shrink-0 ${active ? 'text-accent' : 'text-fg-subtle'}`} />}
      <span className="truncate">{label}</span>
      {count !== undefined && <span className="ml-auto text-xs text-fg-subtle">{count}</span>}
    </div>
  );
}

function TableRows({ tables, depth }: { tables: EffectiveTable[]; depth: number }) {
  return tables.map((table) => <Row key={table.code} depth={depth} icon={table.icon} label={table.label} />);
}

function PageRows({ pages, depth }: { pages: Page[]; depth: number }) {
  const { activePageId, onOpenPage } = useContext(NavCtx);
  return pages.map((page) => (
    <Row
      key={page.id}
      depth={depth}
      icon={pageIcon(page)}
      label={page.name}
      active={page.id === activePageId}
      onClick={onOpenPage ? () => onOpenPage(page.id) : undefined}
    />
  ));
}

/** The contents of one level (Company or a project), starting at the given depth. */
function LevelItems({ level, depth }: { level: NavLevel; depth: number }) {
  return (
    <>
      <TableRows tables={level.tables} depth={depth} />
      {level.folders.map(({ folder, tables, pages }) => (
        <div key={folder.id} className="flex flex-col gap-0.5">
          <Row depth={depth} icon="folder-open" label={folder.name} expandable expanded />
          <TableRows tables={tables} depth={depth + 1} />
          <PageRows pages={pages} depth={depth + 1} />
        </div>
      ))}
      <PageRows pages={level.pages} depth={depth} />
      {level.multiProject && (
        <>
          <Row depth={depth} icon="layers" label="Multi-project pages" expandable expanded />
          <PageRows pages={level.multiProject} depth={depth + 1} />
        </>
      )}
      <Row
        depth={depth}
        icon="user"
        label="Personal"
        expandable
        expanded={level.personal.length > 0}
        count={level.personal.length}
      />
      <PageRows pages={level.personal} depth={depth + 1} />
    </>
  );
}

function NavHeader({ mode, onToggleDock }: { mode: NavMode; onToggleDock: () => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b border-line p-2">
      <label
        className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-line bg-surface-sunken px-2 text-sm text-fg-subtle focus-within:border-accent"
        style={{ height: 'var(--sgp-row-compact)' }}
      >
        <Icon name="search" className="shrink-0" />
        <input
          aria-label="Search navigation"
          placeholder="Search navigation"
          className="min-w-0 flex-1 bg-transparent text-fg outline-none placeholder:text-fg-subtle"
        />
      </label>
      <button
        className="flex size-7 items-center justify-center rounded-md text-fg-muted hover:bg-row-hover hover:text-fg"
        title={mode === 'docked' ? 'Undock navigation' : 'Dock navigation'}
        aria-label={mode === 'docked' ? 'Undock navigation' : 'Dock navigation'}
        onClick={onToggleDock}
      >
        <Icon name={mode === 'docked' ? 'panel-left-close' : 'pin'} size={15} />
      </button>
    </div>
  );
}

function NavPanel({ mode, onToggleDock, viewerId }: { mode: NavMode; onToggleDock: () => void; viewerId: string }) {
  const nav = buildNavTree(viewerId);
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = savedScrollTop;
  }, []);
  return (
    <>
      <NavHeader mode={mode} onToggleDock={onToggleDock} />
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto p-2"
        onScroll={(event) => (savedScrollTop = event.currentTarget.scrollTop)}
      >
        <div className="flex flex-col gap-0.5">
          <LevelItems level={nav.company} depth={0} />
          <span className="mt-3 px-1 pb-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Projects</span>
          {nav.projects.map((level, i) => (
            <div key={level.label} className="flex flex-col gap-0.5">
              <Row depth={0} icon="clapperboard" label={level.label} expandable expanded={i === 0} strong />
              {i === 0 && <LevelItems level={level} depth={1} />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/**
 * Docked: the panel is part of the layout and pushes content over.
 * Undocked: a slim rail; opening it floats the panel over the content until it is dismissed or docked again.
 */
export function NavTreeSpecimen({
  activePageId,
  onOpenPage,
  ...props
}: NavBodyProps & NavContext) {
  return (
    <NavCtx.Provider value={{ activePageId, onOpenPage }}>
      <NavBody {...props} />
    </NavCtx.Provider>
  );
}

interface NavBodyProps {
  mode: NavMode;
  overlayOpen: boolean;
  onToggleDock: () => void;
  onToggleOverlay: () => void;
  viewerId?: string;
}

function NavBody({ mode, overlayOpen, onToggleDock, onToggleOverlay, viewerId = 'p01' }: NavBodyProps) {
  if (mode === 'docked') {
    return (
      <nav aria-label="Navigation" className="flex w-64 shrink-0 flex-col border-r border-line bg-nav">
        <NavPanel mode={mode} onToggleDock={onToggleDock} viewerId={viewerId} />
      </nav>
    );
  }

  return (
    <>
      <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-r border-line bg-nav py-2">
        <button
          className={`flex size-7 items-center justify-center rounded-md hover:bg-row-hover hover:text-fg ${
            overlayOpen ? 'bg-nav-active text-fg' : 'text-fg-muted'
          }`}
          title="Show navigation"
          aria-label="Show navigation"
          aria-expanded={overlayOpen}
          onClick={onToggleOverlay}
        >
          <Icon name="panel-left-open" size={15} />
        </button>
      </div>
      {overlayOpen && (
        <nav
          aria-label="Navigation"
          className="absolute top-0 bottom-0 left-10 z-30 flex w-64 flex-col border-r border-line-strong bg-nav"
          style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        >
          <NavPanel mode={mode} onToggleDock={onToggleDock} viewerId={viewerId} />
        </nav>
      )}
    </>
  );
}

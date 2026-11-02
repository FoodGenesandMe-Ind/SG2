import { company, type StatusDisplay, type TableView } from '@sgp/mock-data';
import { useCallback, useState, type ReactNode } from 'react';
import { ColumnMenu } from './ColumnMenu';
import { ComponentStrip } from './ComponentStrip';
import type { Direction } from './directions';
import { GanttZoomSlider } from './Gantt';
import { Icon } from './Icon';
import { NavTreeSpecimen, type NavMode } from './NavTreeSpecimen';
import { NoteDetail } from './NoteDetail';
import { RecordCards, RecordThumbs } from './RecordPage';
import { taskSpec } from './recordSpecs';
import { ShotDetail, type ShotTab } from './ShotDetail';
import { DashboardPage } from './Dashboard';
import { IssueDetail } from './IssueDetail';
import { ShotGridSpecimen } from './ShotGridSpecimen';
import { ShotCardsView, ShotThumbsView } from './ShotViews';
import { getTasksPage, TASKS_PAGE_ID, TasksGantt, TasksTable } from './TasksPage';
import { tasks as allTasks } from '@sgp/mock-data';
import { AddButton, CardColumnsPicker, clampColumns, SearchField, ThumbSizeSlider, ViewSwitcher } from './PageControls';
import { getShotsPage, viewsFor } from './shotsPage';

const SHOTS_PAGE_ID = 'pg-lmp-shots';
const DASHBOARD_PAGE_ID = 'pg-lmp-producer-dashboard';
const NAV_MODE_KEY = 'sgp.navMode';

const PROJECT_ID = 'prj01';

export type SpecimenPage = 'shots' | 'tasks' | 'dashboard';

export type SpecimenDetail =
  | { kind: 'shot'; id: string; tab?: ShotTab }
  | { kind: 'note'; id: string }
  | { kind: 'issue'; id: string };

function TopBar() {
  return (
    <header className="flex h-10 shrink-0 items-center gap-4 bg-chrome px-3 text-chrome-fg">
      <span className="flex items-center gap-2 font-semibold tracking-tight">
        <Icon name="clapperboard" size={16} /> SGPipeline
      </span>
      <span className="text-sm text-chrome-muted">{company.name}</span>
      <label className="mx-auto flex h-7 w-96 items-center gap-2 rounded-md border border-chrome-muted/30 bg-chrome-fg/10 px-2 text-sm text-chrome-muted">
        <Icon name="search" className="shrink-0" />
        <input
          aria-label="Global search"
          placeholder="Global search"
          className="min-w-0 flex-1 bg-transparent text-chrome-fg outline-none placeholder:text-chrome-muted"
        />
        <kbd className="font-mono text-xs">⌘K</kbd>
      </label>
      <span className="flex items-center gap-3 text-chrome-muted">
        <Icon name="sparkles" size={16} />
        <Icon name="inbox" size={16} />
        <Icon name="bell" size={16} />
        <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-fg-inverse">
          NS
        </span>
      </span>
    </header>
  );
}

function PageHeader({
  title,
  summary,
  searchLabel,
  addLabel,
  views,
  view,
  onView,
  controls,
}: {
  title: string;
  summary: string;
  searchLabel: string;
  addLabel: string;
  views: TableView[];
  view: TableView;
  onView: (view: TableView) => void;
  controls?: ReactNode;
}) {
  const height = { height: 'var(--sgp-row-compact)' };
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1 text-xs text-fg-subtle">
        <span>The Last Lamplighter</span>
        <Icon name="chevron-right" size={12} />
        <span>Production</span>
        <Icon name="chevron-right" size={12} />
        <span className="text-fg-muted">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <h1 className="mr-2 text-xl font-semibold">{title}</h1>
        <span className="text-sm text-fg-subtle">{summary}</span>
        <span className="ml-auto flex items-center">{controls}</span>
        <SearchField label={searchLabel} />
        <span
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-fg-muted"
          style={height}
        >
          <Icon name="sliders-horizontal" /> Group
        </span>
        <ViewSwitcher views={views} view={view} onView={onView} />
        <AddButton label={addLabel} />
      </div>
    </div>
  );
}

/** States plainly what a gantt is showing: always tasks, with the grouping in use. */
function GanttScope({ text }: { text: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-line bg-surface-sunken px-4 py-1.5 text-xs text-fg-muted">
      <Icon name="chart-gantt" size={13} className="text-fg-subtle" />
      {text}
      <span className="ml-auto text-fg-subtle">Right-click the timeline to show fields beside the bars.</span>
    </div>
  );
}

export interface SpecimenProps {
  direction: Direction;
  theme: 'dark' | 'light';
  initialPage?: SpecimenPage;
  initialView?: TableView;
  initialStatusDisplay?: StatusDisplay;
  initialNavMode?: NavMode;
  initialNavOpen?: boolean;
  initialDetail?: SpecimenDetail;
  showComponents?: boolean;
  height?: number;
}

export function Specimen({
  direction,
  theme,
  initialPage = 'shots',
  initialView,
  initialStatusDisplay,
  initialNavMode,
  initialNavOpen = false,
  initialDetail,
  showComponents = true,
  height = 600,
}: SpecimenProps) {
  const shotsPage = getShotsPage();
  const tasksPage = getTasksPage();
  const [page, setPage] = useState<SpecimenPage>(initialPage);
  const [detail, setDetail] = useState<SpecimenDetail | null>(initialDetail ?? null);
  const openShot = (id: string) => setDetail({ kind: 'shot', id });
  const [shotsView, setShotsView] = useState<TableView>(initialPage === 'shots' ? initialView ?? 'table' : 'table');
  const [tasksView, setTasksView] = useState<TableView>(
    initialPage === 'tasks' ? initialView ?? tasksPage.page.view : tasksPage.page.view,
  );
  const [statusDisplay, setStatusDisplay] = useState<StatusDisplay>(
    initialStatusDisplay ?? shotsPage.settings.status?.statusDisplay ?? 'long',
  );
  const [navMode, setNavModeState] = useState<NavMode>(
    () => initialNavMode ?? ((typeof localStorage !== 'undefined' && (localStorage.getItem(NAV_MODE_KEY) as NavMode)) || 'docked'),
  );
  const setNavMode = (mode: NavMode) => {
    setNavModeState(mode);
    if (typeof localStorage !== 'undefined') localStorage.setItem(NAV_MODE_KEY, mode);
  };
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [thumbSize, setThumbSize] = useState(shotsPage.page.thumbSettings?.size ?? 192);
  const [cardColumns, setCardColumns] = useState(shotsPage.page.cardSettings?.columns ?? 4);
  const [shotsZoom, setShotsZoom] = useState(shotsPage.page.ganttSettings?.zoom ?? 55);
  const [tasksZoom, setTasksZoom] = useState(tasksPage.page.ganttSettings?.zoom ?? 30);
  const [menu, setMenu] = useState<{ x: number; y: number; field: string; label: string } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const activePageId =
    detail?.kind === 'issue'
      ? 'pg-issues'
      : page === 'shots'
        ? SHOTS_PAGE_ID
        : page === 'tasks'
          ? TASKS_PAGE_ID
          : DASHBOARD_PAGE_ID;
  const openPage = (pageId: string) => {
    if (pageId === SHOTS_PAGE_ID) setPage('shots');
    else if (pageId === TASKS_PAGE_ID) setPage('tasks');
    else if (pageId === DASHBOARD_PAGE_ID) setPage('dashboard');
    else return;
    setDetail(null);
  };

  const shotsContent = () => {
    if (detail?.kind === 'issue') {
      return <IssueDetail key={detail.id} issueId={detail.id} direction={direction} />;
    }
    if (detail?.kind === 'note') {
      return (
        <NoteDetail
          key={detail.id}
          noteId={detail.id}
          direction={direction}
          statusDisplay={statusDisplay}
          onBackToShot={(id) => setDetail({ kind: 'shot', id, tab: 'notes' })}
          onBackToShots={() => setDetail(null)}
        />
      );
    }
    if (detail?.kind === 'shot') {
      return (
        <ShotDetail
          key={`${detail.id}-${detail.tab ?? ''}`}
          shotId={detail.id}
          direction={direction}
          statusDisplay={statusDisplay}
          initialTab={detail.tab}
          onBack={() => setDetail(null)}
          onNavigate={openShot}
          onOpenNote={(id) => setDetail({ kind: 'note', id })}
        />
      );
    }
    const controls =
      shotsView === 'thumb' ? (
        <ThumbSizeSlider size={thumbSize} onSize={setThumbSize} />
      ) : shotsView === 'card' ? (
        <CardColumnsPicker
          columns={cardColumns}
          onStep={(delta) =>
            setCardColumns((current) => clampColumns(current + delta))
          }
        />
      ) : shotsView === 'gantt' ? (
        <GanttZoomSlider zoom={shotsZoom} onZoom={setShotsZoom} />
      ) : null;
    return (
      <>
        <PageHeader
          title="Shots"
          summary="11 shots in 3 sequences"
          searchLabel="Search shots"
          addLabel="Shot"
          views={viewsFor('Shot', PROJECT_ID)}
          view={shotsView}
          onView={setShotsView}
          controls={controls}
        />
        {shotsView === 'table' && (
          <ShotGridSpecimen
            direction={direction}
            statusDisplay={statusDisplay}
            shotsPage={shotsPage}
            onOpenShot={openShot}
            onColumnContextMenu={(event, field) =>
              setMenu({ x: event.clientX, y: event.clientY, field: field.code, label: field.label })
            }
          />
        )}
        {shotsView === 'card' && (
          <ShotCardsView
            direction={direction}
            statusDisplay={statusDisplay}
            columns={cardColumns}
            onOpenShot={openShot}
            shotsPage={shotsPage}
          />
        )}
        {shotsView === 'thumb' && (
          <ShotThumbsView
            direction={direction}
            statusDisplay={statusDisplay}
            size={thumbSize}
            onOpenShot={openShot}
            shotsPage={shotsPage}
          />
        )}
        {shotsView === 'gantt' && (
          <>
            <GanttScope text="This gantt shows the Tasks of these shots, grouped by Shot, then Step. Bars run from each task's Start to Due." />
            <TasksGantt
              direction={direction}
              statusDisplay={statusDisplay}
              zoom={shotsZoom}
              taskList={allTasks.filter((t) => t.entityType === 'Shot' && shotsPage.allShots.some((s) => s.id === t.entityId))}
              grouping="shot"
            />
          </>
        )}
      </>
    );
  };

  const tasksContent = () => {
    const topLevel = tasksPage.projectTasks.filter((t) => !t.parentTaskId).length;
    const subTasks = tasksPage.projectTasks.length - topLevel;
    return (
      <>
        <PageHeader
          title="Tasks"
          summary={`${topLevel} tasks and ${subTasks} sub-tasks by department and step`}
          searchLabel="Search tasks"
          addLabel="Task"
          views={viewsFor('Task', PROJECT_ID)}
          view={tasksView}
          onView={setTasksView}
          controls={
            tasksView === 'gantt' ? (
              <GanttZoomSlider zoom={tasksZoom} onZoom={setTasksZoom} />
            ) : tasksView === 'card' ? (
              <CardColumnsPicker columns={cardColumns} onStep={(delta) => setCardColumns((c) => clampColumns(c + delta))} />
            ) : tasksView === 'thumb' ? (
              <ThumbSizeSlider size={thumbSize} onSize={setThumbSize} />
            ) : null
          }
        />
        {tasksView === 'table' && <TasksTable direction={direction} statusDisplay={statusDisplay} />}
        {tasksView === 'gantt' && (
          <>
            <GanttScope text="Tasks grouped by Department, then Step. Bars run from each task's Start to Due." />
            <TasksGantt direction={direction} statusDisplay={statusDisplay} zoom={tasksZoom} />
          </>
        )}
        {tasksView === 'card' && (
          <RecordCards spec={taskSpec(tasksPage.projectTasks, { direction, statusDisplay }, { showLink: true })} columns={cardColumns} />
        )}
        {tasksView === 'thumb' && (
          <RecordThumbs spec={taskSpec(tasksPage.projectTasks, { direction, statusDisplay }, { showLink: true })} size={thumbSize} />
        )}
      </>
    );
  };

  return (
    <div
      className={`sgp-dir-${direction.id} sgp-theme-${theme} overflow-hidden rounded-lg border border-line bg-canvas font-sans text-md text-fg`}
      style={{ colorScheme: theme }}
    >
      <TopBar />
      <div className="relative flex" style={{ height }}>
        <NavTreeSpecimen
          activePageId={activePageId}
          onOpenPage={openPage}
          mode={navMode}
          overlayOpen={navOpen}
          onToggleDock={() => {
            setNavMode(navMode === 'docked' ? 'undocked' : 'docked');
            setNavOpen(false);
          }}
          onToggleOverlay={() => setNavOpen(!navOpen)}
        />
        <main className="flex min-w-0 flex-1 flex-col" onMouseDown={() => navMode === 'undocked' && setNavOpen(false)}>
          {detail?.kind === 'issue' || page === 'shots'
            ? shotsContent()
            : page === 'tasks'
              ? tasksContent()
              : <DashboardPage />}
        </main>
      </div>
      {showComponents && <ComponentStrip direction={direction} />}
      {menu && (
        <div className={`sgp-dir-${direction.id} sgp-theme-${theme} font-sans text-md`}>
          <ColumnMenu
            x={menu.x}
            y={menu.y}
            columnLabel={menu.label}
            statusDisplay={menu.field === 'status' ? statusDisplay : undefined}
            onStatusDisplay={menu.field === 'status' ? setStatusDisplay : undefined}
            onClose={closeMenu}
          />
        </div>
      )}
    </div>
  );
}

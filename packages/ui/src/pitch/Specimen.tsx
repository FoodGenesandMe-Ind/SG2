import {
  company,
  folders,
  people,
  permissionsFor,
  type EffectiveField,
  projectConditionalFormats,
  resolveTableConfig,
  sameScope,
  type ConditionalFormat,
  type Shot,
  type StatusDisplay,
  type TablePage,
  type TableView,
  type ViewDisplay,
} from '@sgp/mock-data';
import { useCallback, useState, type MouseEvent, type ReactNode } from 'react';
import { ColumnMenu } from './ColumnMenu';
import { ManageFieldsDialog, type DraftField } from './ManageFieldsDialog';
import { resolveReplacement } from './StatusConfig';
import { ConditionalFormatDialog } from './ConditionalFormatDialog';
import { ComponentStrip } from './ComponentStrip';
import type { Direction } from './directions';
import { GanttZoomSlider, type GanttLayout } from './Gantt';
import { Icon } from './Icon';
import { NavTreeSpecimen, type NavMode } from './NavTreeSpecimen';
import { NoteDetail } from './NoteDetail';
import { PageMenu } from './PageMenu';
import { completeLayout, layoutChanges, layoutFromPage, pageWithLayout, type PageLayout } from './pageLayout';
import { RecordCards, RecordThumbs } from './RecordPage';
import { taskSpec } from './recordSpecs';
import { ShotDetail, type ShotTab } from './ShotDetail';
import { DashboardPage } from './Dashboard';
import { IssueDetail } from './IssueDetail';
import { ShotGridSpecimen } from './ShotGridSpecimen';
import { kanbanFields, ShotCardsView, ShotKanbanView, ShotThumbsView } from './ShotViews';
import { DEFAULT_GANTT_COLUMNS, getTasksPage, TASKS_PAGE_ID, TasksGantt, TasksTable } from './TasksPage';
import { canWrap, toggleWrap, type WrapPlace } from './wrap';
import { isShotView, VIEW_NAME, withViewDisplay, type ShotView } from './viewDisplay';
import { nextSort } from './columns';
import { tasks as allTasks } from '@sgp/mock-data';
import { AddButton, CardColumnsPicker, clampColumns, clampKanbanColumns, KANBAN_COLUMNS, SearchField, ThumbSizeSlider, ViewSwitcher } from './PageControls';
import {
  copyShots,
  DeleteRecordsDialog,
  exportShotsCsv,
  PasteRecordsDialog,
  planPaste,
  RecordActionMenu,
  shotClip,
  useCopiedShots,
} from './recordActions';
import { ganttGroupingProps, isGroupable, groupingLabel, taskGroupFields } from './grouping';
import { GroupDialog } from './GroupDialog';
import { getShotsPage, viewsFor, withGrouping, withShotEdits, withShotPatches, withSort } from './shotsPage';

const SHOTS_PAGE_ID = 'pg-lmp-shots';
const DASHBOARD_PAGE_ID = 'pg-lmp-producer-dashboard';
const NAV_MODE_KEY = 'sgp.navMode';

const PROJECT_ID = 'prj01';

export type SpecimenPage = 'shots' | 'tasks' | 'dashboard';

export type SpecimenDetail =
  | { kind: 'shot'; id: string; tab?: ShotTab }
  | { kind: 'note'; id: string }
  | { kind: 'issue'; id: string };

function TopBar({ viewerId }: { viewerId: string }) {
  const viewer = people.find((p) => p.id === viewerId);
  const initials = (viewer?.name ?? '?').split(' ').map((w) => w[0]).join('').slice(0, 2);
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
        <span
          className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-fg-inverse"
          title={viewer?.name}
        >
          {initials}
        </span>
      </span>
    </header>
  );
}

function PageHeader({
  title,
  folder,
  pageMenu,
  summary,
  searchLabel,
  addLabel,
  views,
  view,
  onView,
  controls,
  groupingLabel,
  onGroup,
  onManageFields,
}: {
  title: string;
  folder: string;
  pageMenu?: ReactNode;
  summary: string;
  searchLabel: string;
  addLabel: string;
  views: TableView[];
  view: TableView;
  onView: (view: TableView) => void;
  controls?: ReactNode;
  /** Fields the page is grouped by, in order. Absent when it is not grouped. */
  groupingLabel?: string;
  onGroup: () => void;
  /** Opens Manage fields at the section for the current view. */
  onManageFields: () => void;
}) {
  const height = { height: 'var(--sgp-row-compact)' };
  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-line bg-surface px-4 py-3">
      <div className="flex items-center gap-1 text-xs text-fg-subtle">
        <span>The Last Lamplighter</span>
        <Icon name="chevron-right" size={12} />
        <span>{folder}</span>
        <Icon name="chevron-right" size={12} />
        <span className="text-fg-muted">{title}</span>
        <span className="ml-auto">{pageMenu}</span>
      </div>
      <div className="flex items-center gap-2">
        <h1 className="mr-2 text-xl font-semibold">{title}</h1>
        <span className="text-sm text-fg-subtle">{summary}</span>
        <span className="ml-auto flex items-center">{controls}</span>
        <SearchField label={searchLabel} />
        <button
          className="flex size-7 items-center justify-center rounded-md border border-line-strong text-fg-muted enabled:hover:bg-row-hover enabled:hover:text-fg disabled:cursor-default disabled:opacity-40"
          style={height}
          aria-label="Manage fields"
          title="Manage fields"
          onClick={onManageFields}
        >
          <Icon name="settings" size={14} />
        </button>
        <button
          className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 text-sm text-fg-muted hover:bg-row-hover hover:text-fg"
          style={height}
          aria-haspopup="dialog"
          onClick={onGroup}
        >
          <Icon name="sliders-horizontal" /> Group
          {groupingLabel && <span className="font-medium text-fg">{groupingLabel}</span>}
        </button>
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
  /** Whose permissions decide the Page menu options. */
  viewerId?: string;
  /** Conditional formats the Shots page starts with (as saved). */
  initialFormats?: ConditionalFormat[];
  /** Opens the conditional formatting dialog from this column on load. */
  initialFormatColumn?: string;
  /** Project-wide formats for Shots in this project. */
  initialProjectFormats?: ConditionalFormat[];
  /** Opens Manage fields on load. */
  initialFieldsOpen?: boolean;
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
  viewerId = 'p01',
  initialFormats,
  initialFormatColumn,
  initialProjectFormats,
  initialFieldsOpen = false,
}: SpecimenProps) {
  const baseShotsPage = getShotsPage();
  const [shotPatches, setShotPatches] = useState<Record<string, Partial<Shot>>>({});
  const [addedShots, setAddedShots] = useState<Shot[]>([]);
  const [removedShotIds, setRemovedShotIds] = useState<string[]>([]);
  const shotsEdited = withShotEdits(baseShotsPage, addedShots, removedShotIds);
  const [groupOpen, setGroupOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(initialFieldsOpen);
  const [customFields, setCustomFields] = useState<EffectiveField[]>([]);
  const [removedFieldCodes, setRemovedFieldCodes] = useState<string[]>([]);
  const [fieldPatches, setFieldPatches] = useState<Record<string, Partial<EffectiveField>>>({});
  const [fieldsStart, setFieldsStart] = useState<string | undefined>(undefined);
  // The same dialog, two ways in: Manage fields (configuration) and View > Configure (display options).
  const [fieldsMode, setFieldsMode] = useState<'fields' | 'view'>('fields');
  const [fieldsSection, setFieldsSection] = useState<'fields' | 'formats' | 'group'>('fields');
  const openFields = (mode: 'fields' | 'view', field?: string, section: 'fields' | 'formats' | 'group' = 'fields') => {
    setFieldsMode(mode);
    setFieldsStart(field);
    setFieldsSection(section);
    setFieldsOpen(true);
  };
  const [locks, setLocks] = useState<Record<string, 'locked' | 'system'>>({ sh010_10: 'locked', sh030_30: 'system' });
  const copiedShots = useCopiedShots();
  const [shotMenu, setShotMenu] = useState<
    { kind: 'records'; x: number; y: number; shots: Shot[] } | { kind: 'paste'; x: number; y: number } | null
  >(null);
  const [recordConfirm, setRecordConfirm] = useState<{ kind: 'delete'; shots: Shot[] } | { kind: 'paste' } | null>(null);
  const recordActions = {
    onRecords: (event: MouseEvent, shots: Shot[]) => setShotMenu({ kind: 'records', x: event.clientX, y: event.clientY, shots }),
    onBlank: (event: MouseEvent) => {
      if (copiedShots) setShotMenu({ kind: 'paste', x: event.clientX, y: event.clientY });
    },
  };
  const tasksPage = getTasksPage();
  const [detail, setDetail] = useState<SpecimenDetail | null>(initialDetail ?? null);
  const openShot = (id: string) => setDetail({ kind: 'shot', id });
  const [navMode, setNavModeState] = useState<NavMode>(
    () => initialNavMode ?? ((typeof localStorage !== 'undefined' && (localStorage.getItem(NAV_MODE_KEY) as NavMode)) || 'docked'),
  );
  const setNavMode = (mode: NavMode) => {
    setNavModeState(mode);
    if (typeof localStorage !== 'undefined') localStorage.setItem(NAV_MODE_KEY, mode);
  };
  const [navOpen, setNavOpen] = useState(initialNavOpen);
  const [menu, setMenu] = useState<{ x: number; y: number; field: string; label: string } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);
  const [formatColumn, setFormatColumn] = useState<string | null>(initialFormatColumn ?? null);
  const [projectFormats, setProjectFormats] = useState<ConditionalFormat[]>(
    () =>
      initialProjectFormats ??
      projectConditionalFormats.find((p) => p.projectId === PROJECT_ID && p.table === 'Shot')?.formats ??
      [],
  );

  // Each table page has the layout it was saved with and the layout on screen; they differ when the page is dirty.
  const [extraPages, setExtraPages] = useState<TablePage[]>([]);
  const [saved, setSaved] = useState<Record<string, PageLayout>>(() => {
    const story = (forPage: SpecimenPage): Partial<PageLayout> => ({
      ...(initialPage === forPage && initialView ? { view: initialView } : {}),
      ...(initialStatusDisplay ? { statusDisplay: initialStatusDisplay } : {}),
    });
    return {
      [SHOTS_PAGE_ID]: layoutFromPage(baseShotsPage.page, { ...story('shots'), ...(initialFormats ? { formats: initialFormats } : {}) }),
      [TASKS_PAGE_ID]: layoutFromPage(tasksPage.page, story('tasks')),
    };
  });
  const [drafts, setDrafts] = useState<Record<string, PageLayout>>(saved);
  const [pageId, setPageId] = useState(
    initialPage === 'tasks' ? TASKS_PAGE_ID : initialPage === 'dashboard' ? DASHBOARD_PAGE_ID : SHOTS_PAGE_ID,
  );
  const shotsSort = drafts[SHOTS_PAGE_ID].sort ?? baseShotsPage.page.query.sort ?? [];
  // Field edits (status order, formulas) apply before sorting and grouping, so both follow them.
  const patchedFields = shotsEdited.fields.map((field) => ({ ...field, ...fieldPatches[field.code] }));
  const sortFields = [...patchedFields, ...customFields];
  const shotsBase = {
    ...withShotPatches(shotsEdited, shotPatches),
    fields: patchedFields,
    fieldByCode: (code: string) => patchedFields.find((field) => field.code === code),
  };
  const shotsPage = withGrouping(withSort(shotsBase, shotsSort, sortFields), drafts[SHOTS_PAGE_ID].grouping);
  const tablePage = (id: string) =>
    id === SHOTS_PAGE_ID ? shotsPage.page : id === TASKS_PAGE_ID ? tasksPage.page : extraPages.find((p) => p.id === id);
  const current = tablePage(pageId);
  const page: SpecimenPage = !current ? 'dashboard' : current.query.table === 'Task' ? 'tasks' : 'shots';
  const draft = completeLayout(drafts[pageId] ?? drafts[SHOTS_PAGE_ID], current);
  const update = (change: (layout: PageLayout) => Partial<PageLayout>) =>
    setDrafts((all) => ({ ...all, [pageId]: { ...all[pageId], ...change(all[pageId]) } }));
  const statusDisplay = (page === 'dashboard' ? drafts[SHOTS_PAGE_ID] : draft).statusDisplay;
  const setStatusDisplay = (value: StatusDisplay) => update(() => ({ statusDisplay: value }));
  const setView = (view: TableView) => update(() => ({ view }));
  const setThumbSize = (thumbSize: number) => update(() => ({ thumbSize }));
  const stepCardColumns = (delta: number) => update((l) => ({ cardColumns: clampColumns(l.cardColumns + delta) }));
  const setZoom = (zoom: number) => update(() => ({ zoom }));
  const onShotCommand = (command: 'copy' | 'export' | 'delete', shots: Shot[]) => {
    if (command === 'copy') copyShots(shotsPage, shots, statusDisplay);
    else if (command === 'export') exportShotsCsv(shotClip(shotsPage, shots, statusDisplay));
    else setRecordConfirm({ kind: 'delete', shots });
  };
  // A card, kanban card, or thumbnail shows a field in one place: showing it in one part takes it out of the other.
  const placeIn = (list: string[], other: string[], code: string) =>
    list.includes(code) ? { list: list.filter((item) => item !== code), other } : { list: [...list, code], other: other.filter((item) => item !== code) };
  const toggleCardBody = (code: string) =>
    update((layout) => {
      const { list, other } = placeIn(layout.cardBody ?? draft.cardBody, layout.cardHeader ?? draft.cardHeader, code);
      return { cardBody: list, cardHeader: other };
    });
  const toggleKanbanBody = (code: string) =>
    update((layout) => {
      const { list, other } = placeIn(layout.kanbanBody ?? draft.kanbanBody ?? [], layout.kanbanHeader ?? draft.kanbanHeader, code);
      return { kanbanBody: list, kanbanHeader: other };
    });
  /** Who may edit shots, and each shot's lock: shared by the table, cards, kanban, and thumbnails. */
  const recordEditProps = {
    lockOf: (id: string) => locks[id] ?? 'open',
    onEditShot: permissionsFor(viewerId).readOnly
      ? undefined
      : (id: string, patch: Partial<Shot>) => setShotPatches((all) => ({ ...all, [id]: { ...all[id], ...patch } })),
    onToggleLock: permissionsFor(viewerId).managesSchema
      ? (id: string) =>
          setLocks((all) => {
            const currentLock = all[id] ?? 'open';
            if (currentLock === 'system') return all;
            const next = { ...all };
            if (currentLock === 'locked') delete next[id];
            else next[id] = 'locked';
            return next;
          })
      : undefined,
  };
  const toggleCardHeader = (code: string) =>
    update((layout) => {
      const { list, other } = placeIn(layout.cardHeader ?? draft.cardHeader, layout.cardBody ?? draft.cardBody, code);
      return { cardHeader: list, cardBody: other };
    });
  const toggleKanbanHeader = (code: string) =>
    update((layout) => {
      const { list, other } = placeIn(layout.kanbanHeader ?? draft.kanbanHeader, layout.kanbanBody ?? draft.kanbanBody ?? [], code);
      return { kanbanHeader: list, kanbanBody: other };
    });
  const placeThumbField = (zone: 'inside' | 'below', code: string) =>
    update((layout) => {
      if (zone === 'inside') {
        const { list, other } = placeIn(layout.thumbInside, layout.thumbBelow, code);
        return { thumbInside: list, thumbBelow: other };
      }
      const { list, other } = placeIn(layout.thumbBelow, layout.thumbInside, code);
      return { thumbBelow: list, thumbInside: other };
    });
  const toggleWrapIn = (place: WrapPlace, code: string) => update((layout) => ({ wrap: toggleWrap(layout.wrap ?? draft.wrap, place, code) }));
  const columnProps = {
    columnOrder: draft.columns,
    columnWidths: draft.widths,
    onColumnOrder: (columns: string[]) => update(() => ({ columns })),
    onColumnWidth: (code: string, width: number) => update((l) => ({ widths: { ...l.widths, [code]: width } })),
  };

  const ganttProps = { layout: draft.gantt, onLayout: (gantt: GanttLayout) => update(() => ({ gantt })) };
  const canFormat =
    !!current && (current.shared ? permissionsFor(viewerId).createsSharedPages : current.ownerId === viewerId);
  const canManageSchema = permissionsFor(viewerId).managesSchema;
  const lockedField: EffectiveField = { code: 'locked', label: 'Locked', type: 'checkbox', system: true, hidden: false };
  const manageFields = [
    ...shotsPage.fields
      .filter((field) => !removedFieldCodes.includes(field.code))
      .map((field) => ({ ...field, ...fieldPatches[field.code] })),
    ...customFields,
    ...(canManageSchema ? [lockedField] : []),
  ];
  const wrapColumn = !!menu && page === 'shots' && draft.view === 'table' && canWrap(manageFields.find((field) => field.code === menu.field));
  const taskFields = (resolveTableConfig('Task', PROJECT_ID)?.fields ?? []).map((field) => ({
    ...field,
    hidden: false,
    ...fieldPatches[field.code],
  }));
  const fieldHasValue = (records: ReadonlyArray<object>, code: string) =>
    records.some((record) => {
      const value = (record as Record<string, unknown>)[code];
      if (value == null || value === '') return false;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    });
  const valueCount = (records: ReadonlyArray<object>, code: string, value: string) =>
    records.filter((record) => (record as Record<string, unknown>)[code] === value).length;
  /** Shots on a status that was hidden move to the replacement the user picked. */
  const moveHiddenStatuses = (field: DraftField) => {
    const replacements = field.statusReplacements;
    if (!replacements) return;
    const moves = shotsPage.allShots
      .map((shot) => {
        const from = String(shot[field.code as keyof Shot] ?? '');
        return replacements[from] ? { id: shot.id, to: resolveReplacement(from, replacements) } : null;
      })
      .filter((move): move is { id: string; to: string } => !!move);
    if (moves.length === 0) return;
    setShotPatches((all) => {
      const next = { ...all };
      for (const move of moves) next[move.id] = { ...next[move.id], [field.code]: move.to };
      return next;
    });
  };
  // Each view of the shots can keep its own sort, grouping, status display, and number and date formats.
  const shotView: ShotView | null = isShotView(draft.view) ? draft.view : null;
  const sortFor = (view: ShotView) => draft.viewDisplay?.[view]?.sort ?? shotsSort;
  const groupingFor = (view: ShotView) => draft.viewDisplay?.[view]?.grouping ?? draft.grouping;
  const statusFor = (view: ShotView) => draft.viewDisplay?.[view]?.statusDisplay ?? statusDisplay;
  const formatsIn = (view: TableView) => [...draft.formats, ...projectFormats].filter((rule) => !rule.views || rule.views.includes(view));
  const setViewDisplay = (view: ShotView, change: (current: ViewDisplay) => ViewDisplay) =>
    update((layout) => ({ viewDisplay: withViewDisplay(layout.viewDisplay ?? draft.viewDisplay, view, change) }));
  const viewPage = (view: ShotView) => {
    const own = draft.viewDisplay?.[view];
    const shaped = (field: EffectiveField): EffectiveField => ({
      ...field,
      ...(own?.numberDisplay?.[field.code] ? { display: own.numberDisplay[field.code] } : {}),
      ...(own?.dateFormat?.[field.code] ? { dateFormat: own.dateFormat[field.code] } : {}),
    });
    const ordered = own?.sort || own?.grouping ? withGrouping(withSort(shotsBase, sortFor(view), sortFields), groupingFor(view)) : shotsPage;
    const fields = manageFields.map(shaped);
    return { ...ordered, fields, fieldByCode: (code: string) => fields.find((field) => field.code === code) };
  };
  const currentGrouping = page === 'shots' && shotView ? groupingFor(shotView) : draft.grouping;
  /** The views the page offers in its switcher: those enabled in View > Configure, or every one the table has. */
  const enabledOf = (all: TableView[]) => (draft.enabledViews ? all.filter((item) => draft.enabledViews!.includes(item)) : all);
  const projectScope = { level: 'project' as const, projectId: PROJECT_ID };
  const projectFolders = folders.filter((f) => sameScope(f.scope, projectScope));
  const folderLabel = (p: TablePage) =>
    !p.shared ? 'Personal' : projectFolders.find((f) => f.id === p.folderId)?.name ?? 'The Last Lamplighter';
  const tableConfig = resolveTableConfig(current?.query.table ?? 'Shot', PROJECT_ID);
  const ganttIsTasks = draft.view === 'gantt' && current?.query.table !== 'Task' && !!tableConfig?.traits.hasTasks;
  const fieldLabel = (code: string) => {
    const taskLabels: Record<string, string> = {
      departmentId: 'Department',
      stepId: 'Pipeline step',
      assigneeId: 'Assigned to',
      entityId: current?.query.table === 'Asset' ? 'Asset' : current?.query.table === 'Shot' ? 'Shot' : 'Link',
      startDate: 'Start',
      dueDate: 'Due',
      name: 'Task',
    };
    return taskLabels[code] ?? tableConfig?.fields.find((field) => field.code === code)?.label ?? code;
  };
  const groupFields = () => {
    const config = resolveTableConfig(current?.query.table ?? 'Shot', PROJECT_ID);
    const reserved = new Set(['id', 'createdAt', 'createdById', 'updatedAt', 'updatedById']);
    const groupable = (config?.fields ?? []).filter((field) => !field.hidden && isGroupable(field.type) && !reserved.has(field.code));
    const inColumns = draft.columns.map((code) => groupable.find((field) => field.code === code)).filter((field): field is NonNullable<typeof field> => !!field);
    const rest = groupable.filter((field) => !draft.columns.includes(field.code)).sort((a, b) => a.label.localeCompare(b.label));
    const fields = [...inColumns, ...rest].map((field) => ({ code: field.code, label: field.label }));
    return current?.query.table === 'Task' ? [{ code: 'departmentId', label: 'Department' }, ...fields] : fields;
  };

  /** Any shot field except the thumbnail and the lock: page columns first, then the rest by name. */
  const shotSortFields = () => {
    const sortable = manageFields.filter((field) => field.type !== 'media' && field.code !== 'locked');
    const inColumns = draft.columns.map((code) => sortable.find((field) => field.code === code)).filter((field): field is NonNullable<typeof field> => !!field);
    const rest = sortable.filter((field) => !draft.columns.includes(field.code)).sort((a, b) => a.label.localeCompare(b.label));
    return [...inColumns, ...rest].map((field) => ({ code: field.code, label: field.label }));
  };

  const saveCopy = (name: string, where: Pick<TablePage, 'shared' | 'folderId'>) => {
    if (!current) return;
    const id = `pg-session-${extraPages.length + 1}`;
    setExtraPages((list) => [...list, pageWithLayout(current, draft, { id, name, ownerId: viewerId, ...where })]);
    setSaved((all) => ({ ...all, [id]: draft }));
    setDrafts((all) => ({ ...all, [id]: draft, [pageId]: saved[pageId] }));
    setPageId(id);
  };

  const pageMenu = current && (
    <PageMenu
      pageName={current.name}
      shared={current.shared}
      ownerId={current.ownerId}
      viewerId={viewerId}
      changes={layoutChanges(completeLayout(saved[pageId], current), draft, fieldLabel)}
      levelLabel="The Last Lamplighter"
      folders={[{ id: '', label: 'The Last Lamplighter (top level)' }, ...projectFolders.map((f) => ({ id: f.id, label: f.name }))]}
      defaultFolderId={current.folderId ?? ''}
      onRevert={() => setDrafts((all) => ({ ...all, [pageId]: saved[pageId] }))}
      onSave={() => setSaved((all) => ({ ...all, [pageId]: draft }))}
      onSaveAs={(name, folderId) => saveCopy(name, { shared: true, folderId: folderId || undefined })}
      onSaveToMyPages={(name) => saveCopy(name, { shared: false, folderId: undefined })}
      onConfigure={() => openFields('view')}
    />
  );

  const activePageId = detail?.kind === 'issue' ? 'pg-issues' : pageId;
  const openPage = (id: string) => {
    if (id !== DASHBOARD_PAGE_ID && !tablePage(id)) return;
    setPageId(id);
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
          schemaFields={manageFields}
        />
      );
    }
    const controls =
      draft.view === 'thumb' ? (
        <ThumbSizeSlider size={draft.thumbSize} onSize={setThumbSize} />
      ) : draft.view === 'card' ? (
        <CardColumnsPicker columns={draft.cardColumns} onStep={stepCardColumns} />
      ) : draft.view === 'kanban' ? (
        <>
          <select
            aria-label="Kanban field"
            className="rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none"
            style={{ height: 'var(--sgp-row-compact)' }}
            value={draft.kanbanField}
            onChange={(event) => update(() => ({ kanbanField: event.target.value }))}
          >
            {kanbanFields(shotsPage.fields).map((field) => (
              <option key={field.code} value={field.code}>
                {field.label}
              </option>
            ))}
          </select>
          <CardColumnsPicker
            columns={draft.kanbanColumns}
            min={KANBAN_COLUMNS.min}
            max={KANBAN_COLUMNS.max}
            countLabel="Kanban columns"
            onStep={(delta) => update((layout) => ({ kanbanColumns: clampKanbanColumns((layout.kanbanColumns ?? 4) + delta) }))}
          />
        </>
      ) : draft.view === 'gantt' ? (
        <GanttZoomSlider zoom={draft.zoom} onZoom={setZoom} />
      ) : null;
    return (
      <>
        <PageHeader
          title={current?.name ?? 'Shots'}
          folder={current ? folderLabel(current) : 'Production'}
          pageMenu={pageMenu}
          summary={
            currentGrouping.length
              ? `${shotsPage.allShots.length} shots grouped by ${groupingLabel(currentGrouping, fieldLabel)}`
              : `${shotsPage.allShots.length} shots, not grouped`
          }
          searchLabel="Search shots"
          addLabel="Shot"
          views={enabledOf(viewsFor('Shot', PROJECT_ID))}
          view={draft.view}
          onView={setView}
          controls={controls}
          groupingLabel={groupingLabel(ganttIsTasks ? draft.taskGrouping : currentGrouping, fieldLabel) || undefined}
          onGroup={() => setGroupOpen(true)}
          onManageFields={() => openFields('fields')}
        />
        {draft.view === 'table' && (
          <ShotGridSpecimen
            direction={direction}
            statusDisplay={statusFor('table')}
            shotsPage={viewPage('table')}
            sort={sortFor('table')}
            onSortColumn={(code) => setViewDisplay('table', (own) => ({ ...own, sort: nextSort(sortFor('table'), code) }))}
            wrapFields={draft.wrap.table}
            lockOf={(id) => locks[id] ?? 'open'}
            onToggleLock={recordEditProps.onToggleLock}
            {...columnProps}
            formats={formatsIn('table')}
            onOpenShot={openShot}
            onEditShot={
              permissionsFor(viewerId).readOnly ? undefined : (id, patch) => setShotPatches((all) => ({ ...all, [id]: { ...all[id], ...patch } }))
            }
            recordActions={recordActions}
            onColumnContextMenu={(event, field) =>
              setMenu({ x: event.clientX, y: event.clientY, field: field.code, label: field.label })
            }
          />
        )}
        {draft.view === 'card' && (
          <ShotCardsView
            direction={direction}
            statusDisplay={statusFor('card')}
            columns={draft.cardColumns}
            onOpenShot={openShot}
            shotsPage={viewPage('card')}
            showThumb={draft.cardThumb ?? true}
            recordActions={recordActions}
            formats={formatsIn('card')}
            bodyFields={draft.cardBody}
            onToggleBody={toggleCardBody}
            headerFields={draft.cardHeader}
            onToggleHeader={toggleCardHeader}
            wrap={draft.wrap}
            onToggleWrap={toggleWrapIn}
            {...recordEditProps}
            onCommand={onShotCommand}
          />
        )}
        {draft.view === 'thumb' && (
          <ShotThumbsView
            direction={direction}
            statusDisplay={statusFor('thumb')}
            size={draft.thumbSize}
            onOpenShot={openShot}
            shotsPage={viewPage('thumb')}
            recordActions={recordActions}
            formats={formatsIn('thumb')}
            insideFields={draft.thumbInside}
            belowFields={draft.thumbBelow}
            onPlace={placeThumbField}
            wrap={draft.wrap}
            onToggleWrap={toggleWrapIn}
            {...recordEditProps}
            onCommand={onShotCommand}
          />
        )}
        {draft.view === 'kanban' && (
          <ShotKanbanView
            direction={direction}
            statusDisplay={statusFor('kanban')}
            fieldCode={draft.kanbanField}
            visibleColumns={draft.kanbanColumns}
            onOpenShot={openShot}
            shotsPage={viewPage('kanban')}
            showThumb={draft.kanbanThumb ?? true}
            recordActions={recordActions}
            formats={formatsIn('kanban')}
            bodyFields={draft.kanbanBody}
            onToggleBody={toggleKanbanBody}
            headerFields={draft.kanbanHeader}
            onToggleHeader={toggleKanbanHeader}
            cardOrder={draft.kanbanOrder}
            onCardOrder={(kanbanOrder) => update(() => ({ kanbanOrder }))}
            wrap={draft.wrap}
            onToggleWrap={toggleWrapIn}
            {...recordEditProps}
            onCommand={onShotCommand}
          />
        )}
        {draft.view === 'gantt' && (
          <>
            <GanttScope
              text={
                draft.taskGrouping.length
                  ? `This gantt shows the Tasks of these shots, grouped by ${groupingLabel(draft.taskGrouping, fieldLabel)}. Bars run from each task's Start to Due.`
                  : "This gantt shows the Tasks of these shots, not grouped. Bars run from each task's Start to Due."
              }
            />
            <TasksGantt
              direction={direction}
              statusDisplay={statusDisplay}
              zoom={draft.zoom}
              taskList={allTasks.filter((t) => t.entityType === 'Shot' && shotsPage.allShots.some((s) => s.id === t.entityId))}
              formats={formatsIn('gantt')}
              {...ganttGroupingProps(draft.taskGrouping, true)}
              {...ganttProps}
              onColumnContextMenu={(event, column) => setMenu({ x: event.clientX, y: event.clientY, field: column.code, label: column.label })}
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
          title={current?.name ?? 'Tasks'}
          folder={current ? folderLabel(current) : 'Production'}
          pageMenu={pageMenu}
          summary={
            draft.grouping.length
              ? `${topLevel} tasks and ${subTasks} sub-tasks, grouped by ${groupingLabel(draft.grouping, fieldLabel)}`
              : `${topLevel} tasks and ${subTasks} sub-tasks, not grouped`
          }
          searchLabel="Search tasks"
          addLabel="Task"
          views={enabledOf(viewsFor('Task', PROJECT_ID))}
          view={draft.view}
          onView={setView}
          groupingLabel={groupingLabel(draft.grouping, fieldLabel) || undefined}
          onGroup={() => setGroupOpen(true)}
          onManageFields={() => openFields('fields')}
          controls={
            draft.view === 'gantt' ? (
              <GanttZoomSlider zoom={draft.zoom} onZoom={setZoom} />
            ) : draft.view === 'card' ? (
              <CardColumnsPicker columns={draft.cardColumns} onStep={stepCardColumns} />
            ) : draft.view === 'thumb' ? (
              <ThumbSizeSlider size={draft.thumbSize} onSize={setThumbSize} />
            ) : null
          }
        />
        {draft.view === 'table' && (
          <TasksTable
            direction={direction}
            statusDisplay={statusDisplay}
            levels={draft.grouping}
            sort={draft.sort}
            onSortColumn={(code) => update((layout) => ({ sort: nextSort(layout.sort ?? draft.sort, code) }))}
            onColumnContextMenu={(event, column) => setMenu({ x: event.clientX, y: event.clientY, field: column.code, label: column.label })}
            {...columnProps}
          />
        )}
        {draft.view === 'gantt' && (
          <>
            <GanttScope
              text={
                draft.grouping.length
                  ? `Tasks grouped by ${groupingLabel(draft.grouping, fieldLabel)}. Bars run from each task's Start to Due.`
                  : "Tasks, not grouped. Bars run from each task's Start to Due."
              }
            />
            <TasksGantt
              direction={direction}
              statusDisplay={statusDisplay}
              zoom={draft.zoom}
              levels={draft.grouping}
              {...ganttProps}
              onColumnContextMenu={(event, column) => setMenu({ x: event.clientX, y: event.clientY, field: column.code, label: column.label })}
            />
          </>
        )}
        {draft.view === 'card' && (
          <RecordCards spec={taskSpec(tasksPage.projectTasks, { direction, statusDisplay }, { showLink: true })} columns={draft.cardColumns} grouping={draft.grouping} />
        )}
        {draft.view === 'thumb' && (
          <RecordThumbs spec={taskSpec(tasksPage.projectTasks, { direction, statusDisplay }, { showLink: true })} size={draft.thumbSize} grouping={draft.grouping} />
        )}
      </>
    );
  };

  return (
    <div
      className={`sgp-dir-${direction.id} sgp-theme-${theme} overflow-hidden rounded-lg border border-line bg-canvas font-sans text-md text-fg`}
      style={{ colorScheme: theme }}
    >
      <TopBar viewerId={viewerId} />
      <div className="relative flex" style={{ height }}>
        <NavTreeSpecimen
          activePageId={activePageId}
          onOpenPage={openPage}
          viewerId={viewerId}
          extraPages={extraPages}
          mode={navMode}
          overlayOpen={navOpen}
          onToggleDock={() => {
            setNavMode(navMode === 'docked' ? 'undocked' : 'docked');
            setNavOpen(false);
          }}
          onToggleOverlay={() => setNavOpen(!navOpen)}
        />
        <main
          className="flex min-w-0 flex-1 flex-col"
          onMouseDown={() => navMode === 'undocked' && setNavOpen(false)}
          onContextMenu={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest('[data-record-surface], [role=columnheader], [role=separator], [role=menu], [role=dialog], nav, button, a, input, textarea, select')) return;
            if (!copiedShots) return;
            event.preventDefault();
            setShotMenu({ kind: 'paste', x: event.clientX, y: event.clientY });
          }}
        >
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
            statusDisplay={menu.field === 'status' ? (page === 'shots' && shotView ? statusFor(shotView) : statusDisplay) : undefined}
            onStatusDisplay={
              menu.field === 'status'
                ? (value) => (page === 'shots' && shotView ? setViewDisplay(shotView, (own) => ({ ...own, statusDisplay: value })) : setStatusDisplay(value))
                : undefined
            }
            onSort={
              draft.view === 'gantt'
                ? (direction) => update((layout) => ({ gantt: { ...layout.gantt, sort: [{ field: menu.field, direction }] } }))
                : page === 'shots' && shotView
                  ? (direction) => setViewDisplay(shotView, (own) => ({ ...own, sort: [{ field: menu.field, direction }] }))
                  : page === 'tasks' && draft.view === 'table'
                    ? (direction) => update(() => ({ sort: [{ field: menu.field, direction }] }))
                    : undefined
            }
            onGroupBy={
              page === 'shots' && shotView && shotView !== 'kanban'
                ? () => setViewDisplay(shotView, (own) => ({ ...own, grouping: [{ field: menu.field, direction: 'asc' }] }))
                : undefined
            }
            onConditionalFormat={canFormat ? () => openFields('view', menu.field, 'formats') : undefined}
            conditionalFormatBlocked={
              canFormat ? undefined : 'Your permissions don\'t allow formats on this shared page. Save into My Pages to format your own copy.'
            }
            onManageFields={() => openFields('fields', menu.field)}
            wrap={wrapColumn ? (draft.wrap.table ?? []).includes(menu.field) : undefined}
            onWrap={wrapColumn ? () => toggleWrapIn('table', menu.field) : undefined}
            onConfigureField={() => openFields('fields', menu.field)}
            onClose={closeMenu}
          />
        </div>
      )}
      {shotMenu && (
        <RecordActionMenu
          x={shotMenu.x}
          y={shotMenu.y}
          mode={shotMenu.kind === 'paste' ? 'paste' : 'records'}
          count={shotMenu.kind === 'paste' ? (copiedShots?.records.length ?? 0) : shotMenu.shots.length}
          onClose={() => setShotMenu(null)}
          onCopy={
            shotMenu.kind === 'records'
              ? () => {
                  copyShots(shotsPage, shotMenu.shots, statusDisplay);
                  setShotMenu(null);
                }
              : undefined
          }
          onExport={
            shotMenu.kind === 'records'
              ? () => {
                  exportShotsCsv(shotClip(shotsPage, shotMenu.shots, statusDisplay));
                  setShotMenu(null);
                }
              : undefined
          }
          onDelete={
            shotMenu.kind === 'records'
              ? () => {
                  setRecordConfirm({ kind: 'delete', shots: shotMenu.shots });
                  setShotMenu(null);
                }
              : undefined
          }
          onPaste={
            shotMenu.kind === 'paste'
              ? () => {
                  setRecordConfirm({ kind: 'paste' });
                  setShotMenu(null);
                }
              : undefined
          }
        />
      )}
      {recordConfirm?.kind === 'delete' && (
        <DeleteRecordsDialog
          count={recordConfirm.shots.length}
          noun="shot"
          onClose={() => setRecordConfirm(null)}
          onConfirm={() => {
            const ids = recordConfirm.shots.map((s) => s.id);
            setRemovedShotIds((list) => [...list, ...ids]);
            setRecordConfirm(null);
          }}
        />
      )}
      {recordConfirm?.kind === 'paste' && copiedShots && (
        <PasteRecordsDialog
          preview={planPaste(copiedShots.records, shotsPage.allShots, shotsPage, viewerId).preview}
          noun="shot"
          uniqueLabels={shotsPage.fields.filter((f) => f.unique).map((f) => f.label)}
          onClose={() => setRecordConfirm(null)}
          onConfirm={() => {
            setAddedShots((list) => [...list, ...planPaste(copiedShots.records, shotsPage.allShots, shotsPage, viewerId).shots]);
            setRecordConfirm(null);
          }}
        />
      )}
      {fieldsOpen && current && page !== 'dashboard' && (
        <ManageFieldsDialog
          tableLabel={current.name}
          fields={page === 'shots' ? manageFields : taskFields}
          shown={draft.columns}
          canManage={canManageSchema}
          hasData={(code) => fieldHasValue(page === 'shots' ? shotsPage.allShots : tasksPage.projectTasks, code)}
          usage={(code, value) => valueCount(page === 'shots' ? shotsPage.allShots : tasksPage.projectTasks, code, value)}
          noun={page === 'shots' ? 'shot' : 'task'}
          view={draft.view}
          sections={page === 'shots' ? viewsFor('Shot', PROJECT_ID) : viewsFor('Task', PROJECT_ID).filter((item) => item === 'table' || item === 'gantt')}
          viewFields={{
            cardHeader: draft.cardHeader,
            cardBody: draft.cardBody,
            thumbInside: draft.thumbInside,
            thumbBelow: draft.thumbBelow,
            kanbanHeader: draft.kanbanHeader,
            kanbanBody: draft.kanbanBody,
            wrap: draft.wrap,
            enabledViews: draft.enabledViews ?? (page === 'shots' ? viewsFor('Shot', PROJECT_ID) : viewsFor('Task', PROJECT_ID)),
            projectFormats,
            ganttSort: draft.gantt.sort ?? [],
            cardThumb: draft.cardThumb ?? true,
            kanbanThumb: draft.kanbanThumb ?? true,
            ganttShown: (() => {
              // In the order the gantt shows them, including any column moved on the gantt itself.
              const shown = draft.gantt.shown ?? DEFAULT_GANTT_COLUMNS;
              const order = draft.gantt.order ?? [];
              return [...shown].sort((a, b) => (order.includes(a) ? order.indexOf(a) : 999 + shown.indexOf(a)) - (order.includes(b) ? order.indexOf(b) : 999 + shown.indexOf(b)));
            })(),
            viewDisplay: draft.viewDisplay,
            formats: draft.formats,
            taskGrouping: draft.taskGrouping,
          }}
          displayDefaults={page === 'shots' ? { sort: shotsSort, grouping: draft.grouping, statusDisplay } : undefined}
          initialField={fieldsStart}
          mode={fieldsMode}
          initialSection={fieldsSection}
          ganttUnavailable={tableConfig?.traits.hasTasks || page === 'tasks' ? undefined : 'This table has no tasks, so it has no gantt.'}
          groupFields={groupFields()}
          sortFields={page === 'shots' ? shotSortFields() : []}
          ganttGroupFields={taskGroupFields('Shot')}
          ganttSortFields={taskFields.map((field) => ({ code: field.code, label: field.label }))}
          canEditProject={permissionsFor(viewerId).managesSchema}
          projectLabel="every Shots page in The Last Lamplighter"
          records={(page === 'shots' ? shotsPage.allShots : tasksPage.projectTasks) as unknown as Array<Record<string, unknown>>}
          taskFields={taskFields}
          onFormula={(code, formula) => {
            if (code.startsWith('cf-')) {
              setCustomFields((list) => list.map((item) => (item.code === code ? { ...item, formula } : item)));
              return;
            }
            setFieldPatches((prev) => ({ ...prev, [code]: { ...prev[code], formula } }));
          }}
          onSave={(shown, fields, views) => {
            const dropped =
              page === 'shots'
                ? [
                    ...shotsPage.fields.filter((field) => !field.system && !fields.some((item) => item.code === field.code)).map((field) => field.code),
                    ...customFields.filter((field) => !fields.some((item) => item.code === field.code)).map((field) => field.code),
                  ]
                : [];
            const keep = (list: string[] | undefined) => (list ?? []).filter((code) => !dropped.includes(code));
            update((layout) => ({
              columns: shown,
              cardHeader: keep(views?.cardHeader ?? layout.cardHeader),
              cardBody: keep(views?.cardBody ?? layout.cardBody),
              thumbInside: keep(views?.thumbInside ?? layout.thumbInside),
              thumbBelow: keep(views?.thumbBelow ?? layout.thumbBelow),
              kanbanHeader: keep(views?.kanbanHeader ?? layout.kanbanHeader),
              kanbanBody: keep(views?.kanbanBody ?? layout.kanbanBody),
              wrap: views?.wrap ?? layout.wrap,
              gantt: views
                ? { ...layout.gantt, shown: views.ganttShown, order: ['name', ...views.ganttShown.filter((code) => code !== 'name')], sort: views.ganttSort }
                : layout.gantt,
              enabledViews: views ? views.enabledViews : layout.enabledViews,
              cardThumb: views ? views.cardThumb : layout.cardThumb,
              kanbanThumb: views ? views.kanbanThumb : layout.kanbanThumb,
              // A view turned off moves the page to the first view still on.
              view: views && !views.enabledViews.includes(layout.view) ? views.enabledViews[0] ?? layout.view : layout.view,
              viewDisplay: views?.viewDisplay ?? layout.viewDisplay,
              formats: views?.formats ?? layout.formats,
              grouping: (layout.grouping ?? []).filter((level) => !dropped.includes(level.field)),
              taskGrouping: (views?.taskGrouping ?? layout.taskGrouping ?? []).filter((level) => !dropped.includes(level.field)),
              ...(layout.kanbanField && dropped.includes(layout.kanbanField) ? { kanbanField: 'status' } : {}),
            }));
            setFieldPatches((prev) => ({
              ...prev,
              ...Object.fromEntries(
                fields
                  .filter((field) => !field.code.startsWith('cf-') && field.code !== 'locked')
                  .map((field) => [
                    field.code,
                    { unique: field.unique, formula: field.formula, display: field.display, validValues: field.validValues },
                  ]),
              ),
            }));
            if (page === 'shots' && views) setProjectFormats(views.projectFormats);
            if (page === 'shots') fields.forEach(moveHiddenStatuses);
            if (page === 'shots') {
              setCustomFields(fields.filter((field) => field.code.startsWith('cf-')).map(({ statusReplacements: _moved, ...field }) => field));
              setRemovedFieldCodes(dropped.filter((code) => shotsPage.fields.some((field) => field.code === code)));
            }
          }}
          onClose={() => {
            setFieldsOpen(false);
            setFieldsStart(undefined);
          }}
        />
      )}
      {groupOpen && current && page !== 'dashboard' && (
        <GroupDialog
          key={ganttIsTasks ? 'gantt' : 'records'}
          levels={ganttIsTasks ? draft.taskGrouping : currentGrouping}
          fields={ganttIsTasks ? taskGroupFields(current?.query.table === 'Asset' ? 'Asset' : 'Shot') : groupFields()}
          sort={page === 'shots' && !ganttIsTasks ? sortFor(shotView ?? 'table') : undefined}
          sortFields={page === 'shots' && !ganttIsTasks ? shotSortFields() : undefined}
          savedWithPage
          note={
            ganttIsTasks
              ? 'This gantt is the tasks of these records. Its grouping stays with the gantt and does not change how the table, cards, or thumbnails are grouped.'
              : page === 'shots'
                ? `This grouping and sort are for the ${VIEW_NAME[shotView ?? 'table']} view. Each view keeps its own; give several views the same one from Manage fields. They do not change the gantt.`
                : 'This grouping is for these tasks. It stays when you switch between table, cards, thumbnails, and gantt.'
          }
          onApply={(levels, sort) => {
            if (ganttIsTasks) update(() => ({ taskGrouping: levels }));
            else if (page === 'shots' && shotView) setViewDisplay(shotView, (own) => ({ ...own, grouping: levels, ...(sort ? { sort } : {}) }));
            else update(() => ({ grouping: levels }));
          }}
          onClose={() => setGroupOpen(false)}
        />
      )}
      {formatColumn && current && page === 'shots' && (
        <div className={`sgp-dir-${direction.id} sgp-theme-${theme} font-sans text-md`} style={{ colorScheme: theme }}>
          <ConditionalFormatDialog
            pageName={current.name}
            noun="shots"
            tableLabel="Shots"
            projectName="The Last Lamplighter"
            projectRules={projectFormats}
            canEditProject={permissionsFor(viewerId).managesSchema}
            fields={shotsPage.fields}
            columns={draft.columns.map(shotsPage.fieldByCode).filter((f): f is NonNullable<typeof f> => !!f)}
            records={shotsPage.allShots as unknown as Array<Record<string, unknown>>}
            recordLabel={(r) => String(r.code)}
            rules={draft.formats}
            startColumn={formatColumn}
            onApply={(formats, project) => {
              update(() => ({ formats }));
              setProjectFormats(project);
            }}
            onClose={() => setFormatColumn(null)}
          />
        </div>
      )}
    </div>
  );
}

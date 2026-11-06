// ---------------------------------------------------------------------------
// Catalog: tables, fields, status values, configuration layers
// ---------------------------------------------------------------------------

export type Scope = 'company' | 'project';

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percent'
  | 'date'
  | 'duration'
  | 'checkbox'
  | 'list'
  | 'status'
  | 'entity'
  | 'multi-entity'
  | 'user'
  | 'media'
  | 'url'
  | 'color'
  | 'calculated'
  | 'summary'
  | 'todos';

/**
 * Structured expression tree. The formula editor shows it as chips (typed or clicked);
 * the server type-checks the tree and compiles it to SQL.
 */
export type Expr =
  | { field: string }
  | { value: number | string }
  | { duration: { days?: number; weeks?: number } }
  | {
      op: 'add' | 'subtract' | 'multiply' | 'divide' | 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'and' | 'or';
      args: Expr[];
    }
  /** Older shape, read as if / then / else chips. */
  | { fn: 'if'; args: [Expr, Expr, Expr] }
  | { cond: { branches: Array<{ when: Expr; then: Expr }>; otherwise?: Expr } }
  | { aggregate: 'sum' | 'count' | 'avg' | 'min' | 'max'; table: string; via: string; field?: string };

export interface FieldDef {
  code: string;
  label: string;
  type: FieldType;
  /** Shipped with the product; can be relabeled and hidden, not deleted. */
  system?: boolean;
  linkTo?: string[];
  /** Calculated and summary fields only. */
  formula?: Expr;
  /** All possible status or list codes; layers narrow and order them. */
  validValues?: string[];
  /**
   * Values must be unique among this table's records in the project (or the whole table).
   * A paste that would collide is renamed, for example "020_0010 copy".
   */
  unique?: 'project' | 'table';
}

export interface TableDef {
  code: string;
  label: string;
  scope: Scope;
  /** Shipped with the product; can be relabeled and hidden, not deleted. */
  system: boolean;
  icon: string;
  /** Detail-page standard: 'threaded' tables (Notes, Issues) open as an email-style thread with a side pane. */
  displayClass?: 'standard' | 'threaded';
  /** Table-type traits; usually set per template or project through configuration layers. */
  traits?: TableTraits;
  fields: FieldDef[];
}

/**
 * Table types (see Expectations_Fundamentals.md, item 15). Tasks is its own type; other tables
 * can carry tasks, organize them by pipeline step, and group steps into departments.
 */
export interface TableTraits {
  hasTasks?: boolean;
  hasSteps?: boolean;
  hasDepartments?: boolean;
}

/** Non-reply entries that appear inline in a thread. */
export interface ReadReceipt {
  personId: string;
  at: string;
}

export interface StatusChange {
  from: string;
  to: string;
  byId: string;
  at: string;
}

/** Platform meaning lets reports and automations understand client-invented statuses. */
export type StatusMeaning = 'not-started' | 'active' | 'review' | 'approved' | 'complete' | 'omitted';

export interface StatusValue {
  code: string;
  label: string;
  /** Client-defined short name, used when a column displays statuses compactly. */
  shortLabel: string;
  /** Client data, not a design token. */
  color: string;
  icon: string;
  meaning: StatusMeaning;
}

export interface FieldConfigLayer {
  id: string;
  layer: 'template' | 'project';
  /** Template id or project id. */
  targetId: string;
  /** Template layers only: the template version that introduced this setting. */
  version?: number;
  table: string;
  field?: string;
  hidden?: boolean;
  label?: string;
  /** Status or list codes allowed at this layer, in display order. */
  validValues?: string[];
  /** Table-level layers only: table-type traits for this template or project. */
  traits?: TableTraits;
}

/** A template is a project kept in Company > Templates; new projects start as a copy of one. */
export interface Template {
  id: string;
  name: string;
  description: string;
  projectId: string;
  currentVersion: number;
}

export interface TemplateVersion {
  templateId: string;
  version: number;
  at: string;
  authorId: string;
  summary: string;
}

/** Where a project's configuration started. The project is then a branch that evolves freely. */
export interface ProjectSource {
  kind: 'template' | 'project';
  /** Template id or project id. */
  sourceId: string;
  /** Configuration version of the source at creation (the diff base). */
  version: number;
  /** Root template of the lineage. */
  templateId: string;
}

/** A project's decision on one incoming template change. Absent = still queued. */
export interface ChangeDecision {
  projectId: string;
  layerId: string;
  decision: 'accepted' | 'dismissed';
  decidedById: string;
  at: string;
}

export interface AiModel {
  id: string;
  name: string;
  capabilities: Array<'chat' | 'code' | 'image' | 'voice' | 'fast'>;
  /** Relative cost, 1 (cheapest) to 3. Real prices come from the platform's model catalog. */
  costTier: 1 | 2 | 3;
}

export interface AiProvider {
  id: string;
  name: string;
  /** Company switch: Auto never routes to a provider that is off. */
  enabled: boolean;
  models: AiModel[];
}

export interface RenderAdapter {
  id: string;
  name: string;
  /** Ready-made integration maintained by SGPipeline. */
  builtIn: boolean;
  enabled: boolean;
  description: string;
}

export interface PermissionSet {
  id: string;
  name: string;
  /** Starter set shipped with the product; clients can still edit it. */
  starter: boolean;
  canApprove: boolean;
  seesFinancials: boolean;
  managesSchema: boolean;
  createsSharedPages: boolean;
  readOnly: boolean;
}

// ---------------------------------------------------------------------------
// Company-level records
// ---------------------------------------------------------------------------

export interface Company {
  id: string;
  name: string;
  url: string;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  permissionSetIds: string[];
  department?: string;
  /** Financial field: hidden from artists by field-level permissions. */
  dayRate?: number;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  logline: string;
  /** Template projects live in Company > Templates, not in the project list. */
  isTemplate: boolean;
  /** Set on projects created from a template or another project. */
  source?: ProjectSource;
  /** Set when the project and its data were moved to cheaper storage. */
  archivedAt?: string;
  memberIds: string[];
  fps: number;
  resolution: { width: number; height: number };
  startDate: string;
  targetDate: string;
}

export interface Issue {
  id: string;
  title: string;
  status: string;
  reporterId: string;
  assigneeId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
  projectId: string | null;
  createdAt: string;
  readBy?: ReadReceipt[];
  statusChanges?: StatusChange[];
}

export interface IssueComment {
  id: string;
  issueId: string;
  authorId: string;
  body: string;
  createdAt: string;
  /** Internal comments are visible to staff only, as in help-desk tools. */
  internal?: boolean;
  /** Attached file names. */
  attachments?: string[];
}

// ---------------------------------------------------------------------------
// Project-level records
// ---------------------------------------------------------------------------

/** Optional second layer of pipeline organization, e.g. "Shot Finaling" holding Lighting, FX, and Comp. */
export interface Department {
  id: string;
  name: string;
  managerId?: string;
  coordinatorId?: string;
}

export interface PipelineStep {
  id: string;
  templateId: string;
  departmentId: string;
  code: string;
  name: string;
  appliesTo: 'Shot' | 'Asset';
  order: number;
  bidDays: number;
}

export interface Sequence {
  id: string;
  projectId: string;
  code: string;
  name: string;
  description: string;
}

export interface Shot {
  id: string;
  projectId: string;
  code: string;
  sequenceId: string;
  description: string;
  status: string;
  frameIn: number;
  frameOut: number;
  /** Calculated: Cut out - Cut in + 1 (both end frames count). */
  totalFrames: number;
  dueDate: string;
  /** Calculated: due_date - 4 weeks. */
  animationDue: string;
  assetIds: string[];
  cameraRoll?: string;
  createdAt: string;
  createdById: string;
  updatedAt: string;
  updatedById: string;
}

export type AssetType = 'character' | 'set' | 'prop' | 'matte' | 'crowd';

export interface Asset {
  id: string;
  /** null = company asset library, shared across projects. */
  projectId: string | null;
  code: string;
  name: string;
  type: AssetType;
  description: string;
  status: string;
}

/** Freeform checklist item on a task or sub-task; not assignable. */
export interface Todo {
  id: string;
  text: string;
  done: boolean;
}

/**
 * FS: finish-to-start (successor starts after predecessor finishes). SS: start-to-start.
 * FF: finish-to-finish. SF: start-to-finish (successor can't finish until predecessor starts).
 */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface TaskDependency {
  predecessorId: string;
  type: DependencyType;
}

export interface Task {
  id: string;
  projectId: string;
  dependencies?: TaskDependency[];
  /** Sub-tasks carry a parent; top-level tasks do not. */
  parentTaskId?: string;
  name: string;
  entityType: 'Shot' | 'Asset';
  entityId: string;
  stepId: string;
  assigneeId: string;
  status: string;
  bidDays: number;
  loggedDays: number;
  startDate: string;
  dueDate: string;
  todos: Todo[];
}

export interface Version {
  id: string;
  projectId: string;
  code: string;
  taskId: string;
  createdById: string;
  status: string;
  submittedAt: string;
  frameIn: number;
  frameOut: number;
  description: string;
  /** Set once reviewed. Never equal to createdById. */
  reviewedById?: string;
}

export interface Note {
  id: string;
  projectId: string;
  /** Replies thread under their parent, like email. */
  parentNoteId?: string;
  /** Open until the recipient closes it. */
  status: 'open' | 'closed';
  versionId: string;
  authorId: string;
  toId: string;
  body: string;
  /** Frame the note was written on, when given during playback. */
  frame?: number;
  hasMarkup: boolean;
  createdAt: string;
  readBy?: ReadReceipt[];
  statusChanges?: StatusChange[];
}

export interface Bid {
  id: string;
  projectId: string;
  name: string;
  markup: number;
  /** Summary: sum(sub_bids.amount) * markup. */
  totalBid: number;
}

export interface SubBid {
  id: string;
  projectId: string;
  bidId: string;
  department: string;
  amount: number;
}

export interface Reel {
  id: string;
  projectId: string;
  name: string;
  status: string;
  shotIds: string[];
}

// ---------------------------------------------------------------------------
// Pages and navigation
// ---------------------------------------------------------------------------

export type FilterOp = 'is' | 'is_not' | 'in' | 'not_in' | 'is_null' | 'lt' | 'gt';

export interface Filter {
  field: string;
  op: FilterOp;
  value?: string | number | null | string[];
}

/** One level of page grouping. Ascending follows the field's own order. */
export interface GroupLevel {
  field: string;
  direction: 'asc' | 'desc';
}

export interface PageQuery {
  table: string;
  filters: Filter[];
  /** First grouping field, kept for queries that store a single field. */
  groupBy?: string;
  /** Ordered grouping. When absent, the page uses groupBy, ascending. */
  grouping?: GroupLevel[];
  columns?: string[];
}

/** multiProject: a company-level page that spans projects; it lives in the Multi-project pages folder. */
export type PageScope = { level: 'company'; multiProject?: boolean } | { level: 'project'; projectId: string };

export type WidgetKind = 'pie' | 'bar' | 'histogram' | 'heatmap' | 'number';

export interface Widget {
  id: string;
  kind: WidgetKind;
  title: string;
  query: PageQuery;
  /** Field to measure or group by, depending on widget kind. */
  dimension?: string;
  row: number;
  col: number;
  rowSpan?: number;
  colSpan?: number;
}

export type StatusDisplay = 'long' | 'short' | 'icon';

export type SummaryKind = 'sum' | 'average' | 'min' | 'max' | 'count';

/** Per-column settings saved with a table page. */
export interface ColumnSettings {
  statusDisplay?: StatusDisplay;
  /** Shown in group rows and the page's total row. */
  summary?: SummaryKind;
  /** Column width in pixels, set by dragging or double-clicking the header edge; absent = the field's default. */
  width?: number;
}

/** A table the client filed into a folder; unplaced tables sit at their level's root. */
export interface TablePlacement {
  table: string;
  scope: PageScope;
  folderId: string;
}

export interface CardSettings {
  titleFields: string[];
  expandedFields: string[];
  /** Cards per row, 1-10. */
  columns?: number;
}

export interface ThumbSettings {
  captionFields: string[];
  /** Fields drawn on the image. A field is either here or in the caption, not both. */
  overlayFields?: string[];
  /** Thumbnail width in pixels, set with the size slider. */
  size?: number;
}

export interface GanttSettings {
  startField: string;
  endField: string;
  /** Time scale slider position, 0 (days) to 100 (years). */
  zoom?: number;
  /** Columns beside the chart, in order, with widths in pixels. */
  columns?: string[];
  columnWidths?: Record<string, number>;
  /** Width of the column pane in pixels, set by dragging the divider; absent = as wide as its columns. */
  paneWidth?: number;
  /**
   * Grouping of the tasks this gantt shows, for a page whose own table is not Task.
   * Absent means the gantt is still grouped by the linked record.
   */
  taskGrouping?: GroupLevel[];
}

/** Every table page can flip between these views of the same query; gantt needs date fields. */
export type TableView = 'table' | 'card' | 'thumb' | 'kanban' | 'gantt';

interface PageBase {
  id: string;
  name: string;
  ownerId: string;
  /** false = personal page, in the owner's Personal folder at the page's level. */
  shared: boolean;
  /** User-chosen folder at the page's level; absent = level root (or the Multi-project pages folder). */
  folderId?: string;
}

/** Operators offered for a condition; the field's type decides which ones apply. */
export type ConditionOp =
  | 'eq'
  | 'neq'
  | 'lt'
  | 'lte'
  | 'gt'
  | 'gte'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'any_of'
  | 'none_of'
  | 'empty'
  | 'not_empty'
  | 'checked'
  | 'unchecked';

/** What a condition compares against: a typed value, today plus or minus days, or another field on the record. */
export type ConditionValue =
  | { kind: 'value'; value: string | number }
  | { kind: 'values'; values: string[] }
  | { kind: 'today'; offsetDays: number }
  | { kind: 'field'; field: string };

export interface FormatCondition {
  field: string;
  op: ConditionOp;
  value?: ConditionValue;
}

/** Colors are client data (any CSS color, usually from the default data palette). */
export interface FormatStyle {
  text?: string;
  background?: string;
  border?: string;
  bold?: boolean;
}

/**
 * One rule in a page's ordered list. When rules overlap, the first matching rule in the list
 * wins for each row (and for each cell). Stored like every expression: structured, never as syntax.
 */
export interface ConditionalFormat {
  id: string;
  name: string;
  enabled: boolean;
  match: 'all' | 'any';
  conditions: FormatCondition[];
  /** 'row' formats the whole row; otherwise the code of the one column to format. */
  applyTo: 'row' | string;
  style: FormatStyle;
}

export interface TablePage extends PageBase {
  type: 'table';
  view: TableView;
  query: PageQuery;
  columnSettings?: Record<string, ColumnSettings>;
  conditionalFormats?: ConditionalFormat[];
  cardSettings?: CardSettings;
  thumbSettings?: ThumbSettings;
  ganttSettings?: GanttSettings;
  /** Kanban, when this project has enabled it for the page's table. */
  kanban?: { field?: string; columns?: number; fields?: string[] };
}

export interface DashboardPage extends PageBase {
  type: 'dashboard';
  rows: number;
  cols: number;
  widgets: Widget[];
}

export type Page = TablePage | DashboardPage;

export interface Folder {
  id: string;
  name: string;
  scope: PageScope;
  parentId?: string;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export type EventKind = 'create' | 'update' | 'delete' | 'config' | 'sign-in';

export interface PipelineEvent {
  /** Strictly increasing per company. */
  id: number;
  at: string;
  userId: string;
  kind: EventKind;
  table: string;
  recordId: string;
  projectId: string | null;
  field?: string;
  oldValue?: string | number | null;
  newValue?: string | number | null;
  description: string;
}

// ---------------------------------------------------------------------------
// Story development
// ---------------------------------------------------------------------------

export interface WorldCharacter {
  assetId: string;
  name: string;
  summary: string;
  want: string;
  visualNotes: string;
}

export interface WorldLocation {
  assetId: string;
  name: string;
  summary: string;
  visualNotes: string;
}

export interface WorldBible {
  projectId: string;
  tone: string;
  era: string;
  palette: string;
  rules: string[];
  characters: WorldCharacter[];
  locations: WorldLocation[];
}

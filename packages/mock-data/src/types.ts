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
  | 'summary';

/**
 * Structured expression tree built by the visual formula builder. Users never type syntax;
 * the server type-checks the tree and compiles it to SQL.
 */
export type Expr =
  | { field: string }
  | { value: number | string }
  | { duration: { days?: number; weeks?: number } }
  | { op: 'add' | 'subtract' | 'multiply' | 'divide'; args: Expr[] }
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
}

export interface TableDef {
  code: string;
  label: string;
  scope: Scope;
  /** Shipped with the product; can be relabeled and hidden, not deleted. */
  system: boolean;
  icon: string;
  fields: FieldDef[];
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
  projectId: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Project-level records
// ---------------------------------------------------------------------------

export interface PipelineStep {
  id: string;
  templateId: string;
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

export interface Task {
  id: string;
  projectId: string;
  entityType: 'Shot' | 'Asset';
  entityId: string;
  stepId: string;
  assigneeId: string;
  status: string;
  bidDays: number;
  loggedDays: number;
  dueDate: string;
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
  versionId: string;
  authorId: string;
  toId: string;
  body: string;
  /** Frame the note was written on, when given during playback. */
  frame?: number;
  hasMarkup: boolean;
  createdAt: string;
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

export interface PageQuery {
  table: string;
  filters: Filter[];
  groupBy?: string;
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
  /** Thumbnail width in pixels, set with the size slider. */
  size?: number;
}

/** Every table page can flip between these views of the same query. */
export type TableView = 'table' | 'card' | 'thumb';

interface PageBase {
  id: string;
  name: string;
  ownerId: string;
  /** false = personal page, in the owner's Personal folder at the page's level. */
  shared: boolean;
  /** User-chosen folder at the page's level; absent = level root (or the Multi-project pages folder). */
  folderId?: string;
}

export interface TablePage extends PageBase {
  type: 'table';
  view: TableView;
  query: PageQuery;
  columnSettings?: Record<string, ColumnSettings>;
  cardSettings?: CardSettings;
  thumbSettings?: ThumbSettings;
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

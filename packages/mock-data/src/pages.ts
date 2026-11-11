import type { ConditionalFormat, Folder, Page, TablePlacement } from './types';

const LMP = 'prj01';
const TSR = 'prj02';

/**
 * User-created folders. The Personal folder (every level) and the Multi-project pages folder
 * (Company level) are system folders built by the navigation, so they are not listed here.
 */
export const folders: Folder[] = [
  { id: 'f-studio', name: 'Studio admin', scope: { level: 'company' } },
  { id: 'f-lmp-production', name: 'Production', scope: { level: 'project', projectId: LMP } },
  { id: 'f-lmp-review', name: 'Review', scope: { level: 'project', projectId: LMP } },
  { id: 'f-lmp-budget', name: 'Budget', scope: { level: 'project', projectId: LMP } },
];

/** Tables appear directly in the navigation; clients may file them into folders like pages. */
export const tablePlacements: TablePlacement[] = [
  { table: 'PermissionSet', scope: { level: 'company' }, folderId: 'f-studio' },
  { table: 'Template', scope: { level: 'company' }, folderId: 'f-studio' },
  { table: 'PipelineStep', scope: { level: 'company' }, folderId: 'f-studio' },
  { table: 'Bid', scope: { level: 'project', projectId: LMP }, folderId: 'f-lmp-budget' },
  { table: 'SubBid', scope: { level: 'project', projectId: LMP }, folderId: 'f-lmp-budget' },
];

/**
 * Saved pages. The level in the navigation is computed from each page's query
 * (see resolvePageScope); the folder within that level is the user's choice.
 */
export const pages: Page[] = [
  // Company level: multi-project pages (live in the Multi-project pages folder)
  {
    id: 'pg-all-shots',
    name: 'All shots by project',
    type: 'table',
    view: 'table',
    ownerId: 'p01',
    shared: true,
    query: {
      table: 'Shot',
      filters: [],
      groupBy: 'projectId',
      columns: ['code', 'status', 'description', 'dueDate'],
    },
  },
  {
    id: 'pg-studio-dashboard',
    name: 'Studio dashboard',
    type: 'dashboard',
    ownerId: 'p03',
    shared: true,
    rows: 2,
    cols: 3,
    widgets: [
      { id: 'w1', kind: 'bar', title: 'Shots by status, per project', query: { table: 'Shot', filters: [], groupBy: 'projectId' }, dimension: 'status', row: 1, col: 1, colSpan: 2 },
      { id: 'w2', kind: 'number', title: 'Open issues', query: { table: 'Issue', filters: [{ field: 'status', op: 'is', value: 'open' }] }, row: 1, col: 3 },
      { id: 'w3', kind: 'pie', title: 'Tasks by status', query: { table: 'Task', filters: [] }, dimension: 'status', row: 2, col: 1 },
      { id: 'w4', kind: 'bar', title: 'Total bid per project', query: { table: 'Bid', filters: [] }, dimension: 'totalBid', row: 2, col: 2, colSpan: 2 },
    ],
  },
  {
    id: 'pg-lmp-animation-status',
    name: 'Lamplighter animation status',
    type: 'table',
    view: 'table',
    ownerId: 'p01',
    shared: true,
    // Narrowed to one project after creation; on save the user picked Production in the new level.
    folderId: 'f-lmp-production',
    query: {
      table: 'Task',
      filters: [
        { field: 'projectId', op: 'is', value: LMP },
        { field: 'stepId', op: 'is', value: 'st-anm' },
      ],
      columns: ['entityId', 'assigneeId', 'status', 'dueDate'],
    },
  },
  {
    id: 'pg-issues',
    name: 'Open issues',
    type: 'table',
    view: 'table',
    ownerId: 'p04',
    shared: true,
    folderId: 'f-studio',
    query: { table: 'Issue', filters: [{ field: 'status', op: 'is_not', value: 'closed' }] },
  },
  {
    id: 'pg-character-library',
    name: 'Character library',
    type: 'table',
    view: 'thumb',
    ownerId: 'p02',
    shared: true,
    query: {
      table: 'Asset',
      filters: [
        { field: 'projectId', op: 'is_null' },
        { field: 'type', op: 'is', value: 'character' },
      ],
    },
    cardSettings: { titleFields: ['name', 'status'], expandedFields: ['code', 'description'] },
  },
  {
    id: 'pg-people',
    name: 'People',
    type: 'table',
    view: 'table',
    ownerId: 'p01',
    shared: true,
    folderId: 'f-studio',
    query: { table: 'Person', filters: [], groupBy: 'department' },
  },
  {
    id: 'pg-events',
    name: 'Recent events',
    type: 'table',
    view: 'table',
    ownerId: 'p01',
    shared: true,
    query: { table: 'Event', filters: [], columns: ['id', 'at', 'userId', 'kind', 'table', 'description'] },
  },
  {
    id: 'pg-funder-overview',
    name: 'Funder overview',
    type: 'dashboard',
    ownerId: 'p17',
    shared: false,
    rows: 1,
    cols: 2,
    widgets: [
      { id: 'w1', kind: 'number', title: 'Total bid, all projects', query: { table: 'Bid', filters: [] }, dimension: 'totalBid', row: 1, col: 1 },
      { id: 'w2', kind: 'bar', title: 'Shots complete per project', query: { table: 'Shot', filters: [], groupBy: 'projectId' }, dimension: 'status', row: 1, col: 2 },
    ],
  },

  // The Last Lamplighter
  {
    id: 'pg-lmp-shots',
    name: 'Shots',
    type: 'table',
    view: 'table',
    ownerId: 'p04',
    shared: true,
    folderId: 'f-lmp-production',
    query: {
      table: 'Shot',
      filters: [{ field: 'projectId', op: 'is', value: LMP }],
      groupBy: 'sequenceId',
      sort: [{ field: 'code', direction: 'asc' }],
      columns: ['image', 'code', 'status', 'description', 'frameIn', 'frameOut', 'totalFrames', 'dueDate', 'animationDue', 'assetIds'],
    },
    columnSettings: {
      status: { statusDisplay: 'long' },
      totalFrames: { summary: 'sum' },
    },
    cardSettings: {
      titleFields: ['code', 'status'],
      expandedFields: ['description', 'frameIn', 'frameOut', 'totalFrames', 'dueDate', 'assetIds'],
      columns: 4,
    },
    thumbSettings: { captionFields: ['code', 'status'], overlayFields: ['totalFrames'], size: 192 },
    ganttSettings: { startField: 'animationDue', endField: 'dueDate', zoom: 55 },
  },
  {
    id: 'pg-lmp-assets',
    name: 'Assets',
    type: 'table',
    view: 'card',
    ownerId: 'p04',
    shared: true,
    folderId: 'f-lmp-production',
    query: { table: 'Asset', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'type' },
    cardSettings: { titleFields: ['name', 'status'], expandedFields: ['code', 'type', 'description'] },
  },
  {
    id: 'pg-lmp-tasks',
    name: 'Tasks',
    type: 'table',
    view: 'gantt',
    ownerId: 'p04',
    shared: true,
    folderId: 'f-lmp-production',
    query: {
      table: 'Task',
      filters: [{ field: 'projectId', op: 'is', value: LMP }],
      groupBy: 'stepId',
      columns: ['name', 'entityId', 'assigneeId', 'status', 'startDate', 'dueDate', 'bidDays', 'loggedDays', 'todos'],
    },
    columnSettings: { status: { statusDisplay: 'long' } },
    ganttSettings: { startField: 'startDate', endField: 'dueDate', zoom: 30 },
  },
  {
    id: 'pg-lmp-pending-review',
    name: 'Pending review',
    type: 'table',
    view: 'table',
    ownerId: 'p02',
    shared: true,
    folderId: 'f-lmp-review',
    query: {
      table: 'Version',
      filters: [
        { field: 'projectId', op: 'is', value: LMP },
        { field: 'status', op: 'is', value: 'rev' },
      ],
    },
  },
  {
    id: 'pg-lmp-bids',
    name: 'Bids',
    type: 'table',
    view: 'table',
    ownerId: 'p14',
    shared: true,
    folderId: 'f-lmp-budget',
    query: { table: 'SubBid', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'bidId' },
  },
  {
    id: 'pg-lmp-producer-dashboard',
    name: 'Producer dashboard',
    type: 'dashboard',
    ownerId: 'p03',
    shared: true,
    folderId: 'f-lmp-budget',
    rows: 2,
    cols: 2,
    widgets: [
      { id: 'w1', kind: 'pie', title: 'Shots by status', query: { table: 'Shot', filters: [{ field: 'projectId', op: 'is', value: LMP }] }, dimension: 'status', row: 1, col: 1 },
      { id: 'w2', kind: 'heatmap', title: 'Task status by step', query: { table: 'Task', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'stepId' }, dimension: 'status', row: 1, col: 2 },
      { id: 'w3', kind: 'bar', title: 'Bid vs logged days by step', query: { table: 'Task', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'stepId' }, dimension: 'loggedDays', row: 2, col: 1 },
      { id: 'w4', kind: 'histogram', title: 'Versions per task', query: { table: 'Version', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'taskId' }, row: 2, col: 2 },
    ],
  },
  {
    id: 'pg-lmp-my-tasks',
    name: 'My tasks',
    type: 'table',
    view: 'table',
    ownerId: 'p09',
    shared: false,
    query: {
      table: 'Task',
      filters: [
        { field: 'projectId', op: 'is', value: LMP },
        { field: 'assigneeId', op: 'is', value: 'p09' },
      ],
    },
  },

  // Lamplighter Teaser
  {
    id: 'pg-tsr-shots',
    name: 'Shots',
    type: 'table',
    view: 'table',
    ownerId: 'p03',
    shared: true,
    query: {
      table: 'Shot',
      filters: [{ field: 'projectId', op: 'in', value: [TSR] }],
      columns: ['code', 'status', 'description', 'frameIn', 'frameOut', 'cameraRoll', 'dueDate'],
    },
  },
  {
    id: 'pg-tsr-reels',
    name: 'Client reels',
    type: 'table',
    view: 'table',
    ownerId: 'p03',
    shared: true,
    query: { table: 'Reel', filters: [{ field: 'projectId', op: 'is', value: TSR }] },
  },
];

/**
 * Example conditional formats for the Lamplighter Shots page (shown in the conditional formatting stories).
 * The two overlap on finaled shots; the earlier rule wins, so finals stay green.
 */
export const exampleConditionalFormats: ConditionalFormat[] = [
  {
    id: 'cf-final',
    name: 'Finaled',
    enabled: true,
    match: 'all',
    conditions: [{ field: 'status', op: 'any_of', value: { kind: 'values', values: ['final'] } }],
    applyTo: 'row',
    style: { background: 'var(--sgp-palette-green)' },
  },
  {
    id: 'cf-anim-due',
    name: 'Animation due within 30 days',
    enabled: true,
    match: 'all',
    conditions: [{ field: 'animationDue', op: 'lte', value: { kind: 'today', offsetDays: 30 } }],
    applyTo: 'row',
    style: { text: 'var(--sgp-palette-red)', bold: true },
  },
];

/** Example project-wide formats: these apply to every Shots page in The Last Lamplighter, after each page's own rules. */
export const exampleProjectFormats: ConditionalFormat[] = [
  {
    id: 'cf-long',
    name: 'Long shots',
    enabled: true,
    match: 'all',
    conditions: [{ field: 'totalFrames', op: 'gte', value: { kind: 'value', value: 130 } }],
    applyTo: 'totalFrames',
    style: { border: 'var(--sgp-palette-amber)', text: 'var(--sgp-palette-amber)' },
  },
];

/**
 * Project-wide conditional formats, per project and table. They apply to every page on that table in the
 * project, after the page's own rules. Changing them is a schema-level permission.
 */
export const projectConditionalFormats: Array<{ projectId: string; table: string; formats: ConditionalFormat[] }> = [];

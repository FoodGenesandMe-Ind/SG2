import type { Folder, Page } from './types';

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
    view: 'card',
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
      columns: ['code', 'status', 'description', 'frameIn', 'frameOut', 'dueDate', 'animationDue', 'assetIds'],
    },
    cardSettings: { titleFields: ['code', 'status'], expandedFields: ['description', 'dueDate', 'assetIds'] },
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
    name: 'Tasks by step',
    type: 'table',
    view: 'table',
    ownerId: 'p04',
    shared: true,
    folderId: 'f-lmp-production',
    query: { table: 'Task', filters: [{ field: 'projectId', op: 'is', value: LMP }], groupBy: 'stepId' },
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

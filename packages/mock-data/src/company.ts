import type {
  AiProvider,
  ChangeDecision,
  Company,
  FieldConfigLayer,
  PermissionSet,
  RenderAdapter,
  StatusValue,
  Template,
  TemplateVersion,
} from './types';

export const company: Company = {
  id: 'co01',
  name: 'Lantern Light Studios',
  url: 'lanternlight.sgpipeline.app',
};

export const templates: Template[] = [
  { id: 'tpl-3d', name: '3D Animation', description: 'Story through final render for CG animated work.', projectId: 'tprj-3d', currentVersion: 2 },
  { id: 'tpl-live', name: 'Live action / VFX', description: 'Plates, VFX shots, and final renders for live-action work.', projectId: 'tprj-live', currentVersion: 1 },
  { id: 'tpl-2d', name: '2D Animation', description: 'Boards, layout, animation, ink and paint, comp.', projectId: 'tprj-2d', currentVersion: 1 },
  { id: 'tpl-manga', name: 'Manga', description: 'Chapters, pages, and panels from script to lettering.', projectId: 'tprj-manga', currentVersion: 1 },
  { id: 'tpl-games', name: 'Video games', description: 'Levels, characters, and builds for game production.', projectId: 'tprj-games', currentVersion: 1 },
];

export const templateVersions: TemplateVersion[] = [
  { templateId: 'tpl-3d', version: 1, at: '2026-08-20T10:00:00Z', authorId: 'p01', summary: 'Initial 3D Animation pipeline.' },
  {
    templateId: 'tpl-3d',
    version: 2,
    at: '2026-10-20T10:00:00Z',
    authorId: 'p01',
    summary: 'Add "In Previs" to the Shot status list; rename Sequence description to Synopsis; rename Shot due date to Delivery due.',
  },
  { templateId: 'tpl-live', version: 1, at: '2026-09-25T10:00:00Z', authorId: 'p01', summary: 'Initial Live action / VFX pipeline.' },
  { templateId: 'tpl-2d', version: 1, at: '2026-08-20T10:00:00Z', authorId: 'p01', summary: 'Initial 2D Animation pipeline.' },
  { templateId: 'tpl-manga', version: 1, at: '2026-08-20T10:00:00Z', authorId: 'p01', summary: 'Initial Manga pipeline.' },
  { templateId: 'tpl-games', version: 1, at: '2026-08-20T10:00:00Z', authorId: 'p01', summary: 'Initial Video games pipeline.' },
];

export const permissionSets: PermissionSet[] = [
  { id: 'ps-admin', name: 'Admin', starter: true, canApprove: true, seesFinancials: true, managesSchema: true, createsSharedPages: true, readOnly: false },
  { id: 'ps-producer', name: 'Producer', starter: true, canApprove: false, seesFinancials: true, managesSchema: false, createsSharedPages: true, readOnly: false },
  { id: 'ps-manager', name: 'Manager', starter: true, canApprove: false, seesFinancials: false, managesSchema: false, createsSharedPages: true, readOnly: false },
  { id: 'ps-director', name: 'Director', starter: true, canApprove: true, seesFinancials: false, managesSchema: false, createsSharedPages: true, readOnly: false },
  { id: 'ps-lead', name: 'Department lead', starter: true, canApprove: true, seesFinancials: false, managesSchema: false, createsSharedPages: true, readOnly: false },
  { id: 'ps-artist', name: 'Artist', starter: true, canApprove: false, seesFinancials: false, managesSchema: false, createsSharedPages: false, readOnly: false },
  { id: 'ps-accounting', name: 'Accounting', starter: true, canApprove: false, seesFinancials: true, managesSchema: false, createsSharedPages: true, readOnly: false },
  { id: 'ps-executive', name: 'Executive', starter: true, canApprove: false, seesFinancials: true, managesSchema: false, createsSharedPages: false, readOnly: true },
  { id: 'ps-funder', name: 'Funder', starter: true, canApprove: false, seesFinancials: true, managesSchema: false, createsSharedPages: false, readOnly: true },
  { id: 'ps-client', name: 'Client reviewer', starter: true, canApprove: false, seesFinancials: false, managesSchema: false, createsSharedPages: false, readOnly: true },
  { id: 'ps-story', name: 'Story room', starter: false, canApprove: false, seesFinancials: false, managesSchema: false, createsSharedPages: true, readOnly: false },
];

/** Company-wide pool of status values. Colors and icons are client data. */
export const statusValues: StatusValue[] = [
  // Task, version, and asset workflow
  { code: 'wtg', label: 'Waiting to start', shortLabel: 'WTG', color: '#6f7378', icon: 'circle-dashed', meaning: 'not-started' },
  { code: 'rdy', label: 'Ready to start', shortLabel: 'RDY', color: '#a27cf2', icon: 'circle', meaning: 'not-started' },
  { code: 'ip', label: 'In progress', shortLabel: 'IP', color: '#4f9dff', icon: 'contrast', meaning: 'active' },
  { code: 'rev', label: 'Pending review', shortLabel: 'REV', color: '#f2b544', icon: 'eye', meaning: 'review' },
  { code: 'rtk', label: 'Retake', shortLabel: 'RTK', color: '#ef5b5b', icon: 'rotate-ccw', meaning: 'active' },
  { code: 'apr', label: 'Approved', shortLabel: 'APR', color: '#4cc38a', icon: 'check', meaning: 'approved' },
  { code: 'omt', label: 'Omitted', shortLabel: 'OMT', color: '#45484d', icon: 'ban', meaning: 'omitted' },
  // Shot stages used by the 3D Animation template (the "Nemo" pattern)
  { code: 'nrdy', label: 'Not Ready', shortLabel: 'NR', color: '#6f7378', icon: 'circle-dashed', meaning: 'not-started' },
  { code: 'story', label: 'In Story', shortLabel: 'STY', color: '#6e7cf2', icon: 'book-open', meaning: 'active' },
  { code: 'previs', label: 'In Previs', shortLabel: 'PVS', color: '#e66fb0', icon: 'clapperboard', meaning: 'active' },
  { code: 'layout', label: 'In Layout', shortLabel: 'LAY', color: '#3fc1e6', icon: 'frame', meaning: 'active' },
  { code: 'anim', label: 'In Animation', shortLabel: 'ANM', color: '#4f9dff', icon: 'person-standing', meaning: 'active' },
  { code: 'complight', label: 'In Comp/Light', shortLabel: 'C/L', color: '#f2864a', icon: 'sun', meaning: 'active' },
  { code: 'final', label: 'Final', shortLabel: 'FIN', color: '#4cc38a', icon: 'flag', meaning: 'complete' },
  // Shot statuses used by the Live action / VFX template (the "Pirates" pattern)
  { code: 'frc', label: 'Final Render Complete', shortLabel: 'FRC', color: '#2fb5a8', icon: 'film', meaning: 'complete' },
  // Issues
  { code: 'open', label: 'Open', shortLabel: 'OPN', color: '#ef5b5b', icon: 'circle-alert', meaning: 'active' },
  { code: 'closed', label: 'Closed', shortLabel: 'CLS', color: '#6f7378', icon: 'circle-check', meaning: 'complete' },
];

/**
 * Configuration above the company-wide field definitions.
 * A project resolves: field definition, then its template's layers up to the version it started from
 * (later versions override earlier ones), then its own local changes, then incoming template
 * changes it accepted (then permissions).
 */
export const fieldConfigLayers: FieldConfigLayer[] = [
  // 3D Animation template
  {
    id: 'cfg-3d-shot-status-v1',
    layer: 'template',
    targetId: 'tpl-3d',
    version: 1,
    table: 'Shot',
    field: 'status',
    validValues: ['nrdy', 'rdy', 'story', 'layout', 'anim', 'complight', 'final'],
  },
  { id: 'cfg-3d-camera-roll', layer: 'template', targetId: 'tpl-3d', version: 1, table: 'Shot', field: 'cameraRoll', hidden: true },
  { id: 'cfg-3d-reels', layer: 'template', targetId: 'tpl-3d', version: 1, table: 'Reel', hidden: true },
  {
    id: 'cfg-3d-shot-status-v2',
    layer: 'template',
    targetId: 'tpl-3d',
    version: 2,
    table: 'Shot',
    field: 'status',
    validValues: ['nrdy', 'rdy', 'story', 'previs', 'layout', 'anim', 'complight', 'final'],
  },
  { id: 'cfg-3d-sequence-synopsis-v2', layer: 'template', targetId: 'tpl-3d', version: 2, table: 'Sequence', field: 'description', label: 'Synopsis' },
  { id: 'cfg-3d-delivery-due-v2', layer: 'template', targetId: 'tpl-3d', version: 2, table: 'Shot', field: 'dueDate', label: 'Delivery due' },
  // Live action / VFX template
  {
    id: 'cfg-live-shot-status',
    layer: 'template',
    targetId: 'tpl-live',
    version: 1,
    table: 'Shot',
    field: 'status',
    validValues: ['rdy', 'ip', 'frc'],
  },
  { id: 'cfg-live-animation-due', layer: 'template', targetId: 'tpl-live', version: 1, table: 'Shot', field: 'animationDue', hidden: true },
  { id: 'cfg-live-tasks', layer: 'template', targetId: 'tpl-live', version: 1, table: 'Task', hidden: true },
  // The Last Lamplighter: local change that conflicts with 3D Animation v2 (both edit the Shot status list)
  {
    id: 'cfg-lmp-shot-status',
    layer: 'project',
    targetId: 'prj01',
    table: 'Shot',
    field: 'status',
    validValues: ['nrdy', 'rdy', 'story', 'layout', 'anim', 'complight', 'final', 'omt'],
  },
  // Lamplighter Teaser: local changes on its branch (candidates for the template to adopt)
  { id: 'cfg-tsr-plate-in', layer: 'project', targetId: 'prj02', table: 'Shot', field: 'frameIn', label: 'Plate in' },
  { id: 'cfg-tsr-plate-out', layer: 'project', targetId: 'prj02', table: 'Shot', field: 'frameOut', label: 'Plate out' },
  { id: 'cfg-tsr-reels-label', layer: 'project', targetId: 'prj02', table: 'Reel', label: 'Client reels' },
];

/**
 * Template changes are never applied automatically. Each incoming change stays queued until
 * the project accepts or dismisses it. The In Previs status change is still queued for LMP.
 */
export const changeDecisions: ChangeDecision[] = [
  { projectId: 'prj01', layerId: 'cfg-3d-sequence-synopsis-v2', decision: 'accepted', decidedById: 'p04', at: '2026-10-22T09:30:00Z' },
  { projectId: 'prj01', layerId: 'cfg-3d-delivery-due-v2', decision: 'dismissed', decidedById: 'p04', at: '2026-10-22T09:31:00Z' },
];

/** Provider switches are a company cost control; Auto only routes to providers that are on. */
export const aiProviders: AiProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    enabled: true,
    models: [
      { id: 'openai-flagship', name: 'OpenAI flagship', capabilities: ['chat', 'code'], costTier: 3 },
      { id: 'openai-fast', name: 'OpenAI fast', capabilities: ['chat', 'fast'], costTier: 1 },
      { id: 'openai-image', name: 'OpenAI image', capabilities: ['image'], costTier: 2 },
    ],
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    enabled: false,
    models: [
      { id: 'anthropic-flagship', name: 'Anthropic flagship', capabilities: ['chat', 'code'], costTier: 3 },
      { id: 'anthropic-fast', name: 'Anthropic fast', capabilities: ['chat', 'fast'], costTier: 1 },
    ],
  },
  {
    id: 'xai',
    name: 'xAI (Grok)',
    enabled: true,
    models: [
      { id: 'xai-flagship', name: 'Grok flagship', capabilities: ['chat', 'code'], costTier: 2 },
      { id: 'xai-fast', name: 'Grok fast', capabilities: ['chat', 'fast'], costTier: 1 },
    ],
  },
  {
    id: 'google',
    name: 'Google',
    enabled: true,
    models: [
      { id: 'google-flagship', name: 'Gemini flagship', capabilities: ['chat', 'code'], costTier: 2 },
      { id: 'google-image', name: 'Google image', capabilities: ['image'], costTier: 2 },
    ],
  },
  {
    id: 'meta',
    name: 'Meta',
    enabled: true,
    models: [{ id: 'meta-open', name: 'Llama (open weights)', capabilities: ['chat'], costTier: 1 }],
  },
  {
    id: 'local',
    name: 'Local models (on-prem)',
    enabled: false,
    models: [
      { id: 'local-chat', name: 'Local chat model', capabilities: ['chat'], costTier: 1 },
      { id: 'local-image', name: 'ComfyUI workflow', capabilities: ['image'], costTier: 1 },
    ],
  },
];

export const renderAdapters: RenderAdapter[] = [
  { id: 'flamenco', name: 'Flamenco', builtIn: true, enabled: true, description: 'Default. Blender\u2019s open-source render manager.' },
  { id: 'opencue', name: 'OpenCue', builtIn: true, enabled: false, description: 'Open-source render manager for larger farms.' },
  { id: 'deadline', name: 'Deadline', builtIn: true, enabled: false, description: 'Widely used studio render manager.' },
  { id: 'cloud-gpu', name: 'Cloud GPU rendering', builtIn: true, enabled: false, description: 'Burst rendering on rented cloud GPUs.' },
  { id: 'custom', name: 'Bring your own', builtIn: false, enabled: false, description: 'Any farm, using the published render-job data and adapter API.' },
];

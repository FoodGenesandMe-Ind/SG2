import { changeDecisions, fieldConfigLayers, templates } from './company';
import { folders, pages } from './pages';
import { projects } from './project';
import { tables } from './schema';
import type {
  ChangeDecision,
  FieldConfigLayer,
  FieldDef,
  Folder,
  Page,
  PageQuery,
  PageScope,
  Project,
  TableDef,
  Template,
} from './types';

// ---------------------------------------------------------------------------
// Layered configuration: field definition -> source configuration at creation
// -> the project's own changes -> accepted incoming changes
// (the permission layer is applied on top by the server and can only restrict)
// ---------------------------------------------------------------------------

export interface EffectiveField extends FieldDef {
  hidden: boolean;
}

export interface EffectiveTable extends Omit<TableDef, 'fields'> {
  hidden: boolean;
  fields: EffectiveField[];
}

function byVersion(a: FieldConfigLayer, b: FieldConfigLayer) {
  return (a.version ?? 1) - (b.version ?? 1);
}

function templateLayers(templateId: string, upToVersion: number): FieldConfigLayer[] {
  return fieldConfigLayers
    .filter((l) => l.layer === 'template' && l.targetId === templateId && (l.version ?? 1) <= upToVersion)
    .sort(byVersion);
}

function localLayers(projectId: string): FieldConfigLayer[] {
  return fieldConfigLayers.filter((l) => l.layer === 'project' && l.targetId === projectId);
}

function decisionFor(projectId: string, layerId: string): ChangeDecision | undefined {
  return changeDecisions.find((d) => d.projectId === projectId && d.layerId === layerId);
}

function layersFor(projectId: string | null): FieldConfigLayer[] {
  const project = projectId ? projects.find((p) => p.id === projectId) : undefined;
  if (!project) return [];
  if (project.isTemplate) {
    const template = templates.find((t) => t.projectId === project.id);
    return template ? templateLayers(template.id, template.currentVersion) : [];
  }
  if (!project.source) return localLayers(project.id);

  const base =
    project.source.kind === 'template'
      ? templateLayers(project.source.sourceId, project.source.version)
      : layersFor(project.source.sourceId);
  const accepted = fieldConfigLayers
    .filter((l) => l.layer === 'template' && decisionFor(project.id, l.id)?.decision === 'accepted')
    .sort(byVersion);
  return [...base, ...localLayers(project.id), ...accepted];
}

export function resolveTableConfig(tableCode: string, projectId: string | null): EffectiveTable | undefined {
  const table = tables.find((t) => t.code === tableCode);
  if (!table) return undefined;
  const layers = layersFor(projectId).filter((l) => l.table === tableCode);

  let label = table.label;
  let hidden = false;
  for (const layer of layers.filter((l) => !l.field)) {
    if (layer.label) label = layer.label;
    if (layer.hidden !== undefined) hidden = layer.hidden;
  }

  const fields = table.fields.map((field): EffectiveField => {
    const effective: EffectiveField = { ...field, hidden: false };
    for (const layer of layers.filter((l) => l.field === field.code)) {
      if (layer.label) effective.label = layer.label;
      if (layer.hidden !== undefined) effective.hidden = layer.hidden;
      if (layer.validValues) effective.validValues = layer.validValues;
    }
    return effective;
  });

  return { ...table, label, hidden, fields };
}

// ---------------------------------------------------------------------------
// Branches and templates. Template changes are never applied automatically:
// they queue as incoming changes and the project decides one change at a time.
// ---------------------------------------------------------------------------

export interface IncomingChange {
  layer: FieldConfigLayer;
  status: 'queued' | 'accepted' | 'dismissed';
  /** The project also changed this setting locally. */
  conflictsWith?: FieldConfigLayer;
}

export interface LocalChange {
  layer: FieldConfigLayer;
  /** The template also changed this setting since the project's base. */
  conflictsWith?: FieldConfigLayer;
}

export interface BranchStatus {
  template: Template;
  source: NonNullable<Project['source']>;
  latestTemplateVersion: number;
  incoming: IncomingChange[];
  localChanges: LocalChange[];
}

function sameSetting(a: FieldConfigLayer, b: FieldConfigLayer): boolean {
  if (a.table !== b.table || a.field !== b.field) return false;
  return (
    (a.hidden !== undefined && b.hidden !== undefined) ||
    (a.label !== undefined && b.label !== undefined) ||
    (a.validValues !== undefined && b.validValues !== undefined)
  );
}

export function branchStatus(projectId: string): BranchStatus | undefined {
  const project = projects.find((p) => p.id === projectId);
  const source = project?.source;
  const template = source && templates.find((t) => t.id === source.templateId);
  if (!project || !source || !template) return undefined;

  const baseVersion = source.kind === 'template' ? source.version : 0;
  const templateChanges = fieldConfigLayers.filter(
    (l) => l.layer === 'template' && l.targetId === template.id && (l.version ?? 1) > baseVersion,
  );
  const local = localLayers(project.id);

  return {
    template,
    source,
    latestTemplateVersion: template.currentVersion,
    incoming: templateChanges.map((layer) => ({
      layer,
      status: decisionFor(project.id, layer.id)?.decision ?? 'queued',
      conflictsWith: local.find((l) => sameSetting(l, layer)),
    })),
    localChanges: local.map((layer) => ({ layer, conflictsWith: templateChanges.find((t) => sameSetting(t, layer)) })),
  };
}

export interface Proposal {
  project: Project;
  layer: FieldConfigLayer;
}

/** The template's "Proposed from projects" view: local changes in every branch of this template. */
export function proposalsForTemplate(templateId: string): Proposal[] {
  return projects
    .filter((p) => !p.isTemplate && p.source?.templateId === templateId)
    .flatMap((project) => localLayers(project.id).map((layer) => ({ project, layer })));
}

// ---------------------------------------------------------------------------
// Page level: computed from the query. The folder within the level is the user's choice.
// ---------------------------------------------------------------------------

const COMPANY: PageScope = { level: 'company' };
const MULTI_PROJECT: PageScope = { level: 'company', multiProject: true };

export function sameScope(a: PageScope, b: PageScope): boolean {
  if (a.level === 'company' || b.level === 'company') return a.level === b.level;
  return a.projectId === b.projectId;
}

export function resolveQueryScope(query: PageQuery): PageScope {
  const table = tables.find((t) => t.code === query.table);
  if (!table || table.scope === 'company') return COMPANY;
  const projectFilter = query.filters.find((f) => f.field === 'projectId');
  if (projectFilter?.op === 'is_null') return COMPANY;
  if (projectFilter?.op === 'is' && typeof projectFilter.value === 'string') {
    return { level: 'project', projectId: projectFilter.value };
  }
  if (projectFilter?.op === 'in' && Array.isArray(projectFilter.value) && projectFilter.value.length === 1) {
    return { level: 'project', projectId: projectFilter.value[0] };
  }
  return MULTI_PROJECT;
}

export function resolvePageScope(page: Page): PageScope {
  if (page.type === 'table') return resolveQueryScope(page.query);
  const scopes = page.widgets.map((w) => resolveQueryScope(w.query));
  const first = scopes[0];
  if (first?.level === 'project' && scopes.every((s) => sameScope(s, first))) return first;
  if (scopes.some((s) => s.level === 'company' && s.multiProject)) return MULTI_PROJECT;
  if (scopes.some((s) => s.level === 'project')) return MULTI_PROJECT;
  return COMPANY;
}

// ---------------------------------------------------------------------------
// Navigation tree
// ---------------------------------------------------------------------------

export interface NavFolder {
  folder: Folder;
  pages: Page[];
}

export interface NavLevel {
  scope: PageScope;
  label: string;
  tables: EffectiveTable[];
  folders: NavFolder[];
  /** Shared pages at the level root. */
  pages: Page[];
  /** System folder: the viewer's personal pages at this level. */
  personal: Page[];
  /** System folder, Company level only. */
  multiProject?: Page[];
}

export interface NavTree {
  company: NavLevel;
  projects: NavLevel[];
}

export function buildNavTree(viewerId: string): NavTree {
  const visibleProjects = projects.filter((p) => !p.isTemplate && !p.archivedAt && p.memberIds.includes(viewerId));

  const levelFor = (scope: PageScope, label: string): NavLevel => {
    const projectId = scope.level === 'project' ? scope.projectId : null;
    const levelTables = tables
      .filter((t) => t.scope === scope.level)
      .map((t) => resolveTableConfig(t.code, projectId)!)
      .filter((t) => !t.hidden);
    return {
      scope,
      label,
      tables: levelTables,
      folders: folders.filter((f) => sameScope(f.scope, scope)).map((folder) => ({ folder, pages: [] })),
      pages: [],
      personal: [],
    };
  };

  const company: NavLevel = { ...levelFor(COMPANY, 'Company'), multiProject: [] };
  const projectLevels = visibleProjects.map((p) => levelFor({ level: 'project', projectId: p.id }, p.name));
  const levels = [company, ...projectLevels];

  for (const page of pages) {
    if (!page.shared && page.ownerId !== viewerId) continue;
    const scope = resolvePageScope(page);
    const level = levels.find((l) => sameScope(l.scope, scope));
    if (!level) continue;

    if (!page.shared) {
      level.personal.push(page);
    } else if (scope.level === 'company' && scope.multiProject) {
      company.multiProject!.push(page);
    } else {
      const folder = level.folders.find((f) => f.folder.id === page.folderId);
      (folder ? folder.pages : level.pages).push(page);
    }
  }

  return { company, projects: projectLevels };
}

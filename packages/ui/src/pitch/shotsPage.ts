import {
  assets,
  pages,
  resolveTableConfig,
  sequences,
  shots,
  statusValues,
  type ColumnSettings,
  type EffectiveField,
  type GroupLevel,
  type Shot,
  type StatusDisplay,
  type SummaryKind,
  type TablePage,
  type TableView,
} from '@sgp/mock-data';
import { formatDate } from './dates';
import { calculateField, formulaText } from './formulaValue';
import { groupByLevels, groupingFromQuery, type DataGroup, type GroupBucket } from './grouping';

const PAGE_ID = 'pg-lmp-shots';

export const SELECTED_SHOT_ID = 'sh010_30';

export const VIEW_ICON: Record<TableView, string> = {
  table: 'table',
  card: 'layout-list',
  thumb: 'layout-grid',
  kanban: 'kanban',
  gantt: 'chart-gantt',
};

export const VIEW_LABEL: Record<TableView, string> = {
  table: 'Table',
  card: 'Cards',
  thumb: 'Thumbnails',
  kanban: 'Kanban',
  gantt: 'Gantt',
};

/**
 * Table, Cards, and Thumbnails always; Gantt for the Tasks table and for tables whose has_tasks trait is on
 * in this project (every gantt is a gantt of tasks).
 */
export function viewsFor(tableCode: string, projectId: string | null): TableView[] {
  const table = resolveTableConfig(tableCode, projectId);
  const gantt = !!table && (table.code === 'Task' || !!table.traits.hasTasks);
  const views: TableView[] = ['table', 'card', 'thumb'];
  // The Last Lamplighter has Kanban turned on for Shots. Other projects have not.
  if (tableCode === 'Shot' && projectId === 'prj01') views.push('kanban');
  if (gantt) views.push('gantt');
  return views;
}

export const SUMMARY_LABEL: Record<SummaryKind, string> = {
  sum: 'Sum',
  average: 'Avg',
  min: 'Min',
  max: 'Max',
  count: 'Count',
};

export type ShotGroup = DataGroup<Shot>;

export interface ShotsPage {
  page: TablePage;
  columns: EffectiveField[];
  /** Every visible field of the table in this project (for conditions and formats). */
  fields: EffectiveField[];
  fieldByCode: (code: string) => EffectiveField | undefined;
  settings: Record<string, ColumnSettings>;
  grouping: GroupLevel[];
  groups: ShotGroup[];
  allShots: Shot[];
}

/** The Lamplighter "Shots" page: its saved query, columns, column settings, and grouped rows. */
export function getShotsPage(): ShotsPage {
  const page = pages.find((p): p is TablePage => p.id === PAGE_ID && p.type === 'table')!;
  const projectId = page.query.filters.find((f) => f.field === 'projectId')!.value as string;
  const config = resolveTableConfig('Shot', projectId)!;
  const fieldByCode = (code: string) => config.fields.find((f) => f.code === code && !f.hidden);
  const columns = (page.query.columns ?? []).map(fieldByCode).filter((f): f is EffectiveField => !!f);
  const allShots = shots.filter((s) => s.projectId === projectId);
  const fields = config.fields.filter((f) => !f.hidden);
  const grouping = groupingFromQuery(page.query);
  const base: ShotsPage = { page, columns, fields, fieldByCode, settings: page.columnSettings ?? {}, grouping, groups: [], allShots };
  return withGrouping(base, grouping);
}

const NONE: GroupBucket = { key: 'none', label: 'None', detail: '', sort: '\uffff' };

function shotBucket(shot: Shot, field: EffectiveField): GroupBucket {
  if (field.code === 'sequenceId') {
    const seq = sequences.find((item) => item.id === shot.sequenceId);
    return seq
      ? { key: seq.id, label: seq.code, detail: seq.name, sort: seq.code }
      : NONE;
  }
  const raw = shot[field.code as keyof Shot];
  if (field.type === 'status') {
    const value = statusValues.find((item) => item.code === String(raw ?? ''));
    const order = field.validValues?.indexOf(String(raw ?? '')) ?? -1;
    return { key: String(raw || 'none'), label: value?.label ?? 'None', detail: '', sort: order < 0 ? 999 : order };
  }
  if (raw == null || raw === '') return NONE;
  if (typeof raw === 'number') return { key: String(raw), label: String(raw), detail: '', sort: raw };
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return { key: raw.slice(0, 10), label: formatDate(raw.slice(0, 10)), detail: '', sort: raw.slice(0, 10) };
  }
  const label = shotCellText(field, shot);
  return { key: label || 'none', label: label || 'None', detail: '', sort: (label || '\uffff').toLowerCase() };
}

/** Groups the page's shots. A Sequence level still lists every sequence in the project, including an empty one. */
export function withGrouping(page: ShotsPage, grouping: GroupLevel[]): ShotsPage {
  const projectId = page.page.query.filters.find((filter) => filter.field === 'projectId')?.value as string | undefined;
  const valueOf = (shot: Shot, code: string) => {
    const field = page.fields.find((item) => item.code === code) ?? page.fieldByCode(code);
    return field ? shotBucket(shot, field) : NONE;
  };
  let groups = groupByLevels(page.allShots, grouping, valueOf);
  if (grouping[0]?.field === 'sequenceId' && projectId) {
    const byId = new Map(groups.map((group) => [group.id, group]));
    const seqs = sequences.filter((seq) => seq.projectId === projectId);
    const ordered = grouping[0].direction === 'desc' ? [...seqs].reverse() : seqs;
    const seeded = ordered.map(
      (seq) =>
        byId.get(`sequenceId:${seq.id}`) ?? {
          id: `sequenceId:${seq.id}`,
          label: seq.code,
          detail: seq.name,
          depth: 0,
          rows: [] as Shot[],
          children: [],
        },
    );
    const known = new Set(seeded.map((group) => group.id));
    groups = [...seeded, ...groups.filter((group) => !known.has(group.id))];
  }
  return { ...page, grouping, groups };
}

export function summarize(kind: SummaryKind, values: number[]) {
  if (kind === 'count') return values.length;
  if (values.length === 0) return 0;
  if (kind === 'sum') return values.reduce((a, b) => a + b, 0);
  if (kind === 'average') return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  return kind === 'min' ? Math.min(...values) : Math.max(...values);
}

/** Configured column summaries for a set of rows, in column order. */
export function summariesFor(shotsPage: ShotsPage, rows: Shot[]) {
  return shotsPage.columns
    .filter((col) => shotsPage.settings[col.code]?.summary)
    .map((col) => {
      const kind = shotsPage.settings[col.code]!.summary!;
      const field = shotsPage.fieldByCode(col.code) ?? col;
      const values = rows.flatMap((row) => {
        const raw = field.type === 'calculated' ? calculateField(field, row as unknown as Record<string, unknown>, shotsPage.fields) : row[field.code as keyof Shot];
        return typeof raw === 'number' ? [raw] : [];
      });
      return { field: col, kind, value: summarize(kind, values) };
    });
}

export { formatDate };

/** Overlay values typed into cells, then regroup so summaries and formulas see them. */
export function withShotPatches(page: ShotsPage, patches: Record<string, Partial<Shot>>): ShotsPage {
  if (Object.keys(patches).length === 0) return page;
  const allShots = page.allShots.map((shot) => (patches[shot.id] ? { ...shot, ...patches[shot.id] } : shot));
  return { ...page, allShots };
}

/** The shots page plus records created or deleted during this session, grouped the same way. */
export function withShotEdits(page: ShotsPage, added: Shot[], removedIds: string[]): ShotsPage {
  if (added.length === 0 && removedIds.length === 0) return page;
  const removed = new Set(removedIds);
  const extras = added.filter((s) => !removed.has(s.id));
  const allShots = [...page.allShots.filter((s) => !removed.has(s.id)), ...extras];
  return withGrouping({ ...page, allShots }, page.grouping);
}

/** The text a shot cell shows, for copy and CSV export. */
export function shotCellText(field: EffectiveField, shot: Shot, statusDisplay: StatusDisplay = 'long', fields: EffectiveField[] = [field]) {
  if (field.type === 'media') return '';
  if (field.type === 'calculated') {
    const value = calculateField(field, shot as unknown as Record<string, unknown>, fields);
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return formatDate(value.slice(0, 10));
    return formulaText(value);
  }
  const raw = shot[field.code as keyof Shot];
  if (field.type === 'status') {
    const value = statusValues.find((s) => s.code === shot.status);
    if (!value) return shot.status;
    return statusDisplay === 'long' ? value.label : value.shortLabel;
  }
  if (field.code === 'assetIds') return assetNames(shot.assetIds, 20);
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return formatDate(raw.slice(0, 10));
  if (raw == null || raw === '') return '';
  return String(raw);
}

/** A pasted record's value for a unique field: "020_0010 copy", then "020_0010 copy 2". */
export function uniqueCopy(value: string, taken: Set<string>) {
  let name = `${value} copy`;
  let n = 2;
  while (taken.has(name)) name = `${value} copy ${n++}`;
  taken.add(name);
  return name;
}

export function assetNames(ids: string[], max = 2) {
  const names = ids.map((id) => assets.find((a) => a.id === id)?.name ?? id);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
}

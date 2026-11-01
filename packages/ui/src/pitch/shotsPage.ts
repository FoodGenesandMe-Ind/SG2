import {
  assets,
  pages,
  resolveTableConfig,
  sequences,
  shots,
  type ColumnSettings,
  type EffectiveField,
  type Sequence,
  type Shot,
  type SummaryKind,
  type TablePage,
  type TableView,
} from '@sgp/mock-data';

const PAGE_ID = 'pg-lmp-shots';

export const SELECTED_SHOT_ID = 'sh010_30';

export const VIEW_ICON: Record<TableView, string> = {
  table: 'table',
  card: 'layout-list',
  thumb: 'layout-grid',
};

export const VIEW_LABEL: Record<TableView, string> = {
  table: 'Table',
  card: 'Cards',
  thumb: 'Thumbnails',
};

export const SUMMARY_LABEL: Record<SummaryKind, string> = {
  sum: 'Sum',
  average: 'Avg',
  min: 'Min',
  max: 'Max',
  count: 'Count',
};

export interface ShotsPage {
  page: TablePage;
  columns: EffectiveField[];
  fieldByCode: (code: string) => EffectiveField | undefined;
  settings: Record<string, ColumnSettings>;
  groups: Array<{ seq: Sequence; rows: Shot[] }>;
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
  const groups = sequences
    .filter((seq) => seq.projectId === projectId)
    .map((seq) => ({ seq, rows: allShots.filter((s) => s.sequenceId === seq.id) }));
  return { page, columns, fieldByCode, settings: page.columnSettings ?? {}, groups, allShots };
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
      const values = rows.map((r) => r[col.code as keyof Shot]).filter((v): v is number => typeof v === 'number');
      return { field: col, kind, value: summarize(kind, values) };
    });
}

export function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function assetNames(ids: string[], max = 2) {
  const names = ids.map((id) => assets.find((a) => a.id === id)?.name ?? id);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
}

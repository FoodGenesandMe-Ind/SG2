import { resolveTableConfig, type ColumnSettings, type ConditionalFormat, type GroupLevel, type StatusDisplay, type TablePage, type TableView } from '@sgp/mock-data';
import type { GanttLayout } from './Gantt';
import { groupingFromQuery, groupingLabel } from './grouping';
import { VIEW_LABEL } from './shotsPage';
import { sameWrap, type WrapByPlace } from './wrap';
import { SHOT_VIEWS, VIEW_NAME, type ViewDisplays } from './viewDisplay';

/** Everything a user can change on a table page without editing its query. Saved with the page. */
export interface PageLayout {
  view: TableView;
  columns: string[];
  widths: Record<string, number>;
  statusDisplay: StatusDisplay;
  thumbSize: number;
  cardColumns: number;
  /** Fields shown in the body of each card, in page-column order. */
  cardBody: string[];
  /** Thumbnail fields drawn on the image, and those drawn under it. */
  thumbInside: string[];
  thumbBelow: string[];
  zoom: number;
  gantt: GanttLayout;
  formats: ConditionalFormat[];
  /** Ordered grouping of this page's own records. Empty means those records are not grouped. */
  grouping: GroupLevel[];
  /**
   * Grouping of the gantt, which is a table of tasks when this page's table has tasks and is not Task.
   * Empty means that gantt is not grouped. The Tasks page leaves this unused and uses `grouping` for every view.
   */
  taskGrouping: GroupLevel[];
  /** How many kanban columns are on screen at once, which field stacks them, and which fields each card shows. */
  kanbanColumns: number;
  kanbanField: string;
  kanbanBody: string[];
  /** Order of records within each group. Empty keeps the order they were created in. */
  sort: GroupLevel[];
  /** Fields in the card header and the kanban card header. */
  cardHeader: string[];
  kanbanHeader: string[];
  /** Kanban card order set by dropping cards where they go. Empty follows the page sort. */
  kanbanOrder: string[];
  /** Text fields that wrap, per place (table, card header, card body, and so on). */
  wrap: WrapByPlace;
  /** Display settings each view keeps for itself; a view without its own follows the page. */
  viewDisplay: ViewDisplays;
  /** Views the page offers; absent means every view the table supports. */
  enabledViews?: TableView[];
  /** Cards and kanban cards show the thumbnail in their header; only the thumbnail view always shows it. */
  cardThumb?: boolean;
  kanbanThumb?: boolean;
}

const DEFAULT_HEADER = ['code', 'status'];

function projectIdOf(page: TablePage) {
  const value = page.query.filters.find((filter) => filter.field === 'projectId')?.value;
  return typeof value === 'string' ? value : null;
}

/** A gantt on a shots or assets page is tasks, so it keeps a grouping of its own. It starts grouped by the linked record. */
function taskGroupingFromPage(page: TablePage): GroupLevel[] {
  if (page.ganttSettings?.taskGrouping !== undefined) return page.ganttSettings.taskGrouping;
  const table = resolveTableConfig(page.query.table, projectIdOf(page));
  if (table && table.code !== 'Task' && table.traits.hasTasks) return [{ field: 'entityId', direction: 'asc' }];
  return [];
}

/** Fills task grouping when an in-memory layout was created before gantt grouping existed. */
export function completeLayout(layout: PageLayout, page?: TablePage): PageLayout {
  const taskGrouping = layout.taskGrouping !== undefined ? layout.taskGrouping : page ? taskGroupingFromPage(page) : [];
  const kanbanColumns = layout.kanbanColumns ?? page?.kanban?.columns ?? 4;
  const kanbanField = layout.kanbanField ?? page?.kanban?.field ?? 'status';
  const kanbanBody = layout.kanbanBody ?? page?.kanban?.fields ?? page?.cardSettings?.expandedFields ?? [];
  const sort = layout.sort ?? page?.query.sort ?? [];
  const cardHeader = layout.cardHeader ?? page?.cardSettings?.titleFields ?? DEFAULT_HEADER;
  const kanbanHeader = layout.kanbanHeader ?? page?.kanban?.headerFields ?? page?.cardSettings?.titleFields ?? DEFAULT_HEADER;
  const kanbanOrder = layout.kanbanOrder ?? page?.kanban?.order ?? [];
  const wrap = layout.wrap ?? page?.wrapFields ?? {};
  const viewDisplay = layout.viewDisplay ?? page?.viewDisplay ?? {};
  if (
    layout.taskGrouping === taskGrouping &&
    layout.kanbanColumns === kanbanColumns &&
    layout.kanbanField === kanbanField &&
    layout.kanbanBody === kanbanBody &&
    layout.sort === sort &&
    layout.cardHeader === cardHeader &&
    layout.kanbanHeader === kanbanHeader &&
    layout.kanbanOrder === kanbanOrder &&
    layout.wrap === wrap &&
    layout.viewDisplay === viewDisplay
  ) {
    return layout;
  }
  return { ...layout, taskGrouping, kanbanColumns, kanbanField, kanbanBody, sort, cardHeader, kanbanHeader, kanbanOrder, wrap, viewDisplay };
}

export function layoutFromPage(page: TablePage, overrides: Partial<PageLayout> = {}): PageLayout {
  const settings = page.columnSettings ?? {};
  const widths: Record<string, number> = {};
  for (const [code, s] of Object.entries(settings)) if (s.width) widths[code] = s.width;
  return {
    view: page.view,
    columns: page.query.columns ?? [],
    widths,
    statusDisplay: settings.status?.statusDisplay ?? 'long',
    thumbSize: page.thumbSettings?.size ?? 192,
    cardColumns: page.cardSettings?.columns ?? 4,
    cardBody: page.cardSettings?.expandedFields ?? [],
    thumbInside: page.thumbSettings?.overlayFields ?? [],
    thumbBelow: page.thumbSettings?.captionFields ?? [],
    zoom: page.ganttSettings?.zoom ?? 30,
    gantt: {
      order: page.ganttSettings?.columns,
      widths: page.ganttSettings?.columnWidths,
      pane: page.ganttSettings?.paneWidth,
      shown: page.ganttSettings?.shownColumns,
      sort: page.ganttSettings?.sort,
    },
    formats: page.conditionalFormats ?? [],
    grouping: groupingFromQuery(page.query),
    taskGrouping: taskGroupingFromPage(page),
    kanbanColumns: page.kanban?.columns ?? 4,
    kanbanField: page.kanban?.field ?? 'status',
    kanbanBody: page.kanban?.fields ?? page.cardSettings?.expandedFields ?? [],
    sort: page.query.sort ?? [],
    cardHeader: page.cardSettings?.titleFields ?? DEFAULT_HEADER,
    kanbanHeader: page.kanban?.headerFields ?? page.cardSettings?.titleFields ?? DEFAULT_HEADER,
    kanbanOrder: page.kanban?.order ?? [],
    wrap: page.wrapFields ?? {},
    viewDisplay: page.viewDisplay ?? {},
    enabledViews: page.enabledViews,
    cardThumb: page.cardSettings?.showThumbnail ?? true,
    kanbanThumb: page.kanban?.showThumbnail ?? true,
    ...overrides,
  };
}

/** A copy of the page carrying this layout, as it would be written on save. */
export function pageWithLayout(page: TablePage, layout: PageLayout, changes: Partial<TablePage> = {}): TablePage {
  const columnSettings: Record<string, ColumnSettings> = {};
  for (const [code, s] of Object.entries(page.columnSettings ?? {})) {
    const { width: _width, ...rest } = s;
    columnSettings[code] = rest;
  }
  for (const [code, width] of Object.entries(layout.widths)) columnSettings[code] = { ...columnSettings[code], width };
  columnSettings.status = { ...columnSettings.status, statusDisplay: layout.statusDisplay };
  return {
    ...page,
    view: layout.view,
    query: { ...page.query, columns: layout.columns, grouping: layout.grouping, groupBy: layout.grouping[0]?.field, sort: layout.sort ?? [] },
    columnSettings,
    conditionalFormats: layout.formats,
    cardSettings: page.cardSettings && {
      ...page.cardSettings,
      columns: layout.cardColumns,
      expandedFields: layout.cardBody,
      titleFields: layout.cardHeader ?? page.cardSettings.titleFields,
      showThumbnail: layout.cardThumb ?? true,
    },
    thumbSettings: page.thumbSettings && {
      ...page.thumbSettings,
      size: layout.thumbSize,
      captionFields: layout.thumbBelow,
      overlayFields: layout.thumbInside,
    },
    ganttSettings: page.ganttSettings && {
      ...page.ganttSettings,
      zoom: layout.zoom,
      columns: layout.gantt.order,
      columnWidths: layout.gantt.widths,
      paneWidth: layout.gantt.pane,
      shownColumns: layout.gantt.shown,
      sort: layout.gantt.sort,
      taskGrouping: layout.taskGrouping,
    },
    wrapFields: layout.wrap ?? {},
    viewDisplay: layout.viewDisplay ?? {},
    enabledViews: layout.enabledViews,
    kanban: {
      field: layout.kanbanField,
      columns: layout.kanbanColumns,
      fields: layout.kanbanBody,
      headerFields: layout.kanbanHeader,
      order: layout.kanbanOrder,
      showThumbnail: layout.kanbanThumb ?? true,
    },
    ...changes,
  };
}

/** What differs from the saved page, in words, for the Page menu. Empty means the page is clean. */
export function layoutChanges(saved: PageLayout, draft: PageLayout, labelOf: (code: string) => string): string[] {
  const changes: string[] = [];
  if (saved.view !== draft.view) changes.push(`View: ${VIEW_LABEL[draft.view]}`);
  if (saved.columns.join() !== draft.columns.join()) changes.push('Column order');
  const resized = [...new Set([...Object.keys(saved.widths), ...Object.keys(draft.widths)])].filter(
    (code) => saved.widths[code] !== draft.widths[code],
  );
  if (resized.length) changes.push(`Width: ${resized.map(labelOf).join(', ')}`);
  if (saved.statusDisplay !== draft.statusDisplay) changes.push('Status display');
  if (saved.thumbSize !== draft.thumbSize) changes.push('Thumbnail size');
  if (saved.cardColumns !== draft.cardColumns) changes.push('Card columns');
  if (saved.cardBody.join() !== draft.cardBody.join()) changes.push('Card body fields');
  if ((saved.cardHeader ?? DEFAULT_HEADER).join() !== (draft.cardHeader ?? DEFAULT_HEADER).join()) changes.push('Card header fields');
  if ((saved.kanbanHeader ?? DEFAULT_HEADER).join() !== (draft.kanbanHeader ?? DEFAULT_HEADER).join()) changes.push('Kanban header fields');
  if ((saved.kanbanOrder ?? []).join() !== (draft.kanbanOrder ?? []).join()) changes.push('Kanban card order');
  if (saved.thumbInside.join() !== draft.thumbInside.join() || saved.thumbBelow.join() !== draft.thumbBelow.join()) changes.push('Thumbnail fields');
  if (saved.zoom !== draft.zoom) changes.push('Gantt time scale');
  if ((saved.gantt.order ?? []).join() !== (draft.gantt.order ?? []).join()) changes.push('Gantt column order');
  if (JSON.stringify(saved.gantt.widths ?? {}) !== JSON.stringify(draft.gantt.widths ?? {})) changes.push('Gantt column widths');
  if (saved.gantt.pane !== draft.gantt.pane) changes.push('Gantt divider');
  if ((saved.gantt.shown ?? []).join() !== (draft.gantt.shown ?? []).join()) changes.push('Gantt task columns');
  if (JSON.stringify(saved.gantt.sort ?? []) !== JSON.stringify(draft.gantt.sort ?? [])) changes.push('Gantt sort');
  if (!sameWrap(saved.wrap, draft.wrap)) changes.push('Wrap text');
  if ((saved.enabledViews ?? []).join() !== (draft.enabledViews ?? []).join()) changes.push('Views enabled');
  if ((saved.cardThumb ?? true) !== (draft.cardThumb ?? true)) changes.push('Card thumbnail');
  if ((saved.kanbanThumb ?? true) !== (draft.kanbanThumb ?? true)) changes.push('Kanban card thumbnail');
  for (const view of SHOT_VIEWS) {
    if (JSON.stringify(saved.viewDisplay?.[view] ?? {}) !== JSON.stringify(draft.viewDisplay?.[view] ?? {})) changes.push(`${VIEW_NAME[view]} view display`);
  }
  if (JSON.stringify(saved.formats) !== JSON.stringify(draft.formats)) changes.push('Conditional formatting');
  if (JSON.stringify(saved.grouping) !== JSON.stringify(draft.grouping)) {
    changes.push(draft.grouping.length ? `Grouping: ${groupingLabel(draft.grouping, labelOf)}` : 'Grouping: none');
  }
  if (JSON.stringify(saved.taskGrouping ?? []) !== JSON.stringify(draft.taskGrouping ?? [])) {
    changes.push(draft.taskGrouping.length ? `Gantt grouping: ${groupingLabel(draft.taskGrouping, labelOf)}` : 'Gantt grouping: none');
  }
  if (JSON.stringify(saved.sort ?? []) !== JSON.stringify(draft.sort ?? [])) {
    changes.push(draft.sort?.length ? `Sort: ${groupingLabel(draft.sort, labelOf)}` : 'Sort: none');
  }
  if ((saved.kanbanField ?? 'status') !== (draft.kanbanField ?? 'status')) changes.push(`Kanban field: ${labelOf(draft.kanbanField)}`);
  if ((saved.kanbanColumns ?? 4) !== (draft.kanbanColumns ?? 4)) changes.push(`Kanban columns: ${draft.kanbanColumns}`);
  if ((saved.kanbanBody ?? []).join() !== (draft.kanbanBody ?? []).join()) changes.push('Kanban fields');
  return changes;
}

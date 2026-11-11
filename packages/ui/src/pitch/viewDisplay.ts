import type { TableView, ViewDisplay } from '@sgp/mock-data';

/** Views of a page's own records. The gantt is a view of their tasks and keeps its own settings. */
export type ShotView = 'table' | 'card' | 'thumb' | 'kanban';
export type ViewDisplays = Partial<Record<ShotView, ViewDisplay>>;

export const SHOT_VIEWS: ShotView[] = ['table', 'card', 'thumb', 'kanban'];

export const VIEW_NAME: Record<TableView, string> = { table: 'Table', card: 'Card', thumb: 'Thumbnail', kanban: 'Kanban', gantt: 'Gantt' };

export const isShotView = (view: TableView): view is ShotView => view !== 'gantt';

/** Changes one view's display settings; a view left with no settings of its own follows the page again. */
export function withViewDisplay(all: ViewDisplays, view: ShotView, change: (current: ViewDisplay) => ViewDisplay): ViewDisplays {
  const next = change(all[view] ?? {});
  const clean = Object.fromEntries(
    Object.entries(next).filter(([, value]) => value !== undefined && !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)),
  ) as ViewDisplay;
  const { [view]: _old, ...rest } = all;
  return Object.keys(clean).length ? { ...rest, [view]: clean } : rest;
}

/** Sets or clears one field's entry in a per-field map, such as number display. */
export function withFieldEntry<T>(map: Record<string, T> | undefined, code: string, value: T | undefined): Record<string, T> | undefined {
  const { [code]: _old, ...rest } = map ?? {};
  const next = value === undefined ? rest : { ...rest, [code]: value };
  return Object.keys(next).length ? next : undefined;
}

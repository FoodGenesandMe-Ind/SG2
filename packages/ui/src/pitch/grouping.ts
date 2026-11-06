import type { GroupLevel } from '@sgp/mock-data';
import { useRef, useState } from 'react';

export interface GroupBucket {
  key: string;
  label: string;
  detail: string;
  sort: number | string;
}

export interface DataGroup<T> {
  id: string;
  label: string;
  detail: string;
  depth: number;
  rows: T[];
  children: DataGroup<T>[];
}

const NOT_GROUPABLE = new Set(['media', 'multi-entity', 'todos']);

export function isGroupable(type: string) {
  return !NOT_GROUPABLE.has(type);
}

/** The Tasks page is shown grouped by department, then pipeline step. Other pages use their saved query. */
export function groupingFromQuery(query: { table: string; groupBy?: string; grouping?: GroupLevel[] }): GroupLevel[] {
  if (query.grouping?.length) return query.grouping;
  if (query.table === 'Task') {
    return [
      { field: 'departmentId', direction: 'asc' },
      { field: 'stepId', direction: 'asc' },
    ];
  }
  return query.groupBy ? [{ field: query.groupBy, direction: 'asc' }] : [];
}

export function isDepartmentThenStep(levels: GroupLevel[]) {
  return (
    levels.length === 2 &&
    levels[0].field === 'departmentId' &&
    levels[0].direction === 'asc' &&
    levels[1].field === 'stepId' &&
    levels[1].direction === 'asc'
  );
}

export function groupingLabel(levels: GroupLevel[] | undefined, labelOf: (field: string) => string) {
  return (levels ?? []).map((level) => labelOf(level.field)).join(', ');
}

/** Fields a gantt of tasks can group by. `linkLabel` is Shot or Asset, the record the tasks belong to. */
export function taskGroupFields(linkLabel: string) {
  return [
    { code: 'entityId', label: linkLabel },
    { code: 'departmentId', label: 'Department' },
    { code: 'stepId', label: 'Pipeline step' },
    { code: 'assigneeId', label: 'Assigned to' },
    { code: 'status', label: 'Status' },
    { code: 'startDate', label: 'Start' },
    { code: 'dueDate', label: 'Due' },
    { code: 'name', label: 'Task' },
  ];
}

/** The saved gantt default: one ascending group on the record the tasks are linked to. */
export function isGroupedByLink(levels: GroupLevel[]) {
  return levels.length === 1 && levels[0].field === 'entityId' && levels[0].direction === 'asc';
}

/** How a gantt should read a saved task grouping. The shot default keeps the shot group rows. */
export function ganttGroupingProps(levels: GroupLevel[] | undefined, preferShotGroups: boolean): { grouping: 'shot' | 'none' | 'department'; levels?: GroupLevel[] } {
  const rows = levels ?? (preferShotGroups ? [{ field: 'entityId', direction: 'asc' as const }] : []);
  if (rows.length === 0) return { grouping: 'none' };
  if (preferShotGroups && isGroupedByLink(rows)) return { grouping: 'shot' };
  return { grouping: 'department', levels: rows };
}

function compare(a: number | string, b: number | string) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

/** Stack records by each level in order. Empty levels mean no groups. A blank value is its own group, named None, and sorts last when ascending. */
export function groupByLevels<T>(
  items: T[],
  levels: GroupLevel[],
  valueOf: (item: T, field: string) => GroupBucket,
  parentId = '',
  depth = 0,
): DataGroup<T>[] {
  if (levels.length === 0) return [];
  const [level, ...rest] = levels;
  const map = new Map<string, { bucket: GroupBucket; items: T[] }>();
  for (const item of items) {
    const bucket = valueOf(item, level.field);
    const existing = map.get(bucket.key);
    if (existing) existing.items.push(item);
    else map.set(bucket.key, { bucket, items: [item] });
  }
  const sorted = [...map.values()].sort((a, b) => compare(a.bucket.sort, b.bucket.sort) || a.bucket.label.localeCompare(b.bucket.label));
  if (level.direction === 'desc') sorted.reverse();
  return sorted.map(({ bucket, items: rows }) => {
    const id = `${parentId}${level.field}:${bucket.key}`;
    return {
      id,
      label: bucket.label,
      detail: bucket.detail,
      depth,
      rows,
      children: groupByLevels(rows, rest, valueOf, `${id}/`, depth + 1),
    };
  });
}

export function allGroupIds<T>(groups: DataGroup<T>[]): string[] {
  return groups.flatMap((group) => [group.id, ...allGroupIds(group.children)]);
}

/** Every group at one depth, including groups under a collapsed parent. */
export function idsAtDepth<T>(groups: DataGroup<T>[], depth: number): string[] {
  const ids: string[] = [];
  const walk = (list: DataGroup<T>[], at: number) => {
    for (const group of list) {
      if (at === depth) ids.push(group.id);
      else walk(group.children, at + 1);
    }
  };
  walk(groups, 0);
  return ids;
}

/** Open ids. Resets when resetKey changes, so a new grouping starts expanded. */
export function useOpenSet(ids: string[], resetKey: string) {
  const [open, setOpen] = useState(() => new Set(ids));
  const prev = useRef(resetKey);
  if (prev.current !== resetKey) {
    prev.current = resetKey;
    setOpen(new Set(ids));
  }
  const toggle = (id: string, event?: { metaKey: boolean; ctrlKey: boolean }, allIds?: string[]) => {
    if (event && (event.metaKey || event.ctrlKey) && allIds) {
      setOpen((current) => (allIds.every((item) => current.has(item)) ? new Set([...current].filter((item) => !allIds.includes(item))) : new Set([...current, ...allIds])));
      return;
    }
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return [open, toggle] as const;
}

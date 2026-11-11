import type { GroupLevel } from '@sgp/mock-data';
import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useReorder } from './reorder';

const MAX_LEVELS = 10;
const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

interface DraftLevel extends GroupLevel {
  key: string;
}

let levelKey = 0;
function keyed(level: GroupLevel): DraftLevel {
  levelKey += 1;
  return { ...level, key: `level-${levelKey}` };
}

const plain = (rows: GroupLevel[]) => rows.map(({ field, direction }) => ({ field, direction }));
const orderOf = (rows: GroupLevel[]) => JSON.stringify(plain(rows));

export interface GroupField {
  code: string;
  label: string;
}

/**
 * An ordered list of fields, each ascending or descending, reordered by dragging a grip.
 * Used for grouping (up to ten levels) and for sorting (no limit).
 */
function LevelList({
  name,
  rows,
  onRows,
  fields,
  firstLabel,
  nextLabel,
  max,
  addLabel,
  empty,
}: {
  name: string;
  rows: DraftLevel[];
  onRows: (rows: DraftLevel[]) => void;
  fields: GroupField[];
  firstLabel: string;
  nextLabel: string;
  max?: number;
  addLabel: string;
  empty: string;
}) {
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const reorder = useReorder({
    ids: rows.map((row) => row.key),
    onReorder: (keys) => set(keys.map((key) => rowsRef.current.find((row) => row.key === key)!)),
  });
  const used = new Set(rows.map((level) => level.field));
  const unused = fields.filter((field) => !used.has(field.code));
  const full = max !== undefined && rows.length >= max;
  const set = (next: DraftLevel[]) => {
    rowsRef.current = next;
    onRows(next);
  };
  const update = (key: string, change: Partial<GroupLevel>) => set(rowsRef.current.map((row) => (row.key === key ? { ...row, ...change } : row)));
  const labelOf = (code: string) => fields.find((field) => field.code === code)?.label ?? 'level';

  return (
    <div className="flex flex-col gap-2" data-level-list={name}>
      {rows.length === 0 && <p className="text-sm text-fg-subtle">{empty}</p>}
      <div ref={reorder.listRef} className="relative flex flex-col gap-2">
      {reorder.indicator}
      {rows.map((level, index) => {
        const options = fields.filter((field) => field.code === level.field || !used.has(field.code));
        return (
          <div key={level.key} {...reorder.itemProps(level.key)} data-level className={`flex items-center gap-2 rounded-md transition-opacity ${reorder.dimClass(level.key)}`}>
            <button
              className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg active:cursor-grabbing"
              aria-label={`Drag ${labelOf(level.field)} to reorder`}
              title="Drag to reorder"
              onPointerDown={(event) => reorder.startDrag(level.key, event)}
            >
              <Icon name="grip-vertical" size={14} />
            </button>
            <span className="w-16 shrink-0 text-sm text-fg-muted">{index === 0 ? firstLabel : nextLabel}</span>
            <select
              aria-label={index === 0 ? firstLabel : `${nextLabel} ${index}`}
              className={`${control} flex-1`}
              style={height}
              value={level.field}
              onChange={(event) => update(level.key, { field: event.target.value })}
            >
              {options.map((field) => (
                <option key={field.code} value={field.code}>
                  {field.label}
                </option>
              ))}
            </select>
            <select
              aria-label="Direction"
              className={`${control} w-36 shrink-0`}
              style={height}
              value={level.direction}
              onChange={(event) => update(level.key, { direction: event.target.value as GroupLevel['direction'] })}
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
            <button
              className="flex size-7 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-danger"
              aria-label={`Remove ${labelOf(level.field)}`}
              onClick={() => set(rowsRef.current.filter((row) => row.key !== level.key))}
            >
              <Icon name="x" size={14} />
            </button>
          </div>
        );
      })}
      </div>
      <button
        className={`mt-1 flex items-center gap-1.5 self-start rounded-md px-3 text-sm font-medium text-fg-inverse ${unused.length > 0 && !full ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
        style={height}
        disabled={unused.length === 0 || full}
        title={full ? 'Ten levels is the most' : unused.length === 0 ? 'Every field is already used' : addLabel}
        onClick={() => {
          const current = rowsRef.current;
          if (max !== undefined && current.length >= max) return;
          const taken = new Set(current.map((row) => row.field));
          const next = fields.find((field) => !taken.has(field.code));
          if (next) set([...current, keyed({ field: next.code, direction: 'asc' })]);
        }}
      >
        <Icon name="plus" /> {addLabel}
      </button>
    </div>
  );
}

/** Ordered grouping for a table page, and the sort inside each group. Apply is inactive until something changes. */
export function GroupDialog({
  levels,
  fields,
  sort,
  sortFields,
  note,
  savedWithPage = false,
  onApply,
  onClose,
}: {
  levels: GroupLevel[];
  fields: GroupField[];
  /** The current sort. When present (with sortFields), the dialog also edits it. */
  sort?: GroupLevel[];
  sortFields?: GroupField[];
  /** Where this grouping shows, when a view on the page does not use it. */
  note?: string;
  /** The grouping can be saved onto the page. Viewing it does not require that permission. */
  savedWithPage?: boolean;
  onApply: (levels: GroupLevel[], sort?: GroupLevel[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DraftLevel[]>(() => levels.map(keyed));
  const [sortDraft, setSortDraft] = useState<DraftLevel[]>(() => (sort ?? []).map(keyed));
  const sorting = sort !== undefined && sortFields !== undefined;
  const dirty = orderOf(draft) !== orderOf(levels) || (sorting && orderOf(sortDraft) !== orderOf(sort ?? []));

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-16" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Group"
        className="flex max-h-[calc(100vh-8rem)] w-[36rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <Icon name="sliders-horizontal" size={18} className="mt-0.5 text-fg-subtle" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">{sorting ? 'Group and sort' : 'Group'}</h2>
            <p className="text-sm text-fg-muted">
              {sorting ? 'Records stack in groups, and sort inside each group. Each group keeps its summary.' : 'Records stack in this order. Each group keeps its summary.'}
            </p>
          </div>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="flex flex-col gap-3 overflow-y-auto px-4 py-3">
          <section className="flex flex-col gap-2" aria-label="Grouping">
            {sorting && <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Group</h3>}
            <LevelList
              name="group"
              rows={draft}
              onRows={setDraft}
              fields={fields}
              firstLabel="Group by"
              nextLabel="Then by"
              max={MAX_LEVELS}
              addLabel="Add level"
              empty="Not grouped. Add a level to stack the records."
            />
          </section>
          {sorting && (
            <section className="flex flex-col gap-2 border-t border-line pt-3" aria-label="Sorting">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Sort</h3>
              <LevelList
                name="sort"
                rows={sortDraft}
                onRows={setSortDraft}
                fields={sortFields!}
                firstLabel="Sort by"
                nextLabel="Then by"
                addLabel="Add sort"
                empty="Not sorted. Records keep the order they were created in."
              />
            </section>
          )}
          {note && <p className="text-xs text-fg-subtle">{note}</p>}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="mr-auto text-xs text-fg-subtle">
            {dirty
              ? savedWithPage
                ? 'Applies right away. Saving the page, so everyone else opens it this way, is done from the Page menu by someone who can edit the page.'
                : 'Applies to the records in front of you. It is not saved onto the page.'
              : 'No changes to apply.'}
          </span>
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={!dirty}
            onClick={() => {
              onApply(plain(draft), sorting ? plain(sortDraft) : undefined);
              onClose();
            }}
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}

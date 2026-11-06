import type { GroupLevel } from '@sgp/mock-data';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Icon } from './Icon';

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

export interface GroupField {
  code: string;
  label: string;
}

/** Ordered grouping for a table page. Apply is inactive until the list changes. */
export function GroupDialog({
  levels,
  fields,
  note,
  savedWithPage = false,
  onApply,
  onClose,
}: {
  levels: GroupLevel[];
  fields: GroupField[];
  /** Where this grouping shows, when a view on the page does not use it. */
  note?: string;
  /** The grouping can be saved onto the page. Viewing it does not require that permission. */
  savedWithPage?: boolean;
  onApply: (levels: GroupLevel[]) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DraftLevel[]>(() => levels.map(keyed));
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const orderOf = (rows: GroupLevel[]) => JSON.stringify(rows.map(({ field, direction }) => ({ field, direction })));
  const dirty = orderOf(draft) !== orderOf(levels);
  const used = new Set(draft.map((level) => level.field));
  const unused = fields.filter((field) => !used.has(field.code));
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const update = (key: string, change: Partial<GroupLevel>) =>
    setDraft((rows) => rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

  const startDrag = (key: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    const grip = event.currentTarget;
    try {
      grip.setPointerCapture(event.pointerId);
    } catch {
      // Capture is unavailable for some synthetic events; the move listener still follows the grip.
    }
    let from = draftRef.current.findIndex((row) => row.key === key);
    setDragging(key);
    const move = (e: PointerEvent) => {
      const rows = [...grip.closest('[role=dialog]')!.querySelectorAll<HTMLElement>('[data-group-level]')];
      let target = rows.length - 1;
      for (let i = 0; i < rows.length; i++) {
        const box = rows[i].getBoundingClientRect();
        if (e.clientY < box.top + box.height / 2) {
          target = i;
          break;
        }
      }
      if (target === from) return;
      const next = [...draftRef.current];
      const [item] = next.splice(from, 1);
      next.splice(target, 0, item);
      draftRef.current = next;
      from = target;
      setDraft(next);
    };
    const stop = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', stop);
      setDragging(null);
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', stop);
  };

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
            <h2 className="text-lg font-semibold">Group</h2>
            <p className="text-sm text-fg-muted">Records stack in this order. Each group keeps its summary.</p>
          </div>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="flex flex-col gap-2 overflow-y-auto px-4 py-3">
          {draft.length === 0 && <p className="text-sm text-fg-subtle">Not grouped. Add a level to stack the records.</p>}
          {draft.map((level, index) => {
            const options = fields.filter((field) => field.code === level.field || !used.has(field.code));
            return (
              <div key={level.key} data-group-level className={`flex items-center gap-2 rounded-md ${dragging === level.key ? 'bg-row-hover' : ''}`}>
                <button
                  className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg active:cursor-grabbing"
                  aria-label={`Drag ${fields.find((field) => field.code === level.field)?.label ?? 'level'} to reorder`}
                  title="Drag to reorder"
                  onPointerDown={(event) => startDrag(level.key, event)}
                >
                  <Icon name="grip-vertical" size={14} />
                </button>
                <span className="w-16 shrink-0 text-sm text-fg-muted">{index === 0 ? 'Group by' : 'Then by'}</span>
                <select
                  aria-label={index === 0 ? 'Group by' : `Then by ${index}`}
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
                  aria-label={`Remove ${fields.find((field) => field.code === level.field)?.label ?? 'level'}`}
                  onClick={() => setDraft((rows) => rows.filter((row) => row.key !== level.key))}
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            );
          })}
          <button
            className={`mt-1 flex items-center gap-1.5 self-start rounded-md px-3 text-sm font-medium text-fg-inverse ${unused.length > 0 && draft.length < MAX_LEVELS ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={unused.length === 0 || draft.length >= MAX_LEVELS}
            title={draft.length >= MAX_LEVELS ? 'Ten levels is the most' : unused.length === 0 ? 'Every field is already used' : 'Add a grouping level'}
            onClick={() => {
              const rows = draftRef.current;
              if (rows.length >= MAX_LEVELS) return;
              const taken = new Set(rows.map((row) => row.field));
              const next = fields.find((field) => !taken.has(field.code));
              if (!next) return;
              const updated = [...rows, keyed({ field: next.code, direction: 'asc' })];
              draftRef.current = updated;
              setDraft(updated);
            }}
          >
            <Icon name="plus" /> Add level
          </button>
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
              onApply(draft.map(({ field, direction }) => ({ field, direction })));
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

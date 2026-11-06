import type { Shot, StatusDisplay } from '@sgp/mock-data';
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Icon } from './Icon';
import { shotCellText, uniqueCopy, type ShotsPage } from './shotsPage';

export interface ShotClip {
  columns: { code: string; label: string }[];
  rows: { id: string; cells: string[] }[];
  records: Shot[];
}

let clip: ShotClip | null = null;
const listeners = new Set<() => void>();

function publish(next: ShotClip | null) {
  clip = next;
  listeners.forEach((listen) => listen());
}

/** Records copied in this session. Paste is offered wherever the page has blank space. */
export function useCopiedShots() {
  const [value, setValue] = useState(clip);
  useEffect(() => {
    const sync = () => setValue(clip);
    listeners.add(sync);
    return () => {
      listeners.delete(sync);
    };
  }, []);
  return value;
}

export function shotClip(page: ShotsPage, shots: Shot[], statusDisplay: StatusDisplay): ShotClip {
  const columns = page.columns.filter((c) => c.type !== 'media');
  return {
    columns: columns.map((c) => ({ code: c.code, label: c.label })),
    rows: shots.map((shot) => ({ id: shot.id, cells: columns.map((c) => shotCellText(c, shot, statusDisplay)) })),
    records: shots,
  };
}

export function copyShots(page: ShotsPage, shots: Shot[], statusDisplay: StatusDisplay) {
  const copied = shotClip(page, shots, statusDisplay);
  const text = [copied.columns.map((c) => c.label).join('\t'), ...copied.rows.map((r) => r.cells.join('\t'))].join('\n');
  navigator.clipboard?.writeText(text).catch(() => undefined);
  publish(copied);
}

export function exportShotsCsv(copied: ShotClip) {
  const esc = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);
  const lines = [copied.columns.map((c) => esc(c.label)).join(','), ...copied.rows.map((r) => r.cells.map(esc).join(','))];
  const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'shots.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export interface PastePreview {
  source: Shot;
  /** Field code to the renamed value, for fields set unique. */
  renamed: Record<string, string>;
}

/** New shots from a paste: fresh ids and reserved fields, and " copy" on fields set unique. */
export function planPaste(records: Shot[], existing: Shot[], page: ShotsPage, viewerId: string): { shots: Shot[]; preview: PastePreview[] } {
  const taken: Record<string, Set<string>> = {};
  for (const field of page.fields) {
    if (!field.unique) continue;
    taken[field.code] = new Set(existing.map((s) => String(s[field.code as keyof Shot] ?? '')));
  }
  const now = new Date().toISOString();
  const preview: PastePreview[] = [];
  const shots = records.map((source, i) => {
    const renamed: Record<string, string> = {};
    const shot: Shot = {
      ...source,
      id: `sh-paste-${now.slice(11, 19).replace(/:/g, '')}-${i}`,
      createdAt: now,
      createdById: viewerId,
      updatedAt: now,
      updatedById: viewerId,
    };
    for (const code of Object.keys(taken)) {
      const next = uniqueCopy(String(source[code as keyof Shot] ?? ''), taken[code]);
      renamed[code] = next;
      (shot as unknown as Record<string, unknown>)[code] = next;
    }
    preview.push({ source, renamed });
    return shot;
  });
  return { shots, preview };
}

/** Right-click on a shot row acts on the whole selection; right-click on empty space can paste. */
export function onShotSurfaceContextMenu(
  event: ReactMouseEvent,
  allShots: Shot[],
  isSelected: (id: string) => boolean,
  actions: { onRecords: (event: ReactMouseEvent, shots: Shot[]) => void; onBlank: (event: ReactMouseEvent) => void },
) {
  const target = event.target as HTMLElement;
  if (target.closest('[role=columnheader], [role=separator]')) return;
  event.preventDefault();
  event.stopPropagation();
  const row = target.closest<HTMLElement>('[data-shot-id]');
  if (!row) {
    if (target.closest('[data-block]')) return;
    actions.onBlank(event);
    return;
  }
  const shot = allShots.find((s) => s.id === row.dataset.shotId);
  if (!shot) return;
  const selected = allShots.filter((s) => isSelected(s.id));
  actions.onRecords(event, selected.some((s) => s.id === shot.id) ? selected : [shot]);
}

const rowHeight = { height: 'var(--sgp-row-compact)' };

function useDismiss(onClose: () => void) {
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') return;
      if (event instanceof MouseEvent && (event.target as HTMLElement).closest?.('[role=menu]')) return;
      onClose();
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [onClose]);
}

export function RecordActionMenu({
  x,
  y,
  mode,
  count,
  onCopy,
  onExport,
  onDelete,
  onPaste,
  onClose,
}: {
  x: number;
  y: number;
  mode: 'records' | 'paste';
  count: number;
  onCopy?: () => void;
  onExport?: () => void;
  onDelete?: () => void;
  onPaste?: () => void;
  onClose: () => void;
}) {
  useDismiss(onClose);
  const item = 'flex w-full items-center gap-2 rounded-sm px-2 text-left text-sm hover:bg-row-hover';
  return (
    <div
      role="menu"
      aria-label={mode === 'paste' ? 'Paste records' : 'Record actions'}
      className="fixed z-50 flex w-52 flex-col rounded-md border border-line-strong bg-surface-raised p-1 text-fg"
      style={{ left: x, top: y, boxShadow: 'var(--sgp-shadow-overlay)' }}
    >
      {mode === 'records' ? (
        <>
          <button role="menuitem" className={item} style={rowHeight} onClick={onCopy}>
            <Icon name="copy" className="text-fg-subtle" /> Copy
          </button>
          <button role="menuitem" className={item} style={rowHeight} onClick={onExport}>
            <Icon name="download" className="text-fg-subtle" /> Export as .csv
          </button>
          <button role="menuitem" className={`${item} text-danger`} style={rowHeight} onClick={onDelete}>
            <Icon name="trash" /> Delete {count === 1 ? 'record' : `${count} records`}
          </button>
        </>
      ) : (
        <button role="menuitem" className={item} style={rowHeight} onClick={onPaste}>
          <Icon name="clipboard-paste" className="text-fg-subtle" /> Paste {count === 1 ? 'record' : `${count} records`}
        </button>
      )}
    </div>
  );
}

export function DeleteRecordsDialog({
  count,
  noun,
  onConfirm,
  onClose,
}: {
  count: number;
  noun: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-24" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Delete records"
        className="flex w-[28rem] flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-4"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Delete {count === 1 ? `this ${noun}` : `${count} ${noun}s`}?</h2>
        <p className="text-sm text-fg-muted">
          This deletes only {count === 1 ? 'this record' : 'these records'}. Linked records, such as tasks, notes, and versions, are not
          deleted.
        </p>
        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={rowHeight} onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md bg-danger px-3 text-sm font-medium text-fg-inverse" style={rowHeight} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export function PasteRecordsDialog({
  preview,
  noun,
  uniqueLabels,
  onConfirm,
  onClose,
}: {
  preview: PastePreview[];
  noun: string;
  /** Labels of fields set unique, in field order. */
  uniqueLabels: string[];
  onConfirm: () => void;
  onClose: () => void;
}) {
  const count = preview.length;
  const names = preview.map((p) => Object.values(p.renamed).join(', ')).filter(Boolean);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-24" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Paste records"
        className="flex w-[32rem] flex-col gap-3 rounded-lg border border-line-strong bg-surface-raised p-4"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">
          Create {count} new {count === 1 ? noun : `${noun}s`}?
        </h2>
        <p className="text-sm text-fg-muted">
          {count === 1 ? 'The new record keeps' : 'The new records keep'} the same values. Record IDs will be unique, and so will the other
          reserved fields: Date created, Created by, Date updated, and Updated by.
          {uniqueLabels.length > 0 && ` ${uniqueLabels.join(' and ')} must be unique per project, so ${count === 1 ? 'the name will be' : 'the names will be'}:`}
        </p>
        {names.length > 0 && (
          <ul className="flex max-h-32 flex-col gap-0.5 overflow-auto rounded-md bg-surface-sunken px-3 py-2 font-mono text-xs">
            {names.slice(0, 8).map((name) => (
              <li key={name}>{name}</li>
            ))}
            {names.length > 8 && <li className="text-fg-subtle">and {names.length - 8} more</li>}
          </ul>
        )}
        <div className="flex justify-end gap-2">
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={rowHeight} onClick={onClose}>
            Cancel
          </button>
          <button className="rounded-md bg-accent px-3 text-sm font-medium text-fg-inverse hover:bg-accent-hover" style={rowHeight} onClick={onConfirm}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

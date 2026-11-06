import { statusValues, type EffectiveField, type Shot } from '@sgp/mock-data';
import { useEffect, useRef, useState } from 'react';
import { formatDate, parseDateText } from './dates';
import { DatePicker } from './DatePicker';

const EDITABLE = new Set(['text', 'number', 'date', 'status', 'list']);

export function fieldEditable(field: EffectiveField) {
  return EDITABLE.has(field.type);
}

/** What the editor shows. Dates are the stored ISO day, statuses the long name. */
export function fieldEditText(field: EffectiveField, shot: Shot): string {
  const raw = shot[field.code as keyof Shot];
  if (field.type === 'date') return typeof raw === 'string' ? formatDate(raw.slice(0, 10)) : '';
  if (field.type === 'status' || field.type === 'list') {
    const code = String(raw ?? '');
    return statusValues.find((status) => status.code === code)?.label ?? code;
  }
  if (raw == null) return '';
  return String(raw);
}

function matchChoice(field: EffectiveField, text: string): string | null {
  const needle = text.trim().toLowerCase();
  if (!needle) return null;
  const allowed = field.validValues ?? [];
  const status = statusValues.find(
    (item) =>
      (allowed.length === 0 || allowed.includes(item.code)) &&
      (item.code.toLowerCase() === needle || item.label.toLowerCase() === needle || item.shortLabel.toLowerCase() === needle),
  );
  if (status) return status.code;
  return allowed.find((code) => code.toLowerCase() === needle) ?? null;
}

export function commitField(
  field: EffectiveField,
  text: string,
  shot: Shot,
  shots: Shot[],
  lock: 'open' | 'locked' | 'system',
): { ok: true; changed: boolean; patch: Partial<Shot> } | { ok: false } {
  if (!fieldEditable(field)) return { ok: false };
  const trimmed = text.trim();
  let stored: string | number | null = null;
  if (field.type === 'number') {
    if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return { ok: false };
    stored = Number(trimmed);
  } else if (field.type === 'date') {
    const iso = parseDateText(trimmed);
    if (!iso) return { ok: false };
    stored = iso;
  } else if (field.type === 'status' || field.type === 'list') {
    const code = matchChoice(field, trimmed);
    if (!code) return { ok: false };
    stored = code;
  } else if (field.type === 'text') {
    if (field.unique && trimmed === '') return { ok: false };
    if (field.unique && shots.some((item) => item.id !== shot.id && String(item[field.code as keyof Shot] ?? '').toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false };
    }
    stored = trimmed;
  } else {
    return { ok: false };
  }
  const changed = String(shot[field.code as keyof Shot] ?? '') !== String(stored ?? '');
  if (!changed) return { ok: true, changed: false, patch: {} };
  if (lock !== 'open') return { ok: false };
  return { ok: true, changed: true, patch: { [field.code]: stored } as Partial<Shot> };
}

/** The text box for one cell. Enter, Tab, and blur save. Escape cancels. */
export function CellEditor({
  value,
  numeric,
  date = false,
  onCommit,
}: {
  value: string;
  numeric: boolean;
  /** Date fields open a calendar under the cell; typing still works. */
  date?: boolean;
  onCommit: (text: string, how: 'save' | 'cancel', tab: -1 | 0 | 1) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    const input = ref.current;
    if (!input) return;
    input.focus();
    input.select();
  }, []);

  const finish = (how: 'save' | 'cancel', tab: -1 | 0 | 1 = 0, text = draft) => {
    if (done.current) return;
    done.current = true;
    onCommit(text, how, tab);
  };

  return (
    <>
    <input
      ref={ref}
      aria-label="Edit cell"
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onBlur={() => finish('save')}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          finish('cancel');
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          finish('save');
          return;
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          finish('save', event.shiftKey ? -1 : 1);
        }
      }}
      className={`h-full w-full min-w-0 bg-transparent text-sm text-fg outline outline-1 outline-accent ${numeric ? 'text-right font-mono text-xs tabular-nums' : ''}`}
      style={{ userSelect: 'text' }}
    />
    {date && <DatePicker anchorRef={ref} value={parseDateText(draft)} onPick={(iso) => finish('save', 0, formatDate(iso))} />}
    </>
  );
}

import { assets, sequences, statusValues, type EffectiveField, type Shot } from '@sgp/mock-data';
import { useEffect, useRef, useState } from 'react';
import type { ChoiceOption } from './ChoiceEditor';
import { formatDate, parseDateText } from './dates';
import { DatePicker } from './DatePicker';
import { numberEditText, parseNumberText } from './numberDisplay';

const EDITABLE = new Set(['text', 'number', 'date', 'status', 'list']);
/** Link targets the cell editor can list. */
const LINKABLE = new Set(['Asset', 'Sequence']);

export function fieldEditable(field: EffectiveField) {
  if (field.type === 'entity' || field.type === 'multi-entity') return (field.linkTo ?? []).some((table) => LINKABLE.has(table));
  return EDITABLE.has(field.type);
}

/** Pick-list fields edit in a dropdown: one value, or several shown as chips. */
export function choiceKind(field: EffectiveField): 'single' | 'multi' | null {
  if (!fieldEditable(field)) return null;
  if (field.type === 'multi-entity') return 'multi';
  if (field.type === 'status' || field.type === 'list' || field.type === 'entity') return 'single';
  return null;
}

/** The values a pick-list cell can take for this shot, in their natural order. */
export function choiceOptions(field: EffectiveField, shot: Shot): ChoiceOption[] {
  if (field.type === 'status' || field.type === 'list') {
    const allowed = field.validValues ?? [];
    return allowed.map((code) => {
      const status = statusValues.find((item) => item.code === code);
      return { id: code, label: status?.label ?? code, keywords: `${code} ${status?.shortLabel ?? ''}` };
    });
  }
  const tables = field.linkTo ?? [];
  const options: ChoiceOption[] = [];
  if (tables.includes('Sequence')) {
    for (const seq of sequences.filter((item) => item.projectId === shot.projectId)) {
      options.push({ id: seq.id, label: seq.code, keywords: seq.name, detail: seq.name });
    }
  }
  if (tables.includes('Asset')) {
    for (const asset of assets.filter((item) => item.projectId === null || item.projectId === shot.projectId)) {
      options.push({ id: asset.id, label: asset.name, detail: asset.type });
    }
  }
  return options;
}

/** The ids a pick-list cell holds now. */
export function choiceValue(field: EffectiveField, shot: Shot): string[] {
  const raw = shot[field.code as keyof Shot];
  if (Array.isArray(raw)) return raw.map(String);
  return raw == null || raw === '' ? [] : [String(raw)];
}

/** What the editor shows. Dates are the stored ISO day, statuses the long name. */
export function fieldEditText(field: EffectiveField, shot: Shot): string {
  const raw = shot[field.code as keyof Shot];
  if (field.type === 'date') return typeof raw === 'string' ? formatDate(raw.slice(0, 10)) : '';
  if (field.type === 'status' || field.type === 'list') {
    const code = String(raw ?? '');
    return statusValues.find((status) => status.code === code)?.label ?? code;
  }
  if (field.type === 'number' && typeof raw === 'number') return numberEditText(raw, field.display);
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
  input: string | string[],
  shot: Shot,
  shots: Shot[],
  lock: 'open' | 'locked' | 'system',
): { ok: true; changed: boolean; patch: Partial<Shot> } | { ok: false } {
  if (!fieldEditable(field)) return { ok: false };
  if (field.type === 'entity' || field.type === 'multi-entity') {
    const allowed = new Set(choiceOptions(field, shot).map((option) => option.id));
    const ids = (Array.isArray(input) ? input : [input]).filter(Boolean);
    if (ids.some((id) => !allowed.has(id))) return { ok: false };
    if (field.type === 'entity' && ids.length !== 1) return { ok: false };
    const stored = field.type === 'entity' ? ids[0]! : ids;
    const changed = JSON.stringify(choiceValue(field, shot)) !== JSON.stringify(field.type === 'entity' ? [stored] : stored);
    if (!changed) return { ok: true, changed: false, patch: {} };
    if (lock !== 'open') return { ok: false };
    return { ok: true, changed: true, patch: { [field.code]: stored } as Partial<Shot> };
  }
  const text = Array.isArray(input) ? (input[0] ?? '') : input;
  const trimmed = text.trim();
  let stored: string | number | null = null;
  if (field.type === 'number') {
    const number = parseNumberText(trimmed);
    if (number === null) return { ok: false };
    stored = number;
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
      className={`h-full w-full min-w-0 bg-transparent text-sm text-fg outline outline-1 outline-accent ${numeric ? 'text-right tabular-nums' : ''}`}
      style={{ userSelect: 'text' }}
    />
    {date && <DatePicker anchorRef={ref} value={parseDateText(draft)} onPick={(iso) => finish('save', 0, formatDate(iso))} />}
    </>
  );
}

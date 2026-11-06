import type { EffectiveField, Expr, FieldType } from '@sgp/mock-data';
import { useEffect, useState } from 'react';
import { FormulaEditor, systemName } from './formulaEditor';
import { Icon } from './Icon';

const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

const TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'status', label: 'Status' },
  { value: 'calculated', label: 'Calculated' },
];

function binaryFormula(left: string, op: 'add' | 'subtract' | 'multiply' | 'divide', right: string, rightKind: 'field' | 'number' | 'weeks'): Expr {
  const rhs: Expr = rightKind === 'field' ? { field: right } : rightKind === 'weeks' ? { duration: { weeks: Number(right) || 0 } } : { value: Number(right) || 0 };
  return { op, args: [{ field: left }, rhs] };
}

export function ManageColumnsDialog({
  tableLabel,
  fields,
  shown,
  canManage,
  hasData,
  onApply,
  onFormula,
  onClose,
}: {
  tableLabel: string;
  fields: EffectiveField[];
  shown: string[];
  /** Schema changes: new fields, uniqueness, formulas, deletion, and the lock column. */
  canManage: boolean;
  /** True when a record stores a value in this field, so deleting it drops that data. */
  hasData?: (code: string) => boolean;
  onApply: (shown: string[], fields: EffectiveField[]) => void;
  /** A saved formula recalculates that column immediately. */
  onFormula?: (code: string, formula: Expr) => void;
  onClose: () => void;
}) {
  const [draftFields, setDraftFields] = useState<EffectiveField[]>(() => fields.map((field) => ({ ...field })));
  const [visible, setVisible] = useState<string[]>(shown);
  const [selected, setSelected] = useState(shown[0] ?? fields[0]?.code ?? '');
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [createUnique, setCreateUnique] = useState<'project' | 'table' | undefined>(undefined);
  const field = draftFields.find((item) => item.code === selected);
  const dirty = JSON.stringify(visible) !== JSON.stringify(shown) || JSON.stringify(draftFields) !== JSON.stringify(fields);
  const shownFields = visible.map((code) => draftFields.find((item) => item.code === code)).filter((item): item is EffectiveField => !!item);
  const hiddenFields = draftFields.filter((item) => !visible.includes(item.code));

  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const patch = (code: string, change: Partial<EffectiveField>) =>
    setDraftFields((all) => all.map((item) => (item.code === code ? { ...item, ...change } : item)));

  const toggleShown = (code: string) =>
    setVisible((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  const addField = () => {
    const label = name.trim();
    if (!label) return;
    const code = `cf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field'}`;
    const next: EffectiveField = {
      code,
      label,
      type,
      hidden: false,
      ...(type === 'text' && createUnique ? { unique: createUnique } : {}),
      ...(type === 'calculated' ? { formula: binaryFormula('frameOut', 'subtract', 'frameIn', 'field') } : {}),
    };
    setDraftFields((all) => [...all, next]);
    setVisible((current) => [...current, code]);
    setSelected(code);
    setCreating(false);
    setName('');
    setType('text');
    setCreateUnique(undefined);
  };

  const removeField = (code: string) => {
    setDraftFields((all) => all.filter((item) => item.code !== code));
    setVisible((current) => current.filter((item) => item !== code));
    setSelected((current) => (current === code ? draftFields.find((item) => item.code !== code)?.code ?? '' : current));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-12" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Manage columns"
        className="flex h-[40rem] max-h-[calc(100vh-6rem)] w-[52rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <Icon name="columns-3" size={18} className="mt-0.5 text-fg-subtle" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Manage columns</h2>
            <p className="text-sm text-fg-muted">{tableLabel}. Shown columns stay with this page. Schema changes need permission to manage it.</p>
          </div>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <div className="flex w-72 shrink-0 flex-col border-r border-line">
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              <p className="px-2 py-1 text-xs text-fg-subtle">Shown</p>
              {shownFields.map((item) => (
                <FieldRow key={item.code} field={item} checked selected={selected === item.code} onSelect={() => { setCreating(false); setSelected(item.code); }} onToggle={() => toggleShown(item.code)} />
              ))}
              {shownFields.length === 0 && <p className="px-2 py-2 text-sm text-fg-subtle">No columns shown.</p>}
              <p className="mt-2 px-2 py-1 text-xs text-fg-subtle">Not shown</p>
              {hiddenFields.map((item) => (
                <FieldRow key={item.code} field={item} checked={false} selected={selected === item.code} onSelect={() => { setCreating(false); setSelected(item.code); }} onToggle={() => toggleShown(item.code)} />
              ))}
            </div>
            <div className="border-t border-line p-2">
              <button
                className={`flex w-full items-center gap-1.5 rounded-md px-2 text-sm ${canManage ? 'text-accent hover:bg-row-hover' : 'cursor-default text-fg-subtle opacity-60'}`}
                style={height}
                disabled={!canManage}
                title={canManage ? 'Add a field to this table' : 'Managing the schema needs permission'}
                onClick={() => canManage && setCreating(true)}
              >
                <Icon name="plus" /> Create custom field
              </button>
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
            {creating ? (
              <>
                <h3 className="text-sm font-semibold">New field</h3>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-muted">Name</span>
                  <input className={control} style={height} value={name} placeholder="Shot name" onChange={(event) => setName(event.target.value)} />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="text-fg-muted">Type</span>
                  <select className={control} style={height} value={type} onChange={(event) => setType(event.target.value as FieldType)}>
                    {TYPES.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                {type === 'text' && (
                  <UniqueOptions
                    unique={createUnique}
                    disabled={false}
                    onChange={(project, global) => setCreateUnique(global ? 'table' : project ? 'project' : undefined)}
                  />
                )}
                {type === 'calculated' && <p className="text-sm text-fg-muted">A calculated field starts as Cut out − Cut in. You can change that after adding it.</p>}
                <button
                  className={`self-start rounded-md px-3 text-sm font-medium text-fg-inverse ${name.trim() ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
                  style={height}
                  disabled={!name.trim()}
                  onClick={addField}
                >
                  Add field
                </button>
              </>
            ) : field ? (
              <FieldConfig
                key={field.code}
                field={field}
                fields={draftFields}
                canManage={canManage}
                hasData={hasData?.(field.code) ?? false}
                onPatch={(change) => patch(field.code, change)}
                onFormula={onFormula}
                onDelete={canManage && !field.system ? () => removeField(field.code) : undefined}
              />
            ) : (
              <p className="text-sm text-fg-subtle">Select a field.</p>
            )}
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="mr-auto text-xs text-fg-subtle">
            {dirty
              ? canManage
                ? 'Showing or hiding a column changes this page. A new field, a formula, or a uniqueness rule changes the table for everyone who can manage the schema.'
                : 'Showing or hiding a column changes this page. Save it from the Page menu.'
              : 'No changes to apply.'}
          </span>
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={!dirty}
            onClick={() => onApply(visible, draftFields)}
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}

function FieldRow({
  field,
  checked,
  selected,
  onSelect,
  onToggle,
}: {
  field: EffectiveField;
  checked: boolean;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-sm px-2 ${selected ? 'bg-accent-subtle' : 'hover:bg-row-hover'}`} style={height}>
      <input type="checkbox" aria-label={`${checked ? 'Hide' : 'Show'} ${field.label}`} checked={checked} onChange={onToggle} className="accent-[var(--sgp-color-accent)]" />
      <button className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm" onClick={onSelect}>
        {field.type === 'calculated' && <Icon name="square-function" size={12} className="shrink-0 text-fg-subtle" />}
        {field.code === 'locked' && <Icon name="lock" size={12} className="shrink-0 text-fg-subtle" />}
        <span className="truncate">{field.label}</span>
      </button>
    </div>
  );
}

function UniqueOptions({
  unique,
  disabled,
  onChange,
}: {
  unique?: 'project' | 'table';
  disabled: boolean;
  onChange: (project: boolean, global: boolean) => void;
}) {
  const project = unique === 'project' || unique === 'table';
  const global = unique === 'table';
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 text-fg-muted">Uniqueness</legend>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={project} onChange={(event) => onChange(event.target.checked, global && event.target.checked)} className="accent-[var(--sgp-color-accent)]" />
        Require unique in this project
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={global} onChange={(event) => onChange(true, event.target.checked)} className="accent-[var(--sgp-color-accent)]" />
        Require unique globally
      </label>
      {disabled && <p className="text-xs text-fg-subtle">Changing uniqueness needs permission to manage the schema.</p>}
    </fieldset>
  );
}

function FieldConfig({
  field,
  fields,
  canManage,
  hasData,
  onPatch,
  onFormula,
  onDelete,
}: {
  field: EffectiveField;
  fields: EffectiveField[];
  canManage: boolean;
  hasData: boolean;
  onPatch: (change: Partial<EffectiveField>) => void;
  onFormula?: (code: string, formula: Expr) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        {field.type === 'calculated' && <Icon name="square-function" className="text-fg-subtle" />}
        {field.code === 'locked' && <Icon name="lock" className="text-fg-subtle" />}
        <h3 className="text-sm font-semibold">{field.label}</h3>
        <span className="font-mono text-xs text-fg-subtle">{systemName(field.label)}</span>
        <span className="text-xs text-fg-subtle">{TYPES.find((option) => option.value === field.type)?.label ?? field.type}</span>
        {field.system && <span className="rounded-sm bg-surface-sunken px-1.5 text-xs text-fg-subtle">System</span>}
      </div>
      {field.type === 'text' && (
        <UniqueOptions
          unique={field.unique}
          disabled={!canManage}
          onChange={(project, global) => onPatch({ unique: global ? 'table' : project ? 'project' : undefined })}
        />
      )}
      {field.type === 'calculated' && (
        <FormulaEditor
          formula={field.formula}
          fields={fields}
          selfCode={field.code}
          canManage={canManage}
          onSave={(formula) => {
            onPatch({ formula });
            onFormula?.(field.code, formula);
          }}
        />
      )}
      {field.code === 'locked' && (
        <p className="text-sm text-fg-muted">
          Show this column to lock or unlock a record. A record locked by the system, such as a timecard after payroll, cannot be unlocked.
        </p>
      )}
      {field.type !== 'text' && field.type !== 'calculated' && field.code !== 'locked' && (
        <p className="text-sm text-fg-muted">Check it to show the column on this page. Uncheck it to hide the column.</p>
      )}
      {onDelete && <DeleteField label={field.label} hasData={hasData} onDelete={onDelete} />}
    </div>
  );
}

function DeleteField({ label, hasData, onDelete }: { label: string; hasData: boolean; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        className="self-start rounded-md border border-line-strong px-3 text-sm text-danger hover:bg-row-hover"
        style={height}
        onClick={() => (hasData ? setConfirming(true) : onDelete())}
      >
        Delete field
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-danger p-3">
      <p className="text-sm">{label} has values on records. Deleting this field removes those values.</p>
      <div className="flex gap-2">
        <button className="rounded-md bg-danger px-3 text-sm font-medium text-fg-inverse hover:opacity-90" style={height} onClick={onDelete}>
          Delete and drop the data
        </button>
        <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={() => setConfirming(false)}>
          Keep field
        </button>
      </div>
    </div>
  );
}

/** One field's configuration, without the column list. */
export function ConfigureFieldDialog({
  field,
  fields,
  canManage,
  hasData = false,
  onSave,
  onDelete,
  onClose,
}: {
  field: EffectiveField;
  fields: EffectiveField[];
  canManage: boolean;
  hasData?: boolean;
  onSave: (field: EffectiveField) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(field);
  const formulaKey = JSON.stringify(field.formula ?? null);
  const storedUnique = field.unique;
  useEffect(() => {
    setDraft(field);
    // Reload only when the stored field changes. `field` is a fresh object on each parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.code, storedUnique, formulaKey]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const dirty = draft.unique !== field.unique;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-12" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={`Configure ${field.label}`}
        className="flex max-h-[calc(100vh-6rem)] w-[40rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon name="settings" size={18} className="text-fg-subtle" />
          <h2 className="text-lg font-semibold">Configure {field.label}</h2>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <FieldConfig
            key={field.code}
            field={draft}
            fields={fields}
            canManage={canManage}
            hasData={hasData}
            onPatch={(change) => {
              const next = { ...draft, ...change };
              setDraft(next);
              if (change.formula) onSave(next);
            }}
            onDelete={canManage && !draft.system ? onDelete : undefined}
          />
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Close
          </button>
          {draft.type !== 'calculated' && (
            <button
              className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty && canManage ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
              style={height}
              disabled={!dirty || !canManage}
              onClick={() => onSave(draft)}
            >
              Save
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

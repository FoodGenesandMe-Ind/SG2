import type { ConditionalFormat, ConditionValue, EffectiveField, FormatCondition, FormatStyle } from '@sgp/mock-data';
import { Fragment, useState, type ReactNode } from 'react';
import {
  defaultValue,
  describeCondition,
  formatClass,
  kindOf,
  conditionReady,
  needsValue,
  newCondition,
  OPS,
  PALETTE,
  ruleMatches,
  styleCss,
} from './conditionalFormat';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

type AnyRecord = Record<string, unknown>;

const height = { height: 'var(--sgp-row-compact)' };
const control = 'rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

function Section({ step, title, hint, children }: { step: number; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-b border-line pb-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex size-5 items-center justify-center rounded-full bg-accent-subtle text-xs">{step}</span>
        {title}
        {hint && <span className="text-xs font-normal text-fg-subtle">{hint}</span>}
      </h3>
      {children}
    </section>
  );
}

export function ColorRow({ label, value, onChange }: { label: string; value?: string; onChange: (value?: string) => void }) {
  const custom = value && !PALETTE.some((p) => p.value === value) ? value : undefined;
  const swatch = (active: boolean) => `size-5 shrink-0 rounded-sm ring-offset-1 ring-offset-surface-raised ${active ? 'ring-2 ring-fg' : 'hover:ring-1 hover:ring-line-strong'}`;
  return (
    <div className="flex items-center gap-2" role="radiogroup" aria-label={label}>
      <span className="w-24 shrink-0 text-sm text-fg-muted">{label}</span>
      <button
        role="radio"
        aria-checked={!value}
        aria-label="None"
        title="None"
        onClick={() => onChange(undefined)}
        className={`${swatch(!value)} flex items-center justify-center border border-line-strong text-fg-subtle`}
      >
        <Icon name="ban" size={12} />
      </button>
      {PALETTE.map((p) => (
        <button
          key={p.name}
          role="radio"
          aria-checked={value === p.value}
          aria-label={p.name}
          title={p.name}
          onClick={() => onChange(p.value)}
          className={swatch(value === p.value)}
          style={{ background: p.value }}
        />
      ))}
      <label className={`${swatch(!!custom)} relative cursor-pointer overflow-hidden border border-line-strong`} title="Custom color">
        <span className="absolute inset-0" style={{ background: custom ?? 'conic-gradient(var(--sgp-palette-red), var(--sgp-palette-amber), var(--sgp-palette-green), var(--sgp-palette-blue), var(--sgp-palette-purple), var(--sgp-palette-red))' }} />
        <input type="color" aria-label={`${label}: custom color`} className="absolute inset-0 opacity-0" value={custom ?? '#ffffff'} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function ValueEditor({
  condition,
  field,
  fields,
  onChange,
}: {
  condition: FormatCondition;
  field: EffectiveField;
  fields: EffectiveField[];
  onChange: (value: ConditionValue) => void;
}) {
  const kind = kindOf(field, fields);
  const value = condition.value;
  if (!needsValue(condition.op)) return null;

  if (kind === 'list') {
    const picked = value?.kind === 'values' ? value.values : [];
    return (
      <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Values">
        {(field.validValues ?? []).map((code) => {
          const on = picked.includes(code);
          return (
            <button
              key={code}
              aria-pressed={on}
              onClick={() => onChange({ kind: 'values', values: on ? picked.filter((c) => c !== code) : [...picked, code] })}
              className={`rounded-md border px-1.5 py-0.5 ${on ? 'border-accent bg-accent-subtle' : 'border-line hover:border-line-strong'}`}
            >
              {field.type === 'status' ? <StatusPill code={code} pillStyle="icon" display="long" /> : <span className="text-sm">{code}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  if (kind === 'text') {
    return (
      <input
        aria-label="Value"
        className={`${control} w-48`}
        style={height}
        value={value?.kind === 'value' ? String(value.value) : ''}
        placeholder="Value"
        onChange={(e) => onChange({ kind: 'value', value: e.target.value })}
      />
    );
  }

  // Dates and numbers: a typed value, another field of the same kind, or (dates) today plus or minus days.
  const sameKind = fields.filter((f) => f.code !== field.code && kindOf(f, fields) === kind);
  const source = value?.kind ?? (kind === 'date' ? 'today' : 'value');
  return (
    <span className="flex items-center gap-1.5">
      <select
        aria-label="Compare with"
        className={control}
        style={height}
        value={source}
        onChange={(e) => {
          const next = e.target.value;
          if (next === 'today') onChange({ kind: 'today', offsetDays: 0 });
          else if (next === 'field') onChange({ kind: 'field', field: sameKind[0]?.code ?? '' });
          else onChange({ kind: 'value', value: kind === 'date' ? '' : 0 });
        }}
      >
        {kind === 'date' && <option value="today">Today</option>}
        <option value="value">{kind === 'date' ? 'A date' : 'A number'}</option>
        {sameKind.length > 0 && <option value="field">Another field</option>}
      </select>
      {value?.kind === 'today' && (
        <>
          <span className="text-sm text-fg-subtle">+</span>
          <input
            type="number"
            aria-label="Days from today"
            className={`${control} w-16 tabular-nums`}
            style={height}
            value={value.offsetDays}
            onChange={(e) => onChange({ kind: 'today', offsetDays: Number(e.target.value) })}
          />
          <span className="text-sm text-fg-subtle">days</span>
        </>
      )}
      {value?.kind === 'value' && (
        <input
          type={kind === 'date' ? 'date' : 'number'}
          aria-label="Value"
          className={`${control} ${kind === 'date' ? 'w-36' : 'w-24'} tabular-nums`}
          style={{ ...height, colorScheme: 'inherit' }}
          value={String(value.value)}
          onChange={(e) => onChange({ kind: 'value', value: kind === 'date' ? e.target.value : Number(e.target.value) })}
        />
      )}
      {value?.kind === 'field' && (
        <select
          aria-label="Field to compare with"
          className={control}
          style={height}
          value={value.field}
          onChange={(e) => onChange({ kind: 'field', field: e.target.value })}
        >
          {sameKind.map((f) => (
            <option key={f.code} value={f.code}>
              {f.label}
            </option>
          ))}
        </select>
      )}
    </span>
  );
}

export function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: FormatCondition;
  fields: EffectiveField[];
  onChange: (condition: FormatCondition) => void;
  onRemove?: () => void;
}) {
  const field = fields.find((f) => f.code === condition.field) ?? fields[0];
  const kind = kindOf(field, fields);
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-surface-sunken/60 p-1.5" role="group" aria-label="Condition">
      <select
        aria-label="Field"
        className={`${control} w-40`}
        style={height}
        value={field.code}
        onChange={(e) => onChange(newCondition(fields.find((f) => f.code === e.target.value)!, fields))}
      >
        {fields.map((f) => (
          <option key={f.code} value={f.code}>
            {f.label}
          </option>
        ))}
      </select>
      <select
        aria-label="Operator"
        className={control}
        style={height}
        value={condition.op}
        onChange={(e) => {
          const op = e.target.value as FormatCondition['op'];
          onChange({ ...condition, op, value: needsValue(op) ? condition.value ?? defaultValue(kind) : undefined });
        }}
      >
        {OPS[kind].map((o) => (
          <option key={o.op} value={o.op}>
            {o.label}
          </option>
        ))}
      </select>
      <ValueEditor condition={condition} field={field} fields={fields} onChange={(value) => onChange({ ...condition, value })} />
      {onRemove && (
        <button className="ml-auto flex size-6 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg" aria-label="Remove condition" onClick={onRemove}>
          <Icon name="x" size={13} />
        </button>
      )}
    </div>
  );
}

/** A small sample of what the format looks like, for the rule list and the preview. */
export function Sample({ style, children }: { style: FormatStyle; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-sm px-1.5 text-sm text-fg ${formatClass(style)}`} style={styleCss(style)}>
      {children}
    </span>
  );
}

type Scope = 'page' | 'project';

interface Item {
  rule: ConditionalFormat;
  scope: Scope;
}

/** Page rules first, then project-wide rules: a page's own rules win over the project's. */
const grouped = (items: Item[]) => [...items.filter((i) => i.scope === 'page'), ...items.filter((i) => i.scope === 'project')];

/**
 * Conditional formatting for a table page: an ordered list of rules, each a set of conditions and a format,
 * used on this page only or project-wide (every page on this table in the project).
 * Field choices narrow the operators and values to what fits the field; nothing is typed as a formula.
 */
export function ConditionalFormatDialog({
  pageName,
  noun,
  tableLabel,
  projectName,
  fields,
  columns,
  records,
  recordLabel,
  rules: pageRules,
  projectRules,
  canEditProject,
  startColumn,
  onApply,
  onClose,
}: {
  pageName: string;
  /** Plural record name, e.g. "shots". */
  noun: string;
  /** e.g. "Shots", for "every Shots page". */
  tableLabel: string;
  projectName: string;
  /** Every field a condition can test. */
  fields: EffectiveField[];
  /** The page's columns, for formatting a single cell. */
  columns: EffectiveField[];
  records: AnyRecord[];
  recordLabel: (record: AnyRecord) => string;
  /** This page's rules, in order. */
  rules: ConditionalFormat[];
  /** Project-wide rules for this table, in order. */
  projectRules: ConditionalFormat[];
  canEditProject: boolean;
  /** The column whose header was right-clicked. */
  startColumn?: string;
  onApply: (pageRules: ConditionalFormat[], projectRules: ConditionalFormat[]) => void;
  onClose: () => void;
}) {
  const projectWide = `every ${tableLabel} page in ${projectName}`;
  const makeRule = (n: number): ConditionalFormat => {
    const field = fields.find((f) => f.code === startColumn) ?? columns[0] ?? fields[0];
    return {
      id: `cf-new-${Date.now()}-${n}`,
      name: `New rule ${n}`,
      enabled: true,
      match: 'all',
      conditions: [newCondition(field, fields)],
      applyTo: columns.some((c) => c.code === field.code) ? field.code : 'row',
      style: { text: 'var(--sgp-palette-red)' },
    };
  };
  const initialItems = [
    ...pageRules.map((rule) => ({ rule, scope: 'page' as const })),
    ...projectRules.map((rule) => ({ rule, scope: 'project' as const })),
  ];
  const [saved] = useState(() => JSON.stringify(initialItems));
  const [items, setItems] = useState<Item[]>(initialItems);
  // The form shows this until + New rule commits it. It is not in the list, so Apply ignores it.
  const [draft, setDraft] = useState<Item>(() => ({ rule: makeRule(1), scope: 'page' }));
  const [selectedId, setSelectedId] = useState(() => {
    const touching = initialItems.find((i) => i.rule.applyTo === startColumn || i.rule.conditions.some((c) => c.field === startColumn));
    return touching?.rule.id ?? '';
  });

  const rules = items.map((i) => i.rule);
  const index = items.findIndex((i) => i.rule.id === selectedId);
  const selected = items[index];
  const composing = !selected;
  const current = selected ?? draft;
  const rule = current.rule;
  const locked = current.scope === 'project' && !canEditProject;
  const dirty = JSON.stringify(items) !== saved;
  const update = (change: Partial<ConditionalFormat>) => {
    if (composing) setDraft((item) => ({ ...item, rule: { ...item.rule, ...change } }));
    else setItems((all) => all.map((i) => (i.rule.id === rule.id ? { ...i, rule: { ...i.rule, ...change } } : i)));
  };
  const setStyle = (change: Partial<FormatStyle>) => update({ style: { ...rule.style, ...change } });
  const setScope = (scope: Scope) => {
    if (composing) setDraft((item) => ({ ...item, scope }));
    else
      setItems((all) => {
        const moving = all.find((i) => i.rule.id === rule.id)!;
        return grouped([...all.filter((i) => i.rule.id !== rule.id), { ...moving, scope }]);
      });
  };
  const ready = rule.name.trim().length > 0 && rule.conditions.length > 0 && rule.conditions.every((c) => conditionReady(c, fields));
  const addRule = () => {
    if (!ready) return;
    const source = composing ? draft : { rule: { ...rule, name: rule.name.trim() }, scope: current.scope };
    const added: Item = { rule: { ...source.rule, id: `cf-new-${Date.now()}` }, scope: source.scope };
    setItems((all) => grouped([...all, added]));
    setSelectedId(added.rule.id);
    setDraft({ rule: makeRule(items.length + 2), scope: 'page' });
  };
  /** Moves a rule one place up or down within its own group. */
  const move = (at: number, delta: -1 | 1) =>
    setItems((all) => {
      const to = at + delta;
      if (!all[to] || all[to].scope !== all[at].scope) return all;
      const next = [...all];
      [next[at], next[to]] = [next[to], next[at]];
      return next;
    });
  const summary = (r: ConditionalFormat) => r.conditions.map((c) => describeCondition(c, fields)).join(r.match === 'all' ? ' and ' : ' or ');
  const targetLabel = (r: ConditionalFormat) =>
    r.applyTo === 'row' ? 'Whole row' : `${columns.find((c) => c.code === r.applyTo)?.label ?? r.applyTo} cell`;

  const place = composing ? items.length : index;
  const matching = records.filter((rec) => ruleMatches({ ...rule, enabled: true }, rec, fields));
  const shadowed = matching.filter((rec) =>
    rules.slice(0, place).some((earlier) => earlier.applyTo === rule.applyTo && ruleMatches(earlier, rec, fields)),
  );
  const projectChanged = JSON.stringify(items.filter((i) => i.scope === 'project').map((i) => i.rule)) !== JSON.stringify(projectRules);

  const groupHeader = (scope: Scope) => (
    <li className="px-1 pt-2 pb-0.5 text-xs font-semibold uppercase tracking-wide text-fg-subtle first:pt-0">
      {scope === 'page' ? `This page only` : `Project-wide`}
      <span className="block text-xs font-normal normal-case tracking-normal">
        {scope === 'page' ? `${pageName}; saved with the page` : `${projectWide}${canEditProject ? '' : '; managed by admins'}`}
      </span>
    </li>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-10" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Conditional formatting"
        className="flex h-[48rem] max-h-[calc(100vh-5rem)] w-[62rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <Icon name="palette" size={18} className="mt-0.5 text-fg-subtle" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Conditional formatting</h2>
            <p className="text-sm text-fg-muted">
              {pageName} page. Rules run from the top, this page's rules before project-wide ones; when several match a row (or a
              cell), the one highest in the list sets its format.
            </p>
          </div>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div className="flex min-h-0 flex-1">
          <aside className="flex w-72 shrink-0 flex-col border-r border-line">
            <ol className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-2" aria-label="Rules, in order">
              {items.length === 0 && (
                <li className="px-2 py-3 text-sm text-fg-subtle">No rules yet. Fill in the form, then click + New rule.</li>
              )}
              {items.map((item, i) => {
                const r = item.rule;
                const first = i === 0 || items[i - 1].scope !== item.scope;
                const last = i === items.length - 1 || items[i + 1].scope !== item.scope;
                const readOnly = item.scope === 'project' && !canEditProject;
                return (
                  <Fragment key={r.id}>
                    {first && groupHeader(item.scope)}
                    <li>
                      <div
                        role="button"
                        tabIndex={0}
                        aria-current={r.id === rule.id}
                        onClick={() => setSelectedId(r.id)}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedId(r.id)}
                        className={`flex cursor-pointer gap-2 rounded-md border p-2 ${
                          r.id === rule.id ? 'border-accent bg-accent-subtle/40' : 'border-transparent hover:bg-row-hover'
                        } ${r.enabled ? '' : 'opacity-50'}`}
                      >
                        <span className="flex flex-col text-fg-subtle">
                          <button
                            aria-label={`Move ${r.name} up`}
                            disabled={first || readOnly}
                            onClick={(e) => (e.stopPropagation(), move(i, -1))}
                            className="hover:text-fg disabled:opacity-30"
                          >
                            <Icon name="chevron-up" size={13} />
                          </button>
                          <button
                            aria-label={`Move ${r.name} down`}
                            disabled={last || readOnly}
                            onClick={(e) => (e.stopPropagation(), move(i, 1))}
                            className="hover:text-fg disabled:opacity-30"
                          >
                            <Icon name="chevron-down" size={13} />
                          </button>
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            <span className="text-xs text-fg-subtle tabular-nums">{i + 1}</span>
                            <span className="truncate">{r.name}</span>
                            {readOnly && <Icon name="lock" size={12} className="shrink-0 text-fg-subtle" />}
                          </span>
                          <span className="line-clamp-2 text-xs text-fg-muted">{summary(r)}</span>
                          <span className="flex items-center gap-1.5 text-xs text-fg-subtle">
                            <Sample style={r.style}>Aa</Sample>
                            {targetLabel(r)}
                          </span>
                        </span>
                        <input
                          type="checkbox"
                          aria-label={`${r.name} on`}
                          title={r.enabled ? 'On' : 'Off'}
                          checked={r.enabled}
                          disabled={readOnly}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            setItems((all) => all.map((x) => (x.rule.id === r.id ? { ...x, rule: { ...x.rule, enabled: e.target.checked } } : x)))
                          }
                          className="mt-0.5 self-start accent-[var(--sgp-color-accent)]"
                        />
                      </div>
                    </li>
                  </Fragment>
                );
              })}
            </ol>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          <fieldset disabled={locked} className="flex flex-col gap-4">
            {locked && (
              <p className="flex items-center gap-1.5 rounded-md bg-surface-sunken px-2 py-1.5 text-sm text-fg-muted">
                <Icon name="lock" size={13} /> Project-wide rules apply to {projectWide}. Only admins can change them.
              </p>
            )}
            <label className="flex items-center gap-3 text-sm">
              <span className="w-24 text-fg-muted">Rule name</span>
              <input aria-label="Rule name" className={`${control} w-72`} style={height} value={rule.name} onChange={(e) => update({ name: e.target.value })} />
            </label>
            <div className="flex items-start gap-3 text-sm" role="radiogroup" aria-label="Apply to">
              <span className="w-24 shrink-0 pt-0.5 text-fg-muted">Apply to</span>
              <span className="flex flex-col gap-1">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={current.scope === 'page'} onChange={() => setScope('page')} className="accent-[var(--sgp-color-accent)]" />
                  This page only
                  <span className="text-xs text-fg-subtle">saved with {pageName} from the Page menu</span>
                </label>
                <label className={`flex items-center gap-1.5 ${canEditProject ? '' : 'opacity-50'}`}>
                  <input
                    type="radio"
                    disabled={!canEditProject}
                    checked={current.scope === 'project'}
                    onChange={() => setScope('project')}
                    className="accent-[var(--sgp-color-accent)]"
                  />
                  Project-wide
                  <span className="text-xs text-fg-subtle">
                    {canEditProject ? `${projectWide}, for everyone` : `${projectWide}; needs a permission set that manages the schema`}
                  </span>
                </label>
              </span>
            </div>

            <Section step={1} title="When">
              <div className="flex items-center gap-2 text-sm text-fg-muted">
                Format {noun} where
                <select
                  aria-label="Match"
                  className={control}
                  style={height}
                  value={rule.match}
                  onChange={(e) => update({ match: e.target.value as ConditionalFormat['match'] })}
                >
                  <option value="all">all</option>
                  <option value="any">any</option>
                </select>
                of these are true
              </div>
              {rule.conditions.map((c, ci) => (
                <ConditionRow
                  key={ci}
                  condition={c}
                  fields={fields}
                  onChange={(next) => update({ conditions: rule.conditions.map((x, xi) => (xi === ci ? next : x)) })}
                  onRemove={rule.conditions.length > 1 ? () => update({ conditions: rule.conditions.filter((_, xi) => xi !== ci) }) : undefined}
                />
              ))}
              <button
                className="flex items-center gap-1.5 self-start rounded-md px-2 text-sm text-accent hover:bg-row-hover"
                style={height}
                onClick={() => update({ conditions: [...rule.conditions, newCondition(fields.find((f) => f.code === startColumn) ?? columns[0], fields)] })}
              >
                <Icon name="plus" /> Add condition
              </button>
            </Section>
            </fieldset>

            <Section step={2} title="Format">
              <fieldset disabled={locked} className="flex flex-col gap-3">
              <div className="flex items-center gap-3 text-sm" role="radiogroup" aria-label="Style the">
                <span className="w-24 text-fg-muted">Style the</span>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={rule.applyTo === 'row'} onChange={() => update({ applyTo: 'row' })} className="accent-[var(--sgp-color-accent)]" />
                  Whole row
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={rule.applyTo !== 'row'}
                    onChange={() => update({ applyTo: startColumn && columns.some((c) => c.code === startColumn) ? startColumn : columns[0].code })}
                    className="accent-[var(--sgp-color-accent)]"
                  />
                  Only the
                  <select
                    aria-label="Column"
                    className={control}
                    style={height}
                    disabled={rule.applyTo === 'row'}
                    value={rule.applyTo === 'row' ? '' : rule.applyTo}
                    onChange={(e) => update({ applyTo: e.target.value })}
                  >
                    {rule.applyTo === 'row' && <option value="">column</option>}
                    {columns.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  cell
                </label>
              </div>
              <ColorRow label="Text" value={rule.style.text} onChange={(text) => setStyle({ text })} />
              <ColorRow label="Background" value={rule.style.background} onChange={(background) => setStyle({ background })} />
              <ColorRow label="Border" value={rule.style.border} onChange={(border) => setStyle({ border })} />
              <label className="flex items-center gap-3 text-sm">
                <span className="w-24 text-fg-muted">Bold</span>
                <input type="checkbox" checked={!!rule.style.bold} onChange={(e) => setStyle({ bold: e.target.checked })} className="accent-[var(--sgp-color-accent)]" />
              </label>
            </fieldset>
              <button
                className={`flex items-center gap-1.5 self-start rounded-md px-3 text-sm font-medium text-fg-inverse ${ready ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
                style={height}
                disabled={!ready}
                title={ready ? 'Add this rule' : 'Finish the condition first. A value is still needed.'}
                onClick={addRule}
              >
                <Icon name="plus" /> New rule
              </button>
            </Section>

            <Section step={3} title="Preview" hint="against the records on this page">
              <p className="text-sm" role="status">
                Matches <span className="font-semibold tabular-nums">{matching.length}</span> of {records.length} {noun}
                {composing && <span className="text-fg-subtle"> Not a rule until you click + New rule.</span>}
                {!rule.enabled && <span className="text-fg-subtle"> (this rule is off)</span>}.
                {shadowed.length > 0 && (
                  <span className="text-warning">
                    {' '}
                    {shadowed.length} of them already take a format from a rule higher in the list, so this rule won't show there.
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {matching.slice(0, 12).map((rec) => (
                  <Sample key={recordLabel(rec)} style={shadowed.includes(rec) ? {} : rule.style}>
                    <span className={shadowed.includes(rec) ? 'text-fg-subtle line-through' : ''}>{recordLabel(rec)}</span>
                  </Sample>
                ))}
                {matching.length > 12 && <span className="text-sm text-fg-subtle">and {matching.length - 12} more</span>}
              </div>
            </Section>
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          <button
            className="flex items-center gap-1.5 rounded-md px-2 text-sm text-danger hover:bg-row-hover disabled:opacity-40"
            style={height}
            disabled={composing || locked}
            onClick={() => {
              const remaining = items.filter((i) => i.rule.id !== rule.id);
              setItems(remaining);
              setSelectedId(remaining[Math.max(0, index - 1)]?.rule.id ?? '');
              if (remaining.length === 0) setDraft({ rule: makeRule(1), scope: 'page' });
            }}
          >
            <Icon name="trash" /> Delete rule
          </button>
          <span className="ml-auto text-xs text-fg-subtle">
            {!dirty
              ? 'No changes to apply.'
              : projectChanged
                ? `Project-wide changes apply to ${projectWide} as soon as you apply.`
                : 'Applying changes the page; save it from the Page menu.'}
          </span>
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Cancel
          </button>
          <button
            className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={!dirty}
            onClick={() => {
              onApply(
                items.filter((i) => i.scope === 'page').map((i) => i.rule),
                items.filter((i) => i.scope === 'project').map((i) => i.rule),
              );
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

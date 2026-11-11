import type { ConditionalFormat, EffectiveField } from '@sgp/mock-data';
import { useState } from 'react';
import { ColorRow, ConditionRow, Sample } from './ConditionalFormatDialog';
import { conditionReady, describeCondition, newCondition } from './conditionalFormat';
import { Icon } from './Icon';
import { useReorder } from './reorder';

const height = { height: 'var(--sgp-row-compact)' };
const control = 'rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

/** The rules that format this field: those that paint it, and those that paint the whole record. */
export const rulesFormatting = (rules: ConditionalFormat[], code: string) => rules.filter((rule) => rule.applyTo === code || rule.applyTo === 'row');

/**
 * A field's conditional formatting, inside Manage fields, in the same shape as a status list: the rules that format
 * the field in their order (drag a grip to reorder; the first matching rule wins), each with Edit and Remove, and
 * + Conditional formatting to build a new one right below the list.
 */
export function FieldFormats({
  field,
  fields,
  rules,
  onRules,
}: {
  field: EffectiveField;
  /** Every field a condition can test. */
  fields: EffectiveField[];
  /** All of the page's rules, in order. */
  rules: ConditionalFormat[];
  onRules: (rules: ConditionalFormat[]) => void;
}) {
  const mine = rulesFormatting(rules, field.code);
  const [editing, setEditing] = useState<ConditionalFormat | null>(null);
  const reorder = useReorder({
    ids: mine.map((rule) => rule.id),
    // This field's rules move among themselves; the page's other rules keep their places.
    onReorder: (ids) => {
      const moved = ids.map((id) => mine.find((rule) => rule.id === id)!);
      let next = 0;
      onRules(rules.map((rule) => (mine.some((item) => item.id === rule.id) ? moved[next++]! : rule)));
    },
  });
  const summary = (rule: ConditionalFormat) => rule.conditions.map((condition) => describeCondition(condition, fields)).join(rule.match === 'all' ? ' and ' : ' or ');
  const fresh = (): ConditionalFormat => ({
    id: `cf-new-${Date.now()}`,
    name: `${field.label} rule ${mine.length + 1}`,
    enabled: true,
    match: 'all',
    conditions: [newCondition(field, fields)],
    applyTo: field.code,
    style: { text: 'var(--sgp-palette-red)' },
  });
  const adding = !!editing && !rules.some((rule) => rule.id === editing.id);

  return (
    <div className="flex flex-col gap-2 text-sm">
      {mine.length > 0 && (
        <div ref={reorder.listRef} className="relative flex flex-col" aria-label="Rules, in order">
          {reorder.indicator}
          {mine.map((rule) => (
            <div key={rule.id} {...reorder.itemProps(rule.id)} className={`flex items-center gap-2 rounded-sm px-1 transition-opacity ${reorder.dimClass(rule.id)} ${rule.enabled ? '' : 'opacity-50'}`} style={height}>
              <button
                type="button"
                className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg active:cursor-grabbing"
                aria-label={`Drag ${rule.name} to reorder`}
                title="Drag to reorder. The first rule that matches sets the format."
                onPointerDown={(event) => reorder.startDrag(rule.id, event)}
              >
                <Icon name="grip-vertical" size={14} />
              </button>
              <Sample style={rule.style}>Aa</Sample>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="truncate">{rule.name}</span>
                <span className="truncate text-xs text-fg-subtle" title={summary(rule)}>
                  {rule.applyTo === 'row' ? 'Whole record' : `Only ${field.label}`}: {summary(rule)}
                </span>
              </span>
              <button type="button" className="shrink-0 text-xs text-accent hover:underline" aria-label={`Edit ${rule.name}`} onClick={() => setEditing(rule)}>
                Edit
              </button>
              <button
                type="button"
                className="shrink-0 text-xs text-accent hover:underline"
                aria-label={`Remove ${rule.name}`}
                onClick={() => {
                  onRules(rules.filter((item) => item.id !== rule.id));
                  if (editing?.id === rule.id) setEditing(null);
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`flex items-center gap-1.5 self-start rounded-md border px-2 text-sm ${adding ? 'border-accent bg-accent-subtle' : 'border-line-strong hover:bg-row-hover'}`}
        style={height}
        aria-expanded={adding}
        onClick={() => setEditing(adding ? null : fresh())}
      >
        <Icon name="plus" /> Conditional formatting
      </button>
      {editing && (
        <RuleForm
          key={editing.id}
          rule={editing}
          field={field}
          fields={fields}
          adding={adding}
          onSave={(rule) => {
            onRules(adding ? [...rules, rule] : rules.map((item) => (item.id === rule.id ? rule : item)));
            setEditing(null);
          }}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RuleForm({
  rule: initial,
  field,
  fields,
  adding,
  onSave,
  onCancel,
}: {
  rule: ConditionalFormat;
  field: EffectiveField;
  fields: EffectiveField[];
  adding: boolean;
  onSave: (rule: ConditionalFormat) => void;
  onCancel: () => void;
}) {
  const [rule, setRule] = useState(initial);
  const update = (change: Partial<ConditionalFormat>) => setRule((current) => ({ ...current, ...change }));
  const setStyle = (change: Partial<ConditionalFormat['style']>) => update({ style: { ...rule.style, ...change } });
  const ready = rule.name.trim().length > 0 && rule.conditions.length > 0 && rule.conditions.every((condition) => conditionReady(condition, fields));
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line-strong p-3" role="group" aria-label={adding ? 'New rule' : `Edit ${initial.name}`}>
      <label className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-fg-muted">Rule name</span>
        <input aria-label="Rule name" className={`${control} min-w-0 flex-1`} style={height} value={rule.name} onChange={(event) => update({ name: event.target.value })} />
      </label>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2 text-fg-muted">
          When
          <select aria-label="Match" className={control} style={height} value={rule.match} onChange={(event) => update({ match: event.target.value as ConditionalFormat['match'] })}>
            <option value="all">all</option>
            <option value="any">any</option>
          </select>
          of these are true
        </div>
        {rule.conditions.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            fields={fields}
            onChange={(next) => update({ conditions: rule.conditions.map((item, at) => (at === index ? next : item)) })}
            onRemove={rule.conditions.length > 1 ? () => update({ conditions: rule.conditions.filter((_, at) => at !== index) }) : undefined}
          />
        ))}
        <button
          type="button"
          className="flex items-center gap-1.5 self-start rounded-md px-2 text-accent hover:bg-row-hover"
          style={height}
          onClick={() => update({ conditions: [...rule.conditions, newCondition(field, fields)] })}
        >
          <Icon name="plus" /> Add condition
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Paint">
        <span className="w-24 shrink-0 text-fg-muted">Paint</span>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={rule.applyTo !== 'row'} onChange={() => update({ applyTo: field.code })} className="accent-[var(--sgp-color-accent)]" />
          Only {field.label}
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={rule.applyTo === 'row'} onChange={() => update({ applyTo: 'row' })} className="accent-[var(--sgp-color-accent)]" />
          The whole record
        </label>
      </div>
      <ColorRow label="Text" value={rule.style.text} onChange={(text) => setStyle({ text })} />
      <ColorRow label="Background" value={rule.style.background} onChange={(background) => setStyle({ background })} />
      <ColorRow label="Border" value={rule.style.border} onChange={(border) => setStyle({ border })} />
      <label className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-fg-muted">Bold</span>
        <input type="checkbox" checked={!!rule.style.bold} onChange={(event) => setStyle({ bold: event.target.checked })} className="accent-[var(--sgp-color-accent)]" />
      </label>
      <div className="flex items-center gap-2">
        <Sample style={rule.style}>Sample</Sample>
        <button
          type="button"
          className={`ml-auto rounded-md px-3 text-sm font-medium text-fg-inverse ${ready ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
          style={height}
          disabled={!ready}
          title={ready ? undefined : 'Finish the condition first. A value is still needed.'}
          onClick={() => onSave({ ...rule, name: rule.name.trim() })}
        >
          {adding ? 'Add rule' : 'Save rule'}
        </button>
        <button type="button" className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

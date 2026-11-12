import type { ConditionalFormat, EffectiveField, TableView } from '@sgp/mock-data';
import { useState } from 'react';
import { ColorRow, ConditionRow, Sample } from './ConditionalFormatDialog';
import { conditionReady, describeCondition, newCondition, ruleMatches } from './conditionalFormat';
import { Icon } from './Icon';
import { useReorder } from './reorder';
import { VIEW_ICON } from './shotsPage';
import { VIEW_NAME } from './viewDisplay';

const height = { height: 'var(--sgp-row-compact)' };
const control = 'rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';
const ALL_VIEWS: TableView[] = ['table', 'card', 'thumb', 'kanban', 'gantt'];

/** The rules that format this field: those that paint it, and those that paint the whole record. */
export const rulesFormatting = (rules: ConditionalFormat[], code: string) => rules.filter((rule) => rule.applyTo === code || rule.applyTo === 'row');

/** A rule reads as what it tests; it has no name of its own to keep up to date. */
export const ruleSummary = (rule: ConditionalFormat, fields: EffectiveField[]) =>
  rule.conditions.map((condition) => describeCondition(condition, fields)).join(rule.match === 'all' ? ' and ' : ' or ');

const paints = (rule: ConditionalFormat, fields: EffectiveField[]) =>
  rule.applyTo === 'row' ? 'Paints the whole record' : `Paints only ${fields.find((field) => field.code === rule.applyTo)?.label ?? rule.applyTo}`;

const viewsText = (rule: ConditionalFormat, enabled: TableView[]) => {
  const shown = enabled.filter((view) => !rule.views || rule.views.includes(view));
  return shown.length === enabled.length ? 'in every view' : shown.length === 0 ? 'in no view' : `in ${shown.map((view) => VIEW_NAME[view]).join(', ')}`;
};

/** Rules in their order, dragged by their grips; the first that matches sets the format. */
function RuleList({
  rules,
  fields,
  enabled = ALL_VIEWS,
  readOnly = false,
  onReorder,
  onEdit,
  onRemove,
}: {
  rules: ConditionalFormat[];
  fields: EffectiveField[];
  /** Views turned on for the page; a rule's views are told among these. */
  enabled?: TableView[];
  readOnly?: boolean;
  onReorder: (rules: ConditionalFormat[]) => void;
  onEdit: (rule: ConditionalFormat) => void;
  onRemove: (rule: ConditionalFormat) => void;
}) {
  const reorder = useReorder({ ids: rules.map((rule) => rule.id), onReorder: (ids) => onReorder(ids.map((id) => rules.find((rule) => rule.id === id)!)) });
  return (
    <div ref={reorder.listRef} className="relative flex flex-col" aria-label="Rules, in order">
      {reorder.indicator}
      {rules.map((rule) => (
        <div key={rule.id} {...reorder.itemProps(rule.id)} className={`flex items-center gap-2 rounded-sm px-1 py-1 transition-opacity ${reorder.dimClass(rule.id)} ${rule.enabled ? '' : 'opacity-50'}`}>
          <span className="flex size-6 shrink-0 items-center justify-center" title={readOnly ? 'Project-wide rules are reordered by someone who can manage the schema.' : undefined}>
            {!readOnly && (
              <button
                type="button"
                className="flex size-6 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg active:cursor-grabbing"
                aria-label={`Drag ${ruleSummary(rule, fields)} to reorder`}
                title="Drag to reorder. The first rule that matches sets the format."
                onPointerDown={(event) => reorder.startDrag(rule.id, event)}
              >
                <Icon name="grip-vertical" size={14} />
              </button>
            )}
          </span>
          <Sample style={rule.style}>Aa</Sample>
          <span className="flex min-w-0 flex-1 flex-col leading-snug">
            <span className="text-sm text-fg" title={ruleSummary(rule, fields)}>
              {ruleSummary(rule, fields)}
            </span>
            <span className="truncate text-xs text-fg-subtle">
              {paints(rule, fields)}, {viewsText(rule, enabled)}
            </span>
          </span>
          {readOnly ? (
            <Icon name="lock" size={12} className="shrink-0 text-fg-subtle" />
          ) : (
            <>
              <button type="button" className="shrink-0 text-xs text-accent hover:underline" aria-label={`Edit ${ruleSummary(rule, fields)}`} onClick={() => onEdit(rule)}>
                Edit
              </button>
              <button type="button" className="shrink-0 text-xs text-accent hover:underline" aria-label={`Remove ${ruleSummary(rule, fields)}`} onClick={() => onRemove(rule)}>
                Remove
              </button>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

const freshRule = (target: EffectiveField, fields: EffectiveField[]): ConditionalFormat => ({
  id: `cf-new-${Date.now()}`,
  name: '',
  enabled: true,
  match: 'all',
  conditions: [newCondition(target, fields)],
  applyTo: target.code,
  style: { text: 'var(--sgp-palette-red)' },
});

/**
 * A field's conditional formatting, inside the field's Display options: the rules that format the field in their order,
 * each with Edit and Remove, and + Conditional formatting to build a new one right below the list.
 */
export function FieldFormats({
  field,
  fields,
  rules,
  enabled = ALL_VIEWS,
  onRules,
}: {
  field: EffectiveField;
  /** Every field a condition can test. */
  fields: EffectiveField[];
  /** All of the page's rules, in order. */
  rules: ConditionalFormat[];
  /** Views turned on for the page. */
  enabled?: TableView[];
  onRules: (rules: ConditionalFormat[]) => void;
}) {
  const mine = rulesFormatting(rules, field.code);
  const [editing, setEditing] = useState<ConditionalFormat | null>(null);
  const adding = !!editing && !rules.some((rule) => rule.id === editing.id);
  return (
    <div className="flex flex-col gap-2 text-sm">
      {mine.length > 0 && (
        <RuleList
          rules={mine}
          fields={fields}
          enabled={enabled}
          onReorder={(moved) => {
            // This field's rules move among themselves; the page's other rules keep their places.
            let next = 0;
            onRules(rules.map((rule) => (mine.some((item) => item.id === rule.id) ? moved[next++]! : rule)));
          }}
          onEdit={setEditing}
          onRemove={(rule) => {
            onRules(rules.filter((item) => item.id !== rule.id));
            if (editing?.id === rule.id) setEditing(null);
          }}
        />
      )}
      <AddButton open={adding} onClick={() => setEditing(adding ? null : freshRule(field, fields))} />
      {editing && (
        <RuleForm
          key={editing.id}
          rule={editing}
          fields={fields}
          targets={[field]}
          enabled={enabled}
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

function AddButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 self-start rounded-md border px-2 text-sm ${open ? 'border-accent bg-accent-subtle' : 'border-line-strong hover:bg-row-hover'}`}
      style={height}
      aria-expanded={open}
      title={open ? 'Close the new rule without adding it' : 'Add a conditional formatting rule'}
      onClick={onClick}
    >
      <Icon name="plus" /> Conditional formatting
    </button>
  );
}

/**
 * Every conditional format rule that can touch this page: its own rules, then the project-wide rules for this table.
 * The page's rules come first, so they win over the project's when both match.
 */
export function RulesBoard({
  pageRules,
  projectRules,
  canEditProject,
  projectLabel,
  fields,
  columns,
  records,
  noun,
  enabled = ALL_VIEWS,
  onPageRules,
  onProjectRules,
}: {
  pageRules: ConditionalFormat[];
  projectRules: ConditionalFormat[];
  canEditProject: boolean;
  /** For example "every Shots page in The Last Lamplighter". */
  projectLabel: string;
  fields: EffectiveField[];
  /** Fields a rule can paint on its own. */
  columns: EffectiveField[];
  records: Array<Record<string, unknown>>;
  /** Plural record name, for example "shots". */
  noun: string;
  /** Views turned on for the page. */
  enabled?: TableView[];
  onPageRules: (rules: ConditionalFormat[]) => void;
  onProjectRules: (rules: ConditionalFormat[]) => void;
}) {
  const [editing, setEditing] = useState<{ rule: ConditionalFormat; scope: 'page' | 'project' } | null>(null);
  const adding = !!editing && ![...pageRules, ...projectRules].some((rule) => rule.id === editing.rule.id);
  const save = (rule: ConditionalFormat, scope: 'page' | 'project') => {
    const wasPage = pageRules.some((item) => item.id === rule.id);
    const wasProject = projectRules.some((item) => item.id === rule.id);
    const inPage = scope === 'page';
    onPageRules(inPage ? (wasPage ? pageRules.map((item) => (item.id === rule.id ? rule : item)) : [...pageRules, rule]) : pageRules.filter((item) => item.id !== rule.id));
    onProjectRules(!inPage ? (wasProject ? projectRules.map((item) => (item.id === rule.id ? rule : item)) : [...projectRules, rule]) : projectRules.filter((item) => item.id !== rule.id));
    setEditing(null);
  };
  const group = (title: string, detail: string, rules: ConditionalFormat[], scope: 'page' | 'project') => {
    const readOnly = scope === 'project' && !canEditProject;
    return (
      <section className="flex flex-col gap-1" aria-label={title}>
        <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h4>
        <p className="text-xs text-fg-subtle">{detail}</p>
        {rules.length === 0 ? (
          <p className="py-1 text-sm text-fg-subtle">No rules.</p>
        ) : (
          <RuleList
            rules={rules}
            fields={fields}
            enabled={enabled}
            readOnly={readOnly}
            onReorder={scope === 'page' ? onPageRules : onProjectRules}
            onEdit={(rule) => setEditing({ rule, scope })}
            onRemove={(rule) => (scope === 'page' ? onPageRules(pageRules.filter((item) => item.id !== rule.id)) : onProjectRules(projectRules.filter((item) => item.id !== rule.id)))}
          />
        )}
      </section>
    );
  };
  return (
    <div className="flex flex-col gap-4 text-sm">
      <p className="text-fg-muted">
        Every rule that can format this page. They run from the top, this page&apos;s rules before project-wide ones; when several match a record or a field, the highest one sets its format.
      </p>
      {group('This page', 'Saved with this page.', pageRules, 'page')}
      {group('Project-wide', `${projectLabel}${canEditProject ? '.' : '. Changed by someone who can manage the schema.'}`, projectRules, 'project')}
      <AddButton open={adding} onClick={() => setEditing(adding ? null : { rule: freshRule(columns[0] ?? fields[0]!, fields), scope: 'page' })} />
      {editing && (
        <RuleForm
          key={editing.rule.id}
          rule={editing.rule}
          fields={fields}
          targets={columns}
          enabled={enabled}
          adding={adding}
          scope={{ value: editing.scope, canEditProject, projectLabel }}
          records={records}
          noun={noun}
          onSave={(rule, scope) => save(rule, scope ?? editing.scope)}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function RuleForm({
  rule: initial,
  fields,
  targets,
  enabled = ALL_VIEWS,
  adding,
  scope: scopeOption,
  records,
  noun,
  onSave,
  onCancel,
}: {
  rule: ConditionalFormat;
  fields: EffectiveField[];
  /** Fields the rule can paint on their own; with one, the form offers just that field or the whole record. */
  targets: EffectiveField[];
  /** Views turned on for the page; the Views choice lists only these. */
  enabled?: TableView[];
  adding: boolean;
  /** Where the rule is kept, when the form offers the choice. */
  scope?: { value: 'page' | 'project'; canEditProject: boolean; projectLabel: string };
  /** Records to count matches against. */
  records?: Array<Record<string, unknown>>;
  noun?: string;
  onSave: (rule: ConditionalFormat, scope?: 'page' | 'project') => void;
  onCancel: () => void;
}) {
  const [rule, setRule] = useState(initial);
  const [scope, setScope] = useState(scopeOption?.value);
  const update = (change: Partial<ConditionalFormat>) => setRule((current) => ({ ...current, ...change }));
  const setStyle = (change: Partial<ConditionalFormat['style']>) => update({ style: { ...rule.style, ...change } });
  const ready = rule.conditions.length > 0 && rule.conditions.every((condition) => conditionReady(condition, fields));
  const views = rule.views ?? ALL_VIEWS;
  const single = targets.length === 1 ? targets[0] : undefined;
  const firstTarget = targets.find((target) => target.code === rule.applyTo) ?? targets[0];
  const matching = records ? records.filter((record) => ready && ruleMatches({ ...rule, enabled: true }, record, fields)).length : undefined;
  return (
    <div className="flex flex-col gap-3 rounded-md border border-line-strong p-3" role="group" aria-label={adding ? 'New rule' : `Edit ${ruleSummary(initial, fields)}`}>
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
          onClick={() => update({ conditions: [...rule.conditions, newCondition(firstTarget ?? fields[0]!, fields)] })}
        >
          <Icon name="plus" /> Add condition
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Paint">
        <span className="w-24 shrink-0 text-fg-muted">Paint</span>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={rule.applyTo !== 'row'} onChange={() => update({ applyTo: firstTarget?.code ?? 'row' })} className="accent-[var(--sgp-color-accent)]" />
          Only {single ? single.label : 'the'}
          {!single && (
            <select aria-label="Field to paint" className={control} style={height} disabled={rule.applyTo === 'row'} value={rule.applyTo === 'row' ? firstTarget?.code : rule.applyTo} onChange={(event) => update({ applyTo: event.target.value })}>
              {targets.map((target) => (
                <option key={target.code} value={target.code}>
                  {target.label}
                </option>
              ))}
            </select>
          )}
          {!single && 'field'}
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
      <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Views">
        <span className="w-24 shrink-0 text-fg-muted">Views</span>
        {enabled.map((view) => (
          <label key={view} className="flex items-center gap-1.5">
            <input
              type="checkbox"
              aria-label={`Show in ${VIEW_NAME[view]} view`}
              checked={views.includes(view)}
              onChange={() => {
                const next = views.includes(view) ? views.filter((item) => item !== view) : [...views, view];
                update({ views: next.length === ALL_VIEWS.length ? undefined : next });
              }}
              className="accent-[var(--sgp-color-accent)]"
            />
            <Icon name={VIEW_ICON[view]} size={14} className="text-fg-subtle" />
            {VIEW_NAME[view]}
          </label>
        ))}
      </div>
      {scopeOption && (
        <div className="flex flex-wrap items-center gap-3" role="radiogroup" aria-label="Keep the rule">
          <span className="w-24 shrink-0 text-fg-muted">Keep it</span>
          <label className="flex items-center gap-1.5">
            <input type="radio" checked={scope === 'page'} onChange={() => setScope('page')} className="accent-[var(--sgp-color-accent)]" />
            On this page
          </label>
          <label
            className={`flex items-center gap-1.5 ${scopeOption.canEditProject ? '' : 'opacity-50'}`}
            title={scopeOption.canEditProject ? undefined : 'Project-wide rules need a permission set that manages the schema.'}
          >
            <input type="radio" disabled={!scopeOption.canEditProject} checked={scope === 'project'} onChange={() => setScope('project')} className="accent-[var(--sgp-color-accent)]" />
            Project-wide, {scopeOption.projectLabel}
          </label>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Sample style={rule.style}>Sample</Sample>
        {matching !== undefined && records && (
          <span className="text-xs text-fg-subtle" role="status">
            Matches {matching} of {records.length} {noun ?? 'records'}
          </span>
        )}
        <button
          type="button"
          className={`ml-auto rounded-md px-3 text-sm font-medium text-fg-inverse ${ready ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
          style={height}
          disabled={!ready}
          title={ready ? undefined : 'Finish the condition first. A value is still needed.'}
          onClick={() => onSave({ ...rule, name: ruleSummary(rule, fields) }, scope)}
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

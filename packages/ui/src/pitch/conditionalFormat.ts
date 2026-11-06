import {
  statusValues,
  type ConditionalFormat,
  type ConditionOp,
  type ConditionValue,
  type EffectiveField,
  type Expr,
  type FormatCondition,
  type FormatStyle,
} from '@sgp/mock-data';
import type { CSSProperties } from 'react';
import { calculateField } from './formulaValue';
import { TODAY } from './Gantt';
import { formatDate } from './shotsPage';

/** How a field behaves in a condition. Calculated fields take the kind of their result. */
export type ValueKind = 'date' | 'number' | 'list' | 'text' | 'presence' | 'checkbox';

function exprIsDate(expr: Expr | undefined, fields: EffectiveField[]): boolean {
  if (!expr) return false;
  if ('duration' in expr) return true;
  if ('field' in expr) return kindOf(fields.find((f) => f.code === expr.field), fields) === 'date';
  if ('args' in expr) return expr.args.some((a) => exprIsDate(a, fields));
  return false;
}

export function kindOf(field: EffectiveField | undefined, fields: EffectiveField[]): ValueKind {
  if (!field) return 'text';
  switch (field.type) {
    case 'date':
      return 'date';
    case 'number':
    case 'currency':
    case 'percent':
    case 'duration':
    case 'summary':
      return 'number';
    case 'calculated':
      return exprIsDate(field.formula, fields) ? 'date' : 'number';
    case 'status':
    case 'list':
      return 'list';
    case 'checkbox':
      return 'checkbox';
    case 'text':
    case 'url':
    case 'color':
      return 'text';
    default:
      return 'presence';
  }
}

export const OPS: Record<ValueKind, Array<{ op: ConditionOp; label: string }>> = {
  date: [
    { op: 'lte', label: 'is on or before (≤)' },
    { op: 'lt', label: 'is before (<)' },
    { op: 'gte', label: 'is on or after (≥)' },
    { op: 'gt', label: 'is after (>)' },
    { op: 'eq', label: 'is on (=)' },
    { op: 'neq', label: 'is not on (≠)' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  number: [
    { op: 'eq', label: '=' },
    { op: 'neq', label: '≠' },
    { op: 'lt', label: '<' },
    { op: 'lte', label: '≤' },
    { op: 'gt', label: '>' },
    { op: 'gte', label: '≥' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  list: [
    { op: 'any_of', label: 'is' },
    { op: 'none_of', label: 'is not' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  text: [
    { op: 'contains', label: 'contains' },
    { op: 'not_contains', label: 'does not contain' },
    { op: 'eq', label: 'is' },
    { op: 'neq', label: 'is not' },
    { op: 'starts_with', label: 'starts with' },
    { op: 'empty', label: 'is empty' },
    { op: 'not_empty', label: 'is not empty' },
  ],
  presence: [
    { op: 'not_empty', label: 'is not empty' },
    { op: 'empty', label: 'is empty' },
  ],
  checkbox: [
    { op: 'checked', label: 'is checked' },
    { op: 'unchecked', label: 'is not checked' },
  ],
};

export const needsValue = (op: ConditionOp) => !['empty', 'not_empty', 'checked', 'unchecked'].includes(op);

/** A condition can be saved: every slot the operator asks for has a value. */
export function conditionReady(condition: FormatCondition, fields: EffectiveField[]) {
  if (!fields.some((f) => f.code === condition.field) || !condition.op) return false;
  if (!needsValue(condition.op)) return true;
  const value = condition.value;
  if (!value) return false;
  if (value.kind === 'values') return value.values.length > 0;
  if (value.kind === 'today') return Number.isFinite(value.offsetDays);
  if (value.kind === 'field') return value.field.length > 0;
  if (typeof value.value === 'number') return Number.isFinite(value.value);
  return value.value.trim().length > 0;
}

/** A sensible starting value whenever the field or operator changes. */
export function defaultValue(kind: ValueKind): ConditionValue | undefined {
  if (kind === 'date') return { kind: 'today', offsetDays: 0 };
  if (kind === 'number') return { kind: 'value', value: 0 };
  if (kind === 'list') return { kind: 'values', values: [] };
  if (kind === 'text') return { kind: 'value', value: '' };
  return undefined;
}

export function newCondition(field: EffectiveField, fields: EffectiveField[]): FormatCondition {
  const kind = kindOf(field, fields);
  return { field: field.code, op: OPS[kind][0].op, value: defaultValue(kind) };
}

const DAY_MS = 86_400_000;
const addDays = (iso: string, days: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

type AnyRecord = Record<string, unknown>;

function resolve(value: ConditionValue | undefined, record: AnyRecord, kind: ValueKind) {
  if (!value) return undefined;
  if (value.kind === 'today') return Number.isFinite(value.offsetDays) ? addDays(TODAY, value.offsetDays) : undefined;
  if (value.kind === 'field') return value.field ? normalize(record[value.field], kind) : undefined;
  if (value.kind === 'values') return value.values.length > 0 ? value.values : undefined;
  // A blank entry is null: "contains" with nothing typed must not match every record.
  if (typeof value.value === 'string' && value.value.trim() === '') return undefined;
  return value.value;
}

function normalize(raw: unknown, kind: ValueKind) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (kind === 'date') return String(raw).slice(0, 10);
  if (kind === 'number') return Number(raw);
  return raw;
}

function isEmpty(raw: unknown) {
  return raw === undefined || raw === null || raw === '' || (Array.isArray(raw) && raw.length === 0);
}

export function conditionMatches(condition: FormatCondition, record: AnyRecord, fields: EffectiveField[]): boolean {
  const field = fields.find((f) => f.code === condition.field);
  const kind = kindOf(field, fields);
  const raw = field?.type === 'calculated' ? calculateField(field, record, fields) : record[condition.field];
  if (condition.op === 'empty') return isEmpty(raw);
  if (condition.op === 'not_empty') return !isEmpty(raw);
  if (condition.op === 'checked') return raw === true;
  if (condition.op === 'unchecked') return raw !== true;
  const left = normalize(raw, kind);
  const right = resolve(condition.value, record, kind);
  if (left === undefined || right === undefined) return false;
  if (condition.op === 'any_of') return (right as string[]).includes(String(left));
  if (condition.op === 'none_of') return !(right as string[]).includes(String(left));
  if (kind === 'text') {
    const a = String(left).toLowerCase();
    const b = String(right).toLowerCase();
    if (condition.op === 'contains') return a.includes(b);
    if (condition.op === 'not_contains') return !a.includes(b);
    if (condition.op === 'starts_with') return a.startsWith(b);
  }
  // Dates compare as ISO strings, numbers as numbers.
  const a = left as string | number;
  const b = (kind === 'number' ? Number(right) : right) as string | number;
  switch (condition.op) {
    case 'eq':
      return a === b;
    case 'neq':
      return a !== b;
    case 'lt':
      return a < b;
    case 'lte':
      return a <= b;
    case 'gt':
      return a > b;
    case 'gte':
      return a >= b;
    default:
      return false;
  }
}

export function ruleMatches(rule: ConditionalFormat, record: AnyRecord, fields: EffectiveField[]) {
  if (!rule.enabled || rule.conditions.length === 0) return false;
  const results = rule.conditions.map((c) => conditionMatches(c, record, fields));
  return rule.match === 'all' ? results.every(Boolean) : results.some(Boolean);
}

/** The winning style for a record: the first matching row rule, and per column the first matching cell rule. */
export function formatsFor(rules: ConditionalFormat[], record: AnyRecord, fields: EffectiveField[]) {
  let row: FormatStyle | undefined;
  const cells: Record<string, FormatStyle> = {};
  for (const rule of rules) {
    if (!ruleMatches(rule, record, fields)) continue;
    if (rule.applyTo === 'row') row ??= rule.style;
    else cells[rule.applyTo] ??= rule.style;
  }
  return { row, cells };
}

/** Inline style for a formatted row or cell. Background is a tint so text stays legible in both themes. */
export function styleCss(style: FormatStyle | undefined): CSSProperties {
  if (!style) return {};
  const tint = style.background && `color-mix(in srgb, ${style.background} 24%, transparent)`;
  return {
    ...(style.text ? ({ '--sgp-cf-text': style.text } as CSSProperties) : {}),
    backgroundImage: tint ? `linear-gradient(${tint}, ${tint})` : undefined,
    boxShadow: style.border ? `inset 0 0 0 1.5px ${style.border}` : undefined,
    fontWeight: style.bold ? 600 : undefined,
  };
}

/** Class that makes text formatting override the muted and accent text colors inside the formatted element. */
export const formatClass = (style: FormatStyle | undefined) => (style?.text ? 'sgp-cf-text' : '');

/** The default data palette, as offered in the format pickers. */
export const PALETTE = ['red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink', 'gray'].map(
  (name) => ({ name, value: `var(--sgp-palette-${name})` }),
);

const statusLabel = (code: string) => statusValues.find((s) => s.code === code)?.label ?? code;

function describeValue(condition: FormatCondition, fields: EffectiveField[]) {
  const value = condition.value;
  if (!needsValue(condition.op) || !value) return '';
  if (value.kind === 'today') {
    const n = value.offsetDays;
    return n === 0 ? 'Today' : `Today ${n > 0 ? '+' : '−'} ${Math.abs(n)} ${Math.abs(n) === 1 ? 'day' : 'days'}`;
  }
  if (value.kind === 'field') return fields.find((f) => f.code === value.field)?.label ?? value.field;
  if (value.kind === 'values') return value.values.map(statusLabel).join(' or ') || '(pick a value)';
  const field = fields.find((f) => f.code === condition.field);
  if (kindOf(field, fields) === 'date' && typeof value.value === 'string' && value.value) return formatDate(value.value);
  return kindOf(field, fields) === 'text' ? `"${value.value}"` : String(value.value);
}

/** "Due is on or before Today + 7", in words, for the rule list. */
export function describeCondition(condition: FormatCondition, fields: EffectiveField[]) {
  const field = fields.find((f) => f.code === condition.field);
  const op = OPS[kindOf(field, fields)].find((o) => o.op === condition.op)?.label ?? condition.op;
  return [field?.label ?? condition.field, op, describeValue(condition, fields)].filter(Boolean).join(' ');
}

import type { EffectiveField, Expr } from '@sgp/mock-data';

/** A formula result: a number, an ISO date, or a yes/no from a comparison. */
export type FormulaResult = number | string | boolean | null;

const DAY_MS = 86_400_000;

function shiftDate(iso: string, days: number): string {
  const base = iso.slice(0, 10);
  return new Date(Date.parse(`${base}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

function asDate(value: FormulaResult): string | null {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;
}

function asNumber(value: FormulaResult): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'boolean') return value ? 1 : 0;
  return null;
}

function truthy(value: FormulaResult): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return value.length > 0;
  return false;
}

function compare(op: string, left: FormulaResult, right: FormulaResult): boolean | null {
  const dateLeft = asDate(left);
  const dateRight = asDate(right);
  const a = dateLeft && dateRight ? dateLeft : asNumber(left);
  const b = dateLeft && dateRight ? dateRight : asNumber(right);
  if (a == null || b == null) return null;
  switch (op) {
    case 'gt':
      return a > b;
    case 'lt':
      return a < b;
    case 'gte':
      return a >= b;
    case 'lte':
      return a <= b;
    case 'eq':
      return a === b;
    case 'neq':
      return a !== b;
    default:
      return null;
  }
}

function applyOp(op: string, left: FormulaResult, right: FormulaResult): FormulaResult {
  if (op === 'and') return truthy(left) && truthy(right);
  if (op === 'or') return truthy(left) || truthy(right);
  const compared = compare(op, left, right);
  if (compared !== null || op === 'gt' || op === 'lt' || op === 'gte' || op === 'lte' || op === 'eq' || op === 'neq') return compared;

  const dateLeft = asDate(left);
  const dateRight = asDate(right);
  const numLeft = asNumber(left);
  const numRight = asNumber(right);
  if (op === 'add' || op === 'subtract') {
    if (dateLeft && numRight != null) return shiftDate(dateLeft, op === 'add' ? numRight : -numRight);
    if (dateRight && numLeft != null && op === 'add') return shiftDate(dateRight, numLeft);
    if (dateLeft && dateRight && op === 'subtract') return Math.round((Date.parse(`${dateLeft}T00:00:00Z`) - Date.parse(`${dateRight}T00:00:00Z`)) / DAY_MS);
  }
  if (numLeft == null || numRight == null) return null;
  switch (op) {
    case 'add':
      return numLeft + numRight;
    case 'subtract':
      return numLeft - numRight;
    case 'multiply':
      return numLeft * numRight;
    case 'divide':
      return numRight === 0 ? null : numLeft / numRight;
    default:
      return null;
  }
}

/** Run a formula against one record. Calculated fields it mentions are run first, and a loop stops at the stored value. */
export function evaluateExpr(
  expr: Expr | undefined,
  record: Record<string, unknown>,
  fields: EffectiveField[] = [],
  stack: Set<string> = new Set(),
): FormulaResult {
  if (!expr) return null;
  if ('fn' in expr) {
    return truthy(evaluateExpr(expr.args[0], record, fields, stack))
      ? evaluateExpr(expr.args[1], record, fields, stack)
      : evaluateExpr(expr.args[2], record, fields, stack);
  }
  if ('cond' in expr) {
    for (const branch of expr.cond.branches) {
      if (truthy(evaluateExpr(branch.when, record, fields, stack))) return evaluateExpr(branch.then, record, fields, stack);
    }
    return expr.cond.otherwise ? evaluateExpr(expr.cond.otherwise, record, fields, stack) : null;
  }
  if ('op' in expr && expr.args.length === 2) {
    if (expr.op === 'and') {
      const left = evaluateExpr(expr.args[0], record, fields, stack);
      return truthy(left) ? truthy(evaluateExpr(expr.args[1], record, fields, stack)) : false;
    }
    if (expr.op === 'or') {
      const left = evaluateExpr(expr.args[0], record, fields, stack);
      return truthy(left) ? true : truthy(evaluateExpr(expr.args[1], record, fields, stack));
    }
    return applyOp(expr.op, evaluateExpr(expr.args[0], record, fields, stack), evaluateExpr(expr.args[1], record, fields, stack));
  }
  if ('aggregate' in expr) return null;
  if ('duration' in expr) return (expr.duration.weeks ?? 0) * 7 + (expr.duration.days ?? 0);
  if ('value' in expr) return typeof expr.value === 'number' ? expr.value : String(expr.value);
  if ('field' in expr && typeof expr.field === 'string') {
    const field = fields.find((item) => item.code === expr.field);
    if (field?.type === 'calculated' && field.formula && !stack.has(field.code)) {
      const next = new Set(stack);
      next.add(field.code);
      return evaluateExpr(field.formula, record, fields, next);
    }
    const raw = record[expr.field];
    if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw;
    return null;
  }
  return null;
}

/** The value a calculated field has on one record. A formula that mentions itself uses the stored value. */
export function calculateField(field: EffectiveField, record: Record<string, unknown>, fields: EffectiveField[] = [field]): FormulaResult {
  if (field.type !== 'calculated' || !field.formula) {
    const raw = record[field.code];
    if (typeof raw === 'number' || typeof raw === 'string' || typeof raw === 'boolean') return raw;
    return null;
  }
  return evaluateExpr(field.formula, record, fields, new Set([field.code]));
}

/** Text for a calculated result. Dates stay as ISO so the caller can format them. */
export function formulaText(value: FormulaResult): string {
  if (value == null || value === '') return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return '';
    const nearest = Math.round(value);
    return String(Math.abs(value - nearest) < 1e-9 ? nearest : Math.round(value * 1000) / 1000);
  }
  return value;
}

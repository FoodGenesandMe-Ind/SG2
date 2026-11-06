import type { EffectiveField, Expr } from '@sgp/mock-data';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

const height = { height: 'var(--sgp-row-compact)' };

/** The name a formula uses for a field, from its label: "Cut in" → cut_in. */
export function systemName(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'field';
}

type Operator = '(' | ')' | '+' | '-' | '*' | '/' | '>' | '<' | '=' | '!=' | '>=' | '<=';
type Keyword = 'if' | 'then' | 'and' | 'or' | 'else' | 'elseif';

type Chip =
  | { id: string; kind: 'field'; code: string; name: string }
  | { id: string; kind: 'op'; op: Operator }
  | { id: string; kind: 'number'; value: string }
  | { id: string; kind: 'duration'; amount: string; unit: 'weeks' | 'days' }
  | { id: string; kind: 'keyword'; word: Keyword }
  | { id: string; kind: 'error'; text: string };

const KEYWORDS: Keyword[] = ['if', 'then', 'and', 'or', 'else', 'elseif'];
const MATH: Operator[] = ['(', ')', '+', '-', '/', '*'];
const COMPARE: Operator[] = ['>', '<', '=', '!='];
const SINGLE: Operator[] = ['(', ')', '+', '-', '*', '/', '>', '<', '='];

let chipSeq = 0;
function nextId() {
  chipSeq += 1;
  return `chip-${chipSeq}`;
}

function fieldChip(code: string, name: string): Chip {
  return { id: nextId(), kind: 'field', code, name };
}
function opChip(op: Operator): Chip {
  return { id: nextId(), kind: 'op', op };
}
function numberChip(value: string): Chip {
  return { id: nextId(), kind: 'number', value };
}
function durationChip(amount: string, unit: 'weeks' | 'days'): Chip {
  return { id: nextId(), kind: 'duration', amount, unit };
}
function keywordChip(word: Keyword): Chip {
  return { id: nextId(), kind: 'keyword', word };
}
function errorChip(text: string): Chip {
  return { id: nextId(), kind: 'error', text };
}

function signature(chips: Chip[]): string {
  return chips
    .map((chip) => {
      if (chip.kind === 'field') return `f:${chip.code}`;
      if (chip.kind === 'op') return `o:${chip.op}`;
      if (chip.kind === 'number') return `n:${chip.value}`;
      if (chip.kind === 'duration') return `d:${chip.amount}${chip.unit}`;
      if (chip.kind === 'keyword') return `k:${chip.word}`;
      return `e:${chip.text}`;
    })
    .join(' ');
}

const OP_SYMBOL: Record<string, Operator | Keyword | undefined> = {
  add: '+',
  subtract: '-',
  multiply: '*',
  divide: '/',
  gt: '>',
  lt: '<',
  gte: '>=',
  lte: '<=',
  eq: '=',
  neq: '!=',
  and: 'and',
  or: 'or',
};

function formulaToChips(expr: Expr | undefined, nameOf: (code: string) => string, known: Set<string>): Chip[] {
  if (!expr) return [];
  if ('fn' in expr) {
    const [when, yes, no] = expr.args;
    return [keywordChip('if'), ...formulaToChips(when, nameOf, known), keywordChip('then'), ...formulaToChips(yes, nameOf, known), keywordChip('else'), ...formulaToChips(no, nameOf, known)];
  }
  if ('cond' in expr) {
    const parts: Chip[] = [];
    expr.cond.branches.forEach((branch, index) => {
      parts.push(keywordChip(index === 0 ? 'if' : 'elseif'), ...formulaToChips(branch.when, nameOf, known), keywordChip('then'), ...formulaToChips(branch.then, nameOf, known));
    });
    if (expr.cond.otherwise) parts.push(keywordChip('else'), ...formulaToChips(expr.cond.otherwise, nameOf, known));
    return parts;
  }
  if ('op' in expr && expr.args.length === 2) {
    const symbol = OP_SYMBOL[expr.op];
    const left = formulaToChips(expr.args[0], nameOf, known);
    const right = formulaToChips(expr.args[1], nameOf, known);
    if (symbol === 'and' || symbol === 'or') return [...left, keywordChip(symbol), ...right];
    if (!symbol || isKeywordWord(symbol)) return [errorChip(expr.op)];
    return [...left, opChip(symbol), ...right];
  }
  if ('aggregate' in expr) return [errorChip(expr.aggregate)];
  if ('duration' in expr) {
    if (expr.duration.weeks) return [durationChip(String(expr.duration.weeks), 'weeks')];
    if (expr.duration.days) return [durationChip(String(expr.duration.days), 'days')];
    return [numberChip('0')];
  }
  if ('value' in expr) return [numberChip(String(expr.value))];
  if ('field' in expr) return known.has(expr.field) ? [fieldChip(expr.field, nameOf(expr.field))] : [errorChip(expr.field)];
  return [];
}

function isKeywordWord(token: string): token is Keyword {
  return (KEYWORDS as string[]).includes(token);
}

/** Turn a typed run into chips, leaving a word that might still be growing in `rest`. */
function consume(input: string, names: Map<string, string>): { chips: Chip[]; rest: string } {
  const chips: Chip[] = [];
  let word = '';
  const words = [...KEYWORDS, 'weeks', 'days'];
  const longerThan = (token: string) =>
    words.some((item) => item !== token && item.startsWith(token)) || [...names.keys()].some((name) => name !== token && name.startsWith(token));
  const isPrefix = (token: string) => words.some((item) => item.startsWith(token)) || [...names.keys()].some((name) => name.startsWith(token));
  const flush = (forced: boolean) => {
    if (!word) return;
    if (/^-?\d+(\.\d+)?$/.test(word)) {
      if (!forced) return;
      chips.push(numberChip(word));
      word = '';
      return;
    }
    const token = word.toLowerCase();
    if (!forced && (isPrefix(token) || /^-?\d*\.?\d*$/.test(word))) return;
    if ((token === 'weeks' || token === 'days') && chips[chips.length - 1]?.kind === 'number') {
      const amount = chips.pop();
      if (amount?.kind === 'number') chips.push(durationChip(amount.value, token));
      word = '';
      return;
    }
    if (names.has(token)) chips.push(fieldChip(names.get(token)!, token));
    else if (isKeywordWord(token)) chips.push(keywordChip(token));
    else chips.push(errorChip(word));
    word = '';
  };

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]!;
    if (/\s/.test(ch)) {
      flush(true);
      continue;
    }
    const two = ch + (input[i + 1] ?? '');
    if (two === '!=' || two === '>=' || two === '<=' || two === '<>') {
      flush(true);
      chips.push(opChip(two === '<>' ? '!=' : (two as Operator)));
      i += 1;
      continue;
    }
    if (ch === '!') {
      flush(true);
      chips.push(errorChip('!'));
      continue;
    }
    if (SINGLE.includes(ch as Operator)) {
      if (ch === '-' && word === '' && /[\d.]/.test(input[i + 1] ?? '')) {
        word = '-';
        continue;
      }
      flush(true);
      chips.push(opChip(ch as Operator));
      continue;
    }
    if (!/[A-Za-z0-9_.]/.test(ch)) {
      flush(true);
      chips.push(errorChip(ch));
      continue;
    }
    if (/[A-Za-z_]/.test(ch) && /^-?\d+(\.\d+)?$/.test(word)) flush(true);
    word += ch;
    const token = word.toLowerCase();
    const closed = !/[A-Za-z0-9_]/.test(input[i + 1] ?? '');
    if (closed && !longerThan(token) && (isKeywordWord(token) || names.has(token) || token === 'weeks' || token === 'days')) flush(true);
  }
  if (word && !/^-?\d*\.?\d*$/.test(word) && !isPrefix(word.toLowerCase())) flush(true);
  return { chips, rest: word };
}

const COMPARE_OP: Partial<Record<Operator, 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq'>> = {
  '>': 'gt',
  '<': 'lt',
  '>=': 'gte',
  '<=': 'lte',
  '=': 'eq',
  '!=': 'neq',
};

function compile(chips: Chip[]): Expr | null {
  if (chips.some((chip) => chip.kind === 'error') || chips.length === 0) return null;
  let index = 0;
  const peek = () => chips[index];
  const eat = () => chips[index++];
  const keyword = (word?: Keyword) => {
    const chip = peek();
    return chip?.kind === 'keyword' && (word === undefined || chip.word === word) ? chip : null;
  };
  const stopped = (stop: Set<Keyword>) => {
    const chip = keyword();
    return !!chip && stop.has(chip.word);
  };

  const parseStatement = (stop: Set<Keyword>): Expr | null => {
    if (stopped(stop)) return null;
    if (keyword('if')) return parseIf(stop);
    return parseOr(stop);
  };

  const parseIf = (stop: Set<Keyword>): Expr | null => {
    eat();
    const branches: Array<{ when: Expr; then: Expr }> = [];
    const takeBranch = () => {
      const when = parseOr(new Set(['then']));
      if (!when || !keyword('then')) return null;
      eat();
      const thenExpr = parseStatement(new Set([...stop, 'else', 'elseif']));
      if (!thenExpr) return null;
      branches.push({ when, then: thenExpr });
      return true;
    };
    if (!takeBranch()) return null;
    while (keyword('elseif')) {
      eat();
      if (!takeBranch()) return null;
    }
    let otherwise: Expr | undefined;
    if (keyword('else')) {
      eat();
      const elseExpr = parseStatement(stop);
      if (!elseExpr) return null;
      otherwise = elseExpr;
    }
    return { cond: { branches, ...(otherwise ? { otherwise } : {}) } };
  };

  const parseOr = (stop: Set<Keyword>): Expr | null => {
    let left = parseAnd(stop);
    if (!left) return null;
    while (!stopped(stop) && keyword('or')) {
      eat();
      const right = parseAnd(stop);
      if (!right) return null;
      left = { op: 'or', args: [left, right] };
    }
    return left;
  };

  const parseAnd = (stop: Set<Keyword>): Expr | null => {
    let left = parseCompare(stop);
    if (!left) return null;
    while (!stopped(stop) && keyword('and')) {
      eat();
      const right = parseCompare(stop);
      if (!right) return null;
      left = { op: 'and', args: [left, right] };
    }
    return left;
  };

  const parseCompare = (stop: Set<Keyword>): Expr | null => {
    const left = parseAdd(stop);
    if (!left || stopped(stop)) return left;
    const op = peek();
    if (op?.kind !== 'op' || !COMPARE_OP[op.op]) return left;
    eat();
    const right = parseAdd(stop);
    if (!right) return null;
    return { op: COMPARE_OP[op.op]!, args: [left, right] };
  };

  const parseAdd = (stop: Set<Keyword>): Expr | null => {
    let left = parseMul(stop);
    if (!left) return null;
    while (!stopped(stop) && peek()?.kind === 'op' && (peek()!.kind === 'op' && ((peek() as { op: Operator }).op === '+' || (peek() as { op: Operator }).op === '-'))) {
      const op = (eat() as { op: Operator }).op;
      const right = parseMul(stop);
      if (!right) return null;
      left = { op: op === '+' ? 'add' : 'subtract', args: [left, right] };
    }
    return left;
  };

  const parseMul = (stop: Set<Keyword>): Expr | null => {
    let left = parseUnary(stop);
    if (!left) return null;
    while (!stopped(stop) && peek()?.kind === 'op' && ((peek() as { op: Operator }).op === '*' || (peek() as { op: Operator }).op === '/')) {
      const op = (eat() as { op: Operator }).op;
      const right = parseUnary(stop);
      if (!right) return null;
      left = { op: op === '*' ? 'multiply' : 'divide', args: [left, right] };
    }
    return left;
  };

  const parseUnary = (stop: Set<Keyword>): Expr | null => {
    if (stopped(stop)) return null;
    const token = peek();
    if (!token) return null;
    if (token.kind === 'number') {
      eat();
      return { value: Number(token.value) };
    }
    if (token.kind === 'duration') {
      eat();
      const amount = Number(token.amount) || 0;
      return token.unit === 'weeks' ? { duration: { weeks: amount } } : { duration: { days: amount } };
    }
    if (token.kind === 'field') {
      eat();
      return { field: token.code };
    }
    if (token.kind === 'op' && token.op === '(') {
      eat();
      const inner = parseStatement(stop);
      if (!inner || peek()?.kind !== 'op' || (peek() as { op: Operator }).op !== ')') return null;
      eat();
      return inner;
    }
    return null;
  };

  const result = parseStatement(new Set());
  return result && index === chips.length ? result : null;
}

function chipText(chip: Chip): string {
  if (chip.kind === 'field') return chip.name;
  if (chip.kind === 'op') return chip.op;
  if (chip.kind === 'number') return chip.value;
  if (chip.kind === 'duration') return `${chip.amount} ${chip.unit}`;
  if (chip.kind === 'keyword') return chip.word;
  return chip.text;
}

const ELIGIBLE = new Set(['number', 'date', 'duration', 'currency', 'percent', 'calculated']);

/** Chip formula. The cursor sits between chips and is where the next piece lands. */
export function FormulaEditor({
  formula,
  fields,
  selfCode,
  canManage,
  onSave,
}: {
  formula?: Expr;
  fields: EffectiveField[];
  selfCode: string;
  canManage: boolean;
  onSave: (formula: Expr) => void;
}) {
  const names = new Map<string, string>();
  for (const field of fields) {
    if (field.code === selfCode || !ELIGIBLE.has(field.type)) continue;
    const name = systemName(field.label);
    if (!names.has(name)) names.set(name, field.code);
  }
  const nameOf = (code: string) => {
    const field = fields.find((item) => item.code === code);
    return field ? systemName(field.label) : code;
  };
  const known = new Set(fields.map((item) => item.code));
  const knownKey = fields.map((item) => item.code).join('|');
  const initial = formulaToChips(formula, nameOf, known);
  const savedKey = signature(initial);
  const [chips, setChips] = useState<Chip[]>(initial);
  const [buffer, setBuffer] = useState('');
  const [caret, setCaret] = useState(initial.length);
  const [selected, setSelected] = useState<string | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const caretRef = useRef(initial.length);
  caretRef.current = caret;
  const formulaKey = JSON.stringify(formula ?? null);

  useEffect(() => {
    const next = formulaToChips(formula, nameOf, known);
    const nextKey = signature(next);
    setChips((current) => (signature(current) === nextKey ? current : next));
    setCaret((current) => {
      const clamped = Math.min(current, next.length);
      caretRef.current = clamped;
      return clamped;
    });
    // Reload when the stored formula or the available fields change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selfCode, formulaKey, knownKey]);

  const at = Math.min(caret, chips.length);

  const insertChips = (next: Chip[]) => {
    const index = caretRef.current;
    setChips((current) => {
      const start = Math.min(index, current.length);
      return [...current.slice(0, start), ...next, ...current.slice(start)];
    });
    const moved = index + next.length;
    caretRef.current = moved;
    setCaret(moved);
    setSelected(null);
  };

  const add = (next: Chip[]) => {
    const pending = buffer ? consume(`${buffer} `, names).chips : [];
    insertChips([...pending, ...next]);
    setBuffer('');
  };

  const onType = (value: string) => {
    const { chips: made, rest } = consume(value, names);
    if (made.length) insertChips(made);
    setBuffer(rest);
  };

  const removeAt = (index: number) => {
    setChips((current) => current.filter((_, chipIndex) => chipIndex !== index));
    setCaret((current) => {
      const next = index < current ? current - 1 : current;
      caretRef.current = next;
      return next;
    });
    setSelected(null);
  };

  const placeCaret = (index: number) => {
    const clamped = Math.max(0, Math.min(index, chips.length));
    caretRef.current = clamped;
    setCaret(clamped);
    setSelected(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const moveLine = (direction: -1 | 1) => {
    const slots = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-caret]') ?? [])];
    const current = slots.find((slot) => Number(slot.dataset.caret) === at);
    if (!current) return;
    const here = current.getBoundingClientRect();
    let best: { index: number; score: number } | null = null;
    for (const slot of slots) {
      const index = Number(slot.dataset.caret);
      if (index === at) continue;
      const rect = slot.getBoundingClientRect();
      const dy = rect.top - here.top;
      if (direction < 0 ? dy >= -4 : dy <= 4) continue;
      const score = Math.abs(dy) * 8 + Math.abs(rect.left - here.left);
      if (!best || score < best.score) best = { index, score };
    }
    if (best) placeCaret(best.index);
  };

  const onChipPointerDown = (event: ReactPointerEvent<HTMLElement>, id: string, index: number) => {
    if (!canManage) return;
    event.preventDefault();
    event.stopPropagation();
    const origin = event.clientX;
    const chipWidth = event.currentTarget.getBoundingClientRect();
    let moved = false;
    const move = (pointer: PointerEvent) => {
      if (Math.abs(pointer.clientX - origin) < 4) return;
      moved = true;
      const nodes = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-chip]') ?? [])];
      const over = nodes.findIndex((node) => pointer.clientX < node.getBoundingClientRect().left + node.getBoundingClientRect().width / 2);
      setChips((current) => {
        const from = current.findIndex((chip) => chip.id === id);
        if (from < 0) return current;
        const target = over < 0 ? current.length - 1 : over > from ? over - 1 : over;
        if (target === from) return current;
        const next = [...current];
        const [item] = next.splice(from, 1);
        next.splice(target, 0, item!);
        return next;
      });
    };
    const up = (pointer: PointerEvent) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      if (moved) return;
      const before = pointer.clientX < chipWidth.left + chipWidth.width / 2;
      placeCaret(before ? index : index + 1);
      setSelected(id);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const cursor = input.selectionStart ?? 0;
    const selecting = input.selectionStart !== input.selectionEnd;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (at > 0) placeCaret(at - 1);
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      if (at < chips.length) placeCaret(at + 1);
      return;
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      moveLine(event.key === 'ArrowUp' ? -1 : 1);
      return;
    }
    if (event.key === 'Backspace' && (buffer.length === 0 || (cursor === 0 && !selecting))) {
      event.preventDefault();
      if (selected) {
        const index = chips.findIndex((chip) => chip.id === selected);
        if (index >= 0) removeAt(index);
        return;
      }
      if (at > 0) removeAt(at - 1);
      return;
    }
    if (event.key === 'Delete' && (buffer.length === 0 || cursor === buffer.length)) {
      event.preventDefault();
      if (selected) {
        const index = chips.findIndex((chip) => chip.id === selected);
        if (index >= 0) removeAt(index);
        return;
      }
      if (at < chips.length) removeAt(at);
    }
  };

  const typed = buffer ? consume(buffer, names) : { chips: [] as Chip[], rest: '' };
  const restToken = typed.rest.toLowerCase();
  const restReady = typed.rest.length > 0 && (names.has(restToken) || isKeywordWord(restToken) || /^-?\d+(\.\d+)?$/.test(typed.rest));
  const pending = restReady ? [...typed.chips, ...consume(`${typed.rest} `, names).chips] : typed.chips;
  const preview = pending.length ? [...chips.slice(0, at), ...pending, ...chips.slice(at)] : chips;
  const compiled = compile(preview);
  const changed = signature(preview) !== savedKey;
  const canSave = canManage && changed && compiled !== null && (typed.rest.length === 0 || restReady);
  const wordChip = (chip: Chip) => chip.kind === 'field' || chip.kind === 'keyword';

  const saveFormula = () => {
    if (!compiled || (typed.rest.length > 0 && !restReady)) return;
    setChips(preview);
    setBuffer('');
    const moved = Math.min(at + pending.length, preview.length);
    caretRef.current = moved;
    setCaret(moved);
    onSave(compiled);
  };

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <p className="text-xs text-fg-subtle">
        Example: <span className="font-mono text-fg-muted">cut_in - cut_out + 1</span>
      </p>
      <p className="text-xs text-fg-subtle">
        Example: <span className="font-mono text-fg-muted">if cut_in &gt; cut_out then cut_in else cut_out</span>
      </p>
      <div
        ref={rowRef}
        className="flex min-h-16 flex-wrap items-center gap-1 rounded-md border border-line-strong bg-surface-sunken p-2"
        onMouseDown={(event) => {
          if (!canManage) return;
          if ((event.target as HTMLElement).closest('[data-chip], [data-caret], input')) return;
          const slots = [...(rowRef.current?.querySelectorAll<HTMLElement>('[data-caret]') ?? [])];
          let best = at;
          let score = Number.POSITIVE_INFINITY;
          for (const slot of slots) {
            const rect = slot.getBoundingClientRect();
            const dx = Math.abs(rect.left + rect.width / 2 - event.clientX);
            const dy = Math.abs(rect.top + rect.height / 2 - event.clientY);
            const next = dy * 4 + dx;
            if (next < score) {
              score = next;
              best = Number(slot.dataset.caret);
            }
          }
          placeCaret(best);
        }}
      >
        {Array.from({ length: chips.length + 1 }, (_, index) => (
          <span
            key={`gap-${index}`}
            data-caret={index}
            style={{ order: index * 2 }}
            className={`inline-flex shrink-0 cursor-text items-center justify-center rounded-sm hover:bg-row-hover ${index === at ? 'w-0' : 'w-3'}`}
            onMouseDown={(event) => {
              if (!canManage) return;
              event.preventDefault();
              placeCaret(index);
            }}
          />
        ))}
        {chips.map((chip, index) => (
          <span
            key={chip.id}
            data-chip={chip.id}
            style={{ order: index * 2 + 1, ...height }}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => onChipPointerDown(event, chip.id, index)}
            className={`inline-flex cursor-grab items-center gap-1 rounded-sm px-1.5 font-mono text-xs ${
              chip.kind === 'error' ? 'bg-danger text-fg-inverse' : wordChip(chip) ? 'bg-accent-subtle text-fg' : 'text-fg'
            } ${selected === chip.id ? 'outline outline-2 outline-accent' : ''}`}
          >
            {chip.kind === 'error' && <span aria-hidden>!</span>}
            {chipText(chip)}
          </span>
        ))}
        {canManage && (
          <span className="inline-flex items-center" style={{ order: at * 2 }}>
            <span className="mr-0.5 inline-block h-4 w-px bg-accent" aria-hidden />
            <input
              ref={inputRef}
              aria-label="Formula"
              value={buffer}
              placeholder={chips.length ? '' : 'Type a formula'}
              className="bg-transparent font-mono text-xs text-fg outline-none placeholder:text-fg-subtle"
              style={chips.length === 0 && buffer.length === 0 ? { width: '9rem' } : { width: `${Math.max(1.5, buffer.length + 0.5)}rem` }}
              onChange={(event) => onType(event.target.value)}
              onKeyDown={onInputKeyDown}
              onMouseDown={(event) => event.stopPropagation()}
            />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-fg-subtle">Fields</span>
        <div className="flex flex-wrap gap-1">
          {[...names.entries()].map(([name, code]) => (
            <button
              key={code}
              type="button"
              disabled={!canManage}
              className="rounded-sm bg-accent-subtle px-1.5 font-mono text-xs text-fg hover:bg-row-hover disabled:opacity-40"
              style={height}
              onClick={() => add([fieldChip(code, name)])}
            >
              {name}
            </button>
          ))}
        </div>
        <span className="text-xs text-fg-subtle">Operators</span>
        <div className="flex flex-wrap gap-1">
          {[...MATH, ...COMPARE].map((op) => (
            <button
              key={op}
              type="button"
              disabled={!canManage}
              className="min-w-7 rounded-sm border border-line-strong px-1.5 font-mono text-xs hover:bg-row-hover disabled:opacity-40"
              style={height}
              onClick={() => add([opChip(op)])}
            >
              {op}
            </button>
          ))}
        </div>
        <span className="text-xs text-fg-subtle">Logic</span>
        <div className="flex flex-wrap gap-1">
          {KEYWORDS.map((word) => (
            <button
              key={word}
              type="button"
              disabled={!canManage}
              className="rounded-sm bg-accent-subtle px-1.5 font-mono text-xs text-fg hover:bg-row-hover disabled:opacity-40"
              style={height}
              onClick={() => add([keywordChip(word)])}
            >
              {word}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${canSave ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
          style={height}
          disabled={!canSave}
          onMouseDown={(event) => event.preventDefault()}
          onClick={saveFormula}
        >
          Save
        </button>
        {preview.some((chip) => chip.kind === 'error') && <span className="text-xs text-danger">Fix the highlighted piece before saving.</span>}
        {changed && !preview.some((chip) => chip.kind === 'error') && !compiled && (
          <span className="text-xs text-fg-subtle">Finish the formula to save it.</span>
        )}
        {!canManage && <span className="text-xs text-fg-subtle">Changing a calculated field needs permission to manage the schema.</span>}
      </div>
    </div>
  );
}

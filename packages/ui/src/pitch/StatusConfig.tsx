import { statusValues, type StatusMeaning, type StatusValue } from '@sgp/mock-data';
import { lazy, Suspense, useState } from 'react';
import { Icon } from './Icon';
import { useReorder } from './reorder';
import { StatusPill } from './StatusPill';

// The icon libraries are large, so they load only when someone creates a status.
const IconPicker = lazy(() => import('./IconPicker').then((module) => ({ default: module.IconPicker })));

const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

const labelOf = (code: string) => statusValues.find((status) => status.code === code)?.label ?? code;

/** Follows hidden-status replacements to the status records finally move to. */
export function resolveReplacement(code: string, replacements: Record<string, string>) {
  let current = code;
  const seen = new Set<string>();
  while (replacements[current] && !seen.has(current)) {
    seen.add(current);
    current = replacements[current]!;
  }
  return current;
}

/**
 * The statuses a status field offers, in order. Order drives sorting, kanban columns, and the pick list.
 * Hiding a status that records use asks for the status those records move to.
 */
export function StatusOptions({
  values,
  replacements,
  usage,
  canManage,
  noun,
  onChange,
}: {
  values: string[];
  /** Hidden status → the status its records move to, applied when the change is saved. */
  replacements: Record<string, string>;
  /** How many records use a status now. */
  usage: (code: string) => number;
  canManage: boolean;
  /** "shot", "task": for counts. */
  noun: string;
  onChange: (values: string[], replacements: Record<string, string>) => void;
}) {
  const [hiding, setHiding] = useState<{ code: string; to: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const reorder = useReorder({ ids: values, onReorder: (next) => onChange(next, replacements) });
  const plural = (n: number) => `${n} ${n === 1 ? noun : `${noun}s`}`;
  const usedBy = (code: string) => {
    const moving = Object.entries(replacements)
      .filter(([from]) => resolveReplacement(from, replacements) === code)
      .reduce((sum, [from]) => sum + usage(from), 0);
    return usage(code) + moving;
  };

  const requestHide = (code: string) => {
    if (values.length <= 1) return;
    if (usedBy(code) === 0) {
      onChange(values.filter((item) => item !== code), replacements);
      return;
    }
    setHiding({ code, to: values.find((item) => item !== code) ?? '' });
  };

  const confirmHide = () => {
    if (!hiding?.to) return;
    onChange(
      values.filter((item) => item !== hiding.code),
      { ...replacements, [hiding.code]: hiding.to },
    );
    setHiding(null);
  };

  const show = (code: string) => {
    if (values.includes(code)) return;
    const { [code]: _restored, ...rest } = replacements;
    onChange([...values, code], rest);
  };

  const pending = Object.entries(replacements).filter(([from]) => !values.includes(from));

  return (
    <fieldset disabled={!canManage} className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 text-fg-muted">Statuses, in order</legend>
      <p className="text-xs text-fg-subtle">Drag to reorder. The order sets ascending and descending sorts, kanban columns, and the pick list.</p>
      <div ref={reorder.listRef} className="relative flex flex-col" data-status-list>
        {reorder.indicator}
        {values.map((code) => {
          const count = usedBy(code);
          const status = statusValues.find((item) => item.code === code);
          return (
            <div key={code} data-status-row className={`flex flex-col rounded-sm transition-opacity ${reorder.dimClass(code)}`}>
              <div {...reorder.itemProps(code)} data-status-head className="flex items-center gap-2 px-1" style={height}>
                <button
                  type="button"
                  className="flex size-6 shrink-0 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg active:cursor-grabbing"
                  aria-label={`Drag ${labelOf(code)} to reorder`}
                  title="Drag to reorder"
                  onPointerDown={(event) => canManage && reorder.startDrag(code, event)}
                >
                  <Icon name="grip-vertical" size={14} />
                </button>
                <span className="min-w-0 flex-1 truncate">
                  <StatusPill code={code} pillStyle="tint" display="long" />
                </span>
                <span className="w-10 shrink-0 font-mono text-xs text-fg-subtle">{status?.shortLabel}</span>
                <span className="w-20 shrink-0 text-right text-xs text-fg-subtle">{count ? plural(count) : 'Not used'}</span>
                <button
                  type="button"
                  className="w-14 shrink-0 text-right text-xs text-accent hover:underline disabled:cursor-default disabled:text-fg-subtle disabled:no-underline"
                  aria-label={`Remove ${labelOf(code)}`}
                  title={values.length <= 1 ? 'A status field needs at least one status' : undefined}
                  disabled={values.length <= 1}
                  onClick={() => requestHide(code)}
                >
                  Remove
                </button>
              </div>
              {hiding?.code === code && (
                <div className="mb-1 ml-8 flex flex-wrap items-center gap-2 rounded-md border border-warning p-2">
                  <span className="text-sm">
                    {plural(count)} {count === 1 ? 'uses' : 'use'} {labelOf(code)}. Move {count === 1 ? 'it' : 'them'} to
                  </span>
                  <select
                    aria-label="Replacement status"
                    className={control}
                    style={height}
                    value={hiding.to}
                    onChange={(event) => setHiding({ code, to: event.target.value })}
                  >
                    {values
                      .filter((item) => item !== code)
                      .map((item) => (
                        <option key={item} value={item}>
                          {labelOf(item)}
                        </option>
                      ))}
                  </select>
                  <button type="button" className="rounded-md bg-accent px-3 text-sm font-medium text-fg-inverse hover:bg-accent-hover" style={height} onClick={confirmHide}>
                    Remove and move
                  </button>
                  <button type="button" className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={() => setHiding(null)}>
                    Keep
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {pending.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-2 text-xs text-fg-muted">
          {pending.map(([from]) => (
            <span key={from} className="flex items-center gap-2">
              <Icon name="arrow-right" size={12} className="text-fg-subtle" />
              {labelOf(from)} is removed. Its {plural(usage(from))} move to {labelOf(resolveReplacement(from, replacements))} when you save.
              <button type="button" className="ml-auto text-accent hover:underline" onClick={() => show(from)}>
                Undo
              </button>
            </span>
          ))}
        </div>
      )}
      <button
        type="button"
        className={`flex items-center gap-1.5 self-start rounded-md border px-2 text-sm ${creating ? 'border-accent bg-accent-subtle' : 'border-line-strong hover:bg-row-hover'} disabled:opacity-40`}
        style={height}
        aria-expanded={creating}
        onClick={() => setCreating((open) => !open)}
      >
        <Icon name="plus" size={13} /> Add Status
      </button>
      {creating && (
        <CreateStatus
          listed={values}
          onAddExisting={(code) => {
            show(code);
            setCreating(false);
          }}
          onCreate={(status) => {
            if (!statusValues.some((item) => item.code === status.code)) statusValues.push(status);
            onChange([...values, status.code], replacements);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      )}
      {!canManage && <p className="text-xs text-fg-subtle">Changing statuses needs permission to manage the schema.</p>}
    </fieldset>
  );
}

function CreateStatus({
  listed,
  onAddExisting,
  onCreate,
  onCancel,
}: {
  /** Statuses already on this field. */
  listed: string[];
  /** Bring back a status the studio already has. */
  onAddExisting: (code: string) => void;
  onCreate: (status: StatusValue) => void;
  onCancel: () => void;
}) {
  const swatches = [...new Set(statusValues.map((status) => status.color))];
  const [label, setLabel] = useState('');
  const [short, setShort] = useState('');
  const [icon, setIcon] = useState('circle');
  const [color, setColor] = useState(swatches[0] ?? '#6f7378');
  // The product does not ask for a meaning; new statuses count as in progress where a meaning is needed.
  const meaning: StatusMeaning = 'active';
  const shortLabel = (short || label.replace(/[^A-Za-z0-9]/g, '').slice(0, 3)).toUpperCase().slice(0, 4);
  const code = `cs-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const taken = statusValues.some((status) => status.code === code || status.label.toLowerCase() === label.trim().toLowerCase());
  const ready = label.trim().length > 0 && !taken;
  const preview: StatusValue = { code: '__preview', label: label || 'New status', shortLabel: shortLabel || 'NEW', color, icon, meaning };
  const needle = label.trim().toLowerCase();
  const existing = needle
    ? statusValues.filter(
        (status) =>
          !listed.includes(status.code) &&
          (status.label.toLowerCase().split(/\s+/).some((word) => word.startsWith(needle)) || status.label.toLowerCase().startsWith(needle) || status.shortLabel.toLowerCase() === needle),
      )
    : [];
  const alreadyListed = statusValues.find((status) => listed.includes(status.code) && status.label.toLowerCase() === needle);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line p-3">
      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-40 flex-1 flex-col gap-1">
          <span className="text-fg-muted">Long name</span>
          <input className={control} style={height} value={label} placeholder="In Lighting" onChange={(event) => setLabel(event.target.value)} />
          {existing.length > 0 && (
            <span className="flex flex-wrap items-center gap-1 text-xs text-fg-subtle">
              The studio already has
              {existing.slice(0, 5).map((status) => (
                <button
                  key={status.code}
                  type="button"
                  title={`Add ${status.label} to this field`}
                  className="rounded-sm hover:bg-row-hover"
                  onClick={() => onAddExisting(status.code)}
                >
                  <StatusPill code={status.code} pillStyle="tint" display="long" />
                </button>
              ))}
              <span>Click one to add it.</span>
            </span>
          )}
          {alreadyListed && <span className="text-xs text-fg-subtle">{alreadyListed.label} is already on this field.</span>}
        </label>
        <label className="flex w-24 flex-col gap-1">
          <span className="text-fg-muted">Short name</span>
          <input
            className={`${control} font-mono uppercase`}
            style={height}
            value={short}
            maxLength={4}
            placeholder={shortLabel || 'LGT'}
            onChange={(event) => setShort(event.target.value.toUpperCase())}
          />
        </label>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-fg-muted">Icon</span>
        <Suspense fallback={<p className="text-xs text-fg-subtle">Loading icons…</p>}>
          <IconPicker value={icon} color={color} onChange={setIcon} />
        </Suspense>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-fg-muted">Color</span>
        <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Color">
          {swatches.map((swatch) => (
            <button
              key={swatch}
              type="button"
              role="radio"
              aria-checked={color === swatch}
              aria-label={swatch}
              className={`size-6 rounded-sm border-2 ${color === swatch ? 'border-fg' : 'border-transparent'}`}
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
            />
          ))}
          <label className="ml-1 flex items-center gap-1 text-xs text-fg-subtle">
            Other
            <input type="color" aria-label="Other color" value={color} onChange={(event) => setColor(event.target.value)} className="size-6 cursor-pointer rounded-sm bg-transparent" />
          </label>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-fg-subtle">Preview</span>
        <PreviewPill status={preview} />
        {taken && label.trim() && !alreadyListed && !existing.some((status) => status.label.toLowerCase() === needle) && (
          <span className="text-xs text-danger">A status with that name already exists.</span>
        )}
        <span className="ml-auto flex gap-2">
          <button type="button" className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${ready ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={!ready}
            onClick={() => onCreate({ code, label: label.trim(), shortLabel: shortLabel || 'NEW', color, icon, meaning })}
          >
            Add status
          </button>
        </span>
      </div>
    </div>
  );
}

/** The pill for a status that is not saved yet, drawn the same way as StatusPill's tint style. */
function PreviewPill({ status }: { status: StatusValue }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-1.5 text-xs font-medium leading-5 whitespace-nowrap"
      style={{
        background: `color-mix(in srgb, ${status.color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${status.color} 38%, transparent)`,
        color: `color-mix(in srgb, ${status.color} 72%, var(--sgp-color-text))`,
      }}
    >
      <Icon name={status.icon} size={12} />
      {status.label}
      <span className="font-mono opacity-70">{status.shortLabel}</span>
    </span>
  );
}

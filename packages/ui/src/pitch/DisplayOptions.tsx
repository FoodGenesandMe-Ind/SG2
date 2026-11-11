import type { ConditionalFormat, DateFormat, EffectiveField, GroupLevel, NumberDisplay, StatusDisplay, TableView } from '@sgp/mock-data';
import { useState, type ReactNode } from 'react';
import { kindOf } from './conditionalFormat';
import { DATE_FORMATS } from './dates';
import { isGroupable } from './grouping';
import { FieldFormats, rulesFormatting } from './FieldFormats';
import { fieldSystemName } from './formulaEditor';
import { Icon } from './Icon';
import { VIEW_ICON } from './shotsPage';
import { CURRENCIES, DISPLAY_STYLES, formatNumber, isNumberField } from './numberDisplay';
import { isShotView, VIEW_NAME, withFieldEntry, withViewDisplay, type ShotView, type ViewDisplays } from './viewDisplay';
import { canWrap, toggleWrap, type WrapByPlace, type WrapPlace } from './wrap';

const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';
const choice = (on: boolean) =>
  `inline-flex items-center gap-1.5 rounded-md border px-2 text-sm ${on ? 'border-accent bg-accent-subtle text-fg' : 'border-line-strong text-fg-muted hover:bg-row-hover'}`;

/** The display settings Manage fields edits, per view. Saved with the page. */
export interface DisplayDraft {
  wrap: WrapByPlace;
  viewDisplay: ViewDisplays;
  /** The page's conditional format rules, in order, as edited here. */
  formats: ConditionalFormat[];
  /** The gantt's grouping of its tasks. */
  taskGrouping: GroupLevel[];
}

/** What a view does when it has no setting of its own. */
export interface DisplayDefaults {
  sort: GroupLevel[];
  grouping: GroupLevel[];
  statusDisplay: StatusDisplay;
}

const WRAP_PLACES_OF: Record<ShotView, WrapPlace[]> = {
  table: ['table'],
  card: ['cardHeader', 'cardBody'],
  thumb: ['thumbInside', 'thumbBelow'],
  kanban: ['kanbanHeader', 'kanbanBody'],
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** How each option names its setting in tooltips and the replace prompt. */
const SETTING_NOUN: Record<string, string> = {
  sort: 'sort',
  group: 'grouping',
  number: 'number display',
  date: 'date display',
  status: 'status display',
};

/** One view's value of an option: undefined means the view has no setting of its own. */
interface ViewOption<T> {
  views: TableView[];
  get: (view: TableView) => T | undefined;
  set: (view: TableView, value: T | undefined) => void;
  /** What the view actually uses: its own setting, or the page's when it has none. Views compare on this. */
  effective: (view: TableView) => T | undefined;
  /** Why this option does not apply to a view at all. */
  notFor?: (view: TableView) => string | undefined;
}

/**
 * Display options for one field in one view: wrap text, conditional formatting, sort, grouping, and the options its type
 * has (number display, date format, status display). Each has a row of views, compared on what each view actually uses
 * (its own setting, or the page's): a view using the same setting is ticked and changes with this one (untick it to stop
 * that); a view using a different one is ticked but greyed, and clicking it asks before replacing its setting.
 */
export function FieldDisplayOptions({
  field,
  fields,
  tab,
  place,
  draft,
  onDraft,
  defaults,
}: {
  field: EffectiveField;
  fields: EffectiveField[];
  tab: TableView;
  /** For cards, kanban cards, and thumbnails: the part of the card this field was picked in. */
  place?: WrapPlace;
  draft: DisplayDraft;
  onDraft: (change: (current: DisplayDraft) => DisplayDraft) => void;
  defaults: DisplayDefaults;
}) {
  // Per option: views ticked by hand after a replace, and views unticked by hand so they stop following this one.
  const [picked, setPicked] = useState<Record<string, { in: TableView[]; out: TableView[] }>>({});
  // A view with its own, different setting is replaced only after the user says so.
  const [replacing, setReplacing] = useState<{ id: string; view: TableView } | null>(null);
  const code = field.code;
  const name = <span className="font-mono text-fg">{fieldSystemName(field)}</span>;
  const displayOf = (view: TableView) => (isShotView(view) ? draft.viewDisplay[view] : undefined);
  const setDisplay = (view: TableView, change: Parameters<typeof withViewDisplay>[2]) => {
    if (!isShotView(view)) return;
    onDraft((current) => ({ ...current, viewDisplay: withViewDisplay(current.viewDisplay, view, change) }));
  };

  const row = <T,>(id: string, label: string, heading: ReactNode, option: ViewOption<T>, render: (apply: (value: T | undefined) => void) => ReactNode) => {
    const choice = picked[id] ?? { in: [], out: [] };
    const setChoice = (next: { in: TableView[]; out: TableView[] }) => setPicked((all) => ({ ...all, [id]: next }));
    // A view uses the same setting as this one, or a different one (a conflict).
    const matches = (view: TableView) => same(option.effective(view), option.effective(tab));
    // Views that follow this one: those using the same setting, unless unticked here, and those ticked here after a replace.
    const following = option.views.filter(
      (view) => view !== tab && !option.notFor?.(view) && (choice.in.includes(view) || (matches(view) && !choice.out.includes(view))),
    );
    const apply = (value: T | undefined) => {
      option.set(tab, value);
      for (const view of following) option.set(view, value);
    };
    const replace = (view: TableView) => {
      setChoice({ in: [...choice.in.filter((item) => item !== view), view], out: choice.out.filter((item) => item !== view) });
      option.set(view, option.get(tab) ?? option.effective(tab));
    };
    const noun = SETTING_NOUN[id] ?? label.toLowerCase();
    return (
      <OptionBlock
        key={id}
        label={label}
        heading={heading}
        checks={option.views.map((view) => {
          const own = view === tab;
          const reason = option.notFor?.(view);
          const follows = following.includes(view);
          const conflict = !own && !reason && !follows && !matches(view);
          return {
            view,
            // A view with a different setting shows ticked but greyed: it has a setting, just not this one.
            checked: own || follows || conflict,
            disabled: !own && !!reason,
            faded: !own && (!!reason || conflict),
            title: own
              ? `This is the view you are setting. Ticked views use the same ${noun} and change with it.`
              : reason ??
                (conflict
                  ? `${VIEW_NAME[view]} view uses a different ${noun}. Click to replace it with this one.`
                  : follows
                    ? `${VIEW_NAME[view]} view uses the same ${noun}. Untick to stop it changing with this view.`
                    : `${VIEW_NAME[view]} view uses the same ${noun} but does not change with this view. Tick to link it.`),
            onChange: () => {
              if (own) return;
              if (conflict) setReplacing({ id, view });
              else if (follows) setChoice({ in: choice.in.filter((item) => item !== view), out: [...choice.out, view] });
              else setChoice({ in: choice.in, out: choice.out.filter((item) => item !== view) });
            },
          };
        })}
        confirm={
          replacing?.id === id
            ? {
                text: `${VIEW_NAME[replacing.view]} view uses a different ${noun}. Replace it with this one?`,
                keepLabel: `Keep ${VIEW_NAME[replacing.view]} view's`,
                onReplace: () => {
                  replace(replacing.view);
                  setReplacing(null);
                },
                onKeep: () => setReplacing(null),
              }
            : undefined
        }
      >
        {render(apply)}
      </OptionBlock>
    );
  };

  const options: ReactNode[] = [];
  const shotViews: TableView[] = ['table', 'card', 'thumb', 'kanban'];

  if (tab === 'gantt') {
    options.push(
      row<GroupLevel[]>(
        'group',
        'Group by this field',
        <>Group by {name} in the following views:</>,
        {
          views: ['gantt'],
          get: () => (draft.taskGrouping.length ? draft.taskGrouping : undefined),
          effective: () => draft.taskGrouping,
          set: (_view, value) => onDraft((current) => ({ ...current, taskGrouping: value ?? [] })),
        },
        (apply) => {
          const pressed = draft.taskGrouping[0]?.field === code;
          return (
            <button type="button" aria-pressed={pressed} className={`self-start ${choice(pressed)}`} style={height} onClick={() => apply(pressed ? undefined : [{ field: code, direction: 'asc' }])}>
              <Icon name="group" /> Group the gantt by {field.label}
            </button>
          );
        },
      ),
    );
    return <DisplaySection>{options}</DisplaySection>;
  }

  if (canWrap(field)) {
    // In this tab's own view, wrap follows the place the field was picked in (header or body); other views wrap everywhere.
    const places = (view: TableView) => (isShotView(view) ? (view === tab && place ? [place] : WRAP_PLACES_OF[view]) : []);
    const wraps = (view: TableView) => places(view).some((item) => (draft.wrap[item] ?? []).includes(code));
    const setWrap = (view: TableView, on: boolean) =>
      onDraft((current) => {
        let wrap = current.wrap;
        for (const item of places(view)) if ((wrap[item] ?? []).includes(code) !== on) wrap = toggleWrap(wrap, item, code);
        return { ...current, wrap };
      });
    options.push(
      <OptionBlock
        key="wrap"
        label="Wrap text"
        heading={<>Wrap text in {name} in the following views:</>}
        checks={(['table', 'card', 'thumb', 'kanban', 'gantt'] as const).map((view) => {
          const unavailable = view === 'gantt' ? 'The gantt shows Task fields, so Shot fields do not wrap there.' : undefined;
          return { view, checked: !unavailable && wraps(view), disabled: !!unavailable, faded: !!unavailable, title: unavailable, onChange: () => setWrap(view, !wraps(view)) };
        })}
        note="A wrapped value shows whole, over as many lines as it needs."
      />,
    );
  }

  const rules = rulesFormatting(draft.formats, code);
  const allViews: TableView[] = ['table', 'card', 'thumb', 'kanban', 'gantt'];
  options.push(
    <OptionBlock
      key="formats"
      label="Conditional formatting"
      heading={<>Apply conditional formatting to {name} in the following views:</>}
      checks={allViews.map((view) => {
        const shows = rules.length > 0 && rules.every((rule) => (rule.views ?? allViews).includes(view));
        return {
          view,
          checked: shows,
          disabled: rules.length === 0,
          faded: rules.length === 0,
          title: rules.length === 0 ? 'Add a rule first, with + Conditional formatting below.' : undefined,
          onChange: () =>
            onDraft((current) => ({
              ...current,
              formats: current.formats.map((rule) => {
                if (!rules.some((item) => item.id === rule.id)) return rule;
                const list = rule.views ?? allViews;
                const next = shows ? list.filter((item) => item !== view) : [...new Set([...list, view])];
                return { ...rule, views: next.length === allViews.length ? undefined : next };
              }),
            })),
        };
      })}
    >
      <FieldFormats field={field} fields={fields} rules={draft.formats} onRules={(formats) => onDraft((current) => ({ ...current, formats }))} />
    </OptionBlock>,
  );

  if (field.type !== 'media') {
    const effectiveSort = (view: TableView) => displayOf(view)?.sort ?? defaults.sort;
    options.push(
      row<GroupLevel[]>(
        'sort',
        'Sort',
        <>Sort by {name} in the following views:</>,
        {
          views: shotViews,
          get: (view) => displayOf(view)?.sort,
          effective: (view) => displayOf(view)?.sort ?? defaults.sort,
          set: (view, value) => setDisplay(view, (current) => ({ ...current, sort: value })),
        },
        (apply) => (
          <div className="flex gap-1">
            {(['asc', 'desc'] as const).map((direction) => {
              const pressed = effectiveSort(tab)[0]?.field === code && effectiveSort(tab)[0]?.direction === direction;
              return (
                <button
                  key={direction}
                  type="button"
                  aria-pressed={pressed}
                  className={choice(pressed)}
                  style={height}
                  onClick={() => apply(pressed ? undefined : [{ field: code, direction }])}
                >
                  <Icon name={direction === 'asc' ? 'arrow-down-a-z' : 'arrow-up-z-a'} /> Sort {direction === 'asc' ? 'ascending' : 'descending'}
                </button>
              );
            })}
          </div>
        ),
      ),
    );
  }

  if (isGroupable(field.type) && field.type !== 'media') {
    const effectiveGrouping = (view: TableView) => displayOf(view)?.grouping ?? defaults.grouping;
    options.push(
      row<GroupLevel[]>(
        'group',
        'Group by this field',
        <>Group by {name} in the following views:</>,
        {
          views: shotViews,
          get: (view) => displayOf(view)?.grouping,
          effective: (view) => displayOf(view)?.grouping ?? defaults.grouping,
          set: (view, value) => setDisplay(view, (current) => ({ ...current, grouping: value })),
          notFor: (view) => (view === 'kanban' ? 'Kanban view groups by its columns. Choose the column field above the board.' : undefined),
        },
        (apply) => {
          const pressed = effectiveGrouping(tab)[0]?.field === code;
          return (
            <button
              type="button"
              aria-pressed={pressed}
              disabled={tab === 'kanban'}
              title={tab === 'kanban' ? 'Kanban view groups by its columns. Choose the column field above the board.' : undefined}
              className={`self-start ${choice(pressed)} disabled:opacity-40`}
              style={height}
              onClick={() => apply(pressed ? [] : [{ field: code, direction: 'asc' }])}
            >
              <Icon name="group" /> Group by this field
            </button>
          );
        },
      ),
    );
  }

  if (isNumberField(field) || (field.type === 'calculated' && kindOf(field, fields) === 'number')) {
    options.push(
      row<NumberDisplay>(
        'number',
        'Number display',
        <>Apply this number display to {name} in the following views:</>,
        {
          views: shotViews,
          get: (view) => displayOf(view)?.numberDisplay?.[code],
          effective: (view) => displayOf(view)?.numberDisplay?.[code] ?? field.display ?? { style: 'number', decimals: 0 },
          set: (view, value) => setDisplay(view, (current) => ({ ...current, numberDisplay: withFieldEntry(current.numberDisplay, code, value) })),
        },
        (apply) => <NumberDisplayOptions display={displayOf(tab)?.numberDisplay?.[code] ?? field.display} onChange={apply} />,
      ),
    );
  }

  if (field.type === 'date' || (field.type === 'calculated' && kindOf(field, fields) === 'date')) {
    options.push(
      row<DateFormat>(
        'date',
        'Date display',
        <>Apply this date display to {name} in the following views:</>,
        {
          views: shotViews,
          get: (view) => displayOf(view)?.dateFormat?.[code],
          effective: (view) => displayOf(view)?.dateFormat?.[code] ?? 'DD-Mon-YYYY',
          set: (view, value) => setDisplay(view, (current) => ({ ...current, dateFormat: withFieldEntry(current.dateFormat, code, value) })),
        },
        (apply) => (
          <select
            aria-label="Date display"
            className={`${control} self-start`}
            style={height}
            value={displayOf(tab)?.dateFormat?.[code] ?? 'DD-Mon-YYYY'}
            onChange={(event) => apply(event.target.value === 'DD-Mon-YYYY' ? undefined : (event.target.value as DateFormat))}
          >
            {DATE_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value} ({option.sample})
              </option>
            ))}
          </select>
        ),
      ),
    );
  }

  if (field.type === 'status') {
    options.push(
      row<StatusDisplay>(
        'status',
        'Status display',
        <>Apply this status display to {name} in the following views:</>,
        {
          views: shotViews,
          get: (view) => displayOf(view)?.statusDisplay,
          effective: (view) => displayOf(view)?.statusDisplay ?? defaults.statusDisplay,
          set: (view, value) => setDisplay(view, (current) => ({ ...current, statusDisplay: value })),
        },
        (apply) => {
          const current = displayOf(tab)?.statusDisplay ?? defaults.statusDisplay;
          return (
            <div className="flex gap-1" role="radiogroup" aria-label="Status display">
              {(['long', 'short', 'icon'] as const).map((value) => (
                <button key={value} type="button" role="radio" aria-checked={current === value} className={choice(current === value)} style={height} onClick={() => apply(value)}>
                  {value === 'long' ? 'Long name' : value === 'short' ? 'Short name' : 'Icon only'}
                </button>
              ))}
            </div>
          );
        },
      ),
    );
  }

  return <DisplaySection>{options}</DisplaySection>;
}

interface ViewCheck {
  view: TableView;
  checked: boolean;
  disabled: boolean;
  /** Dimmed: the view cannot take this setting, or has its own. */
  faded: boolean;
  title?: string;
  onChange: () => void;
}

/** One display option: a heading, a row of views (each with its view icon), then the option's own controls. */
function OptionBlock({
  label,
  heading,
  checks,
  note,
  confirm,
  children,
}: {
  label: string;
  heading: ReactNode;
  checks: ViewCheck[];
  note?: string;
  /** Asks before a view's own setting is replaced. */
  confirm?: { text: string; keepLabel: string; onReplace: () => void; onKeep: () => void };
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line p-2.5" role="group" aria-label={label}>
      <span className="text-sm text-fg-muted">{heading}</span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {checks.map((check) => (
          <label key={check.view} className={`flex items-center gap-1.5 ${check.faded ? 'opacity-50' : ''}`} title={check.title}>
            <input
              type="checkbox"
              aria-label={`${label} in ${VIEW_NAME[check.view]} view`}
              checked={check.checked}
              disabled={check.disabled}
              onChange={check.onChange}
              className="accent-[var(--sgp-color-accent)]"
            />
            <Icon name={VIEW_ICON[check.view]} size={14} className="text-fg-subtle" />
            {VIEW_NAME[check.view]}
          </label>
        ))}
      </div>
      {confirm && (
        <div role="alertdialog" aria-label={confirm.text} className="flex flex-wrap items-center gap-2 rounded-md border border-line-strong bg-surface-sunken px-2 py-1.5 text-sm">
          <Icon name="triangle-alert" size={14} className="shrink-0 text-fg-muted" />
          <span className="min-w-0 flex-1">{confirm.text}</span>
          <button type="button" className="rounded-md bg-accent px-2 text-sm font-medium text-fg-inverse hover:bg-accent-hover" style={height} onClick={confirm.onReplace}>
            Replace
          </button>
          <button type="button" className="rounded-md border border-line-strong px-2 text-sm hover:bg-row-hover" style={height} onClick={confirm.onKeep}>
            {confirm.keepLabel}
          </button>
        </div>
      )}
      {children && <div className="pt-1">{children}</div>}
      {note && <p className="text-xs text-fg-subtle">{note}</p>}
    </div>
  );
}

function DisplaySection({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2" aria-label="Display options">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Display options</h4>
      {children}
    </section>
  );
}

const DEFAULT_NUMBER: NumberDisplay = { style: 'number', decimals: 0 };

export function NumberDisplayOptions({ display, onChange }: { display?: NumberDisplay; onChange: (display: NumberDisplay) => void }) {
  const current = display ?? DEFAULT_NUMBER;
  const set = (change: Partial<NumberDisplay>) => {
    const next = { ...current, ...change };
    if ((next.style === 'currency' || next.style === 'accounting') && !next.currency) next.currency = 'USD';
    onChange(next);
  };
  const money = current.style === 'currency' || current.style === 'accounting';
  const sample = current.style === 'percent' ? 0.125 : 1234.5;
  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Number display">
        {DISPLAY_STYLES.map((option) => (
          <button key={option.value} type="button" role="radio" aria-checked={current.style === option.value} className={choice(current.style === option.value)} style={height} onClick={() => set({ style: option.value })}>
            {option.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-fg-muted">Decimals</span>
          <select aria-label="Decimals" className={`${control} w-16`} style={height} value={current.decimals} onChange={(event) => set({ decimals: Number(event.target.value) })}>
            {Array.from({ length: 11 }, (_, n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>
        {money && (
          <label className="flex items-center gap-2">
            <span className="text-fg-muted">Currency</span>
            <select aria-label="Currency" className={`${control} w-20`} style={height} value={current.currency ?? 'USD'} onChange={(event) => set({ currency: event.target.value })}>
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="text-xs text-fg-subtle">
        Shows as <span className="font-mono text-fg-muted">{formatNumber(sample, current)}</span> and{' '}
        <span className="font-mono text-fg-muted">{formatNumber(-sample, current)}</span>
        {current.style === 'percent' ? '. A stored 0.125 reads 12.5%.' : '.'} The stored value stays the same.
      </p>
    </div>
  );
}

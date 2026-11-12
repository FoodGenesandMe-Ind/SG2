import type { ConditionalFormat, DateFormat, EffectiveField, GroupLevel, NumberDisplay, StatusDisplay, TableView } from '@sgp/mock-data';
import { useState, type ReactNode } from 'react';
import { kindOf } from './conditionalFormat';
import { DATE_FORMATS } from './dates';
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
  enabled,
  showIn,
}: {
  field: EffectiveField;
  fields: EffectiveField[];
  tab: TableView;
  /** For cards, kanban cards, and thumbnails: the part of the card this field was picked in. */
  place?: WrapPlace;
  draft: DisplayDraft;
  onDraft: (change: (current: DisplayDraft) => DisplayDraft) => void;
  defaults: DisplayDefaults;
  /** Views turned on for the page. Absent: every view. */
  enabled?: TableView[];
  /** Which of the records' views show the field, and the switch for each; the first row of the options. */
  showIn?: {
    views: TableView[];
    shows: (view: TableView) => boolean;
    /** Why a view always shows the field, when it cannot be hidden there. */
    locked: (view: TableView) => string | undefined;
    toggle: (view: TableView) => void;
  };
}) {
  const on = (view: TableView) => !enabled || enabled.includes(view);
  // Per option: views ticked by hand after a replace, and views unticked by hand so they stop following this one.
  const [picked, setPicked] = useState<Record<string, { in: TableView[]; out: TableView[] }>>({});
  // A view with its own, different setting is replaced only after the user says so.
  const [replacing, setReplacing] = useState<{ id: string; view: TableView; text?: string; run?: () => void } | null>(null);
  const code = field.code;
  const name = <span className="font-mono text-fg">{fieldSystemName(field)}</span>;
  const displayOf = (view: TableView) => (isShotView(view) ? draft.viewDisplay[view] : undefined);
  const setDisplay = (view: TableView, change: Parameters<typeof withViewDisplay>[2]) => {
    if (!isShotView(view)) return;
    onDraft((current) => ({ ...current, viewDisplay: withViewDisplay(current.viewDisplay, view, change) }));
  };

  const row = <T,>(id: string, label: string, heading: ReactNode, all: ViewOption<T>, render: (apply: (value: T | undefined) => void) => ReactNode) => {
    const option = { ...all, views: all.views.filter(on) };
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
  if (showIn && tab !== 'gantt') {
    options.push(
      <OptionBlock
        key="show"
        label="Display field"
        heading={<>Display {name} in the following views:</>}
        checks={showIn.views.map((view) => {
          const locked = showIn.locked(view);
          const shown = showIn.shows(view);
          return {
            view,
            checked: shown,
            disabled: !!locked,
            faded: false,
            title:
              locked ??
              (shown ? `${field.label} shows in ${VIEW_NAME[view]} view. Click to hide it there.` : `${field.label} is hidden in ${VIEW_NAME[view]} view. Click to show it there.`),
            onChange: () => showIn.toggle(view),
          };
        })}
      />,
    );
  }
  const shotViews: TableView[] = ['table', 'card', 'thumb', 'kanban'];

  if (tab === 'gantt') {
    return (
      <DisplaySection>
        <p className="text-sm text-fg-subtle">Task columns on the gantt have no display options. Group and sort the gantt from the Group and sort tab.</p>
      </DisplaySection>
    );
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
        checks={(['table', 'card', 'thumb', 'kanban'] as const).filter(on).map((view) => ({
          view,
          checked: wraps(view),
          disabled: false,
          faded: false,
          title: wraps(view)
            ? `${field.label} wraps in ${VIEW_NAME[view]} view. Click to keep it on one line.`
            : `${field.label} stays on one line in ${VIEW_NAME[view]} view. Click to wrap it.`,
          onChange: () => setWrap(view, !wraps(view)),
        }))}
        note="A wrapped value shows whole, over as many lines as it needs."
      />,
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

  return (
    <DisplaySection>
      {options.length > 0 ? options : <p className="text-sm text-fg-subtle">No display options for this kind of field. Conditional formatting, and group and sort, have tabs of their own.</p>}
    </DisplaySection>
  );
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
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
        {checks.map((check) => (
          <label
            key={check.view}
            className={`-mx-1 flex cursor-pointer items-center gap-1.5 rounded-sm px-1.5 py-1 hover:bg-row-hover ${check.faded ? 'opacity-50' : ''}`}
            title={check.title ?? `${label} is ${check.checked ? 'on' : 'off'} in ${VIEW_NAME[check.view]} view. Click to turn it ${check.checked ? 'off' : 'on'}.`}
          >
            <input
              type="checkbox"
              aria-label={`${label} in ${VIEW_NAME[check.view]} view`}
              checked={check.checked}
              disabled={check.disabled}
              onChange={check.onChange}
              className="accent-[var(--sgp-color-accent)] disabled:pointer-events-none"
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

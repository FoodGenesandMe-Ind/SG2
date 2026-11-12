import type { ConditionalFormat, DateFormat, EffectiveField, GroupLevel, NumberDisplay, StatusDisplay, TableView } from '@sgp/mock-data';
import { Fragment, useId, type ReactNode } from 'react';
import { kindOf } from './conditionalFormat';
import { DATE_FORMATS } from './dates';
import { fieldSystemName } from './formulaEditor';
import { Icon } from './Icon';
import { VIEW_ICON } from './shotsPage';
import { CURRENCIES, DISPLAY_STYLES, formatNumber, isNumberField } from './numberDisplay';
import { isShotView, VIEW_NAME, withFieldEntry, withViewDisplay, type ShotView, type ViewDisplays } from './viewDisplay';
import { canWrap, toggleWrap, type WrapByPlace, type WrapPlace } from './wrap';

const height = { height: 'var(--sgp-row-compact)' };
const DEFAULT_NUMBER: NumberDisplay = { style: 'number', decimals: 0 };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

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

/** One view's tick box in a row of the grid; null leaves the cell blank. */
interface GridCheck {
  checked: boolean;
  disabled?: boolean;
  title: string;
  onChange: () => void;
}

/** A row of the display grid: a group title, tick boxes, one choice of a group (one pick per column), or a control per view. */
type GridRow =
  | { kind: 'title'; id: string; label: string }
  | { kind: 'check'; id: string; label: string; title: string; cell: (view: TableView) => GridCheck | null }
  | {
      kind: 'choice';
      id: string;
      /** Choices in the same group share a column's single pick. */
      group: string;
      label: ReactNode;
      /** The choice's name in words, for tooltips and screen readers. */
      text: string;
      title: string;
      picked: (view: TableView) => boolean | null;
      onPick: (view: TableView) => void;
      cellTitle: (view: TableView, picked: boolean) => string;
    }
  | { kind: 'control'; id: string; label: string; cell: (view: TableView, disabled: boolean) => ReactNode };

/**
 * Display options for one field as one grid: the views across the top, then a row per setting. Display (which views show
 * the field) and Wrap text are tick boxes; status, number, and date display are groups of choices, one pick per view,
 * every view starting on the first choice. Number display adds Decimals, and Currency when a view uses money. A view that
 * does not show the field leaves its cells blank below Display. Every view keeps its column: one turned off for the page
 * is greyed and cannot be changed. A field the field list does not show has every option unticked and locked.
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
  shown = true,
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
  /** Whether the field list shows the field; when it does not, nothing here can change. */
  shown?: boolean;
  /** Which of the records' views show the field, and the switch for each; the first row of the grid. */
  showIn?: {
    views: TableView[];
    shows: (view: TableView) => boolean;
    /** Why a view always shows the field, when it cannot be hidden there. */
    locked: (view: TableView) => string | undefined;
    toggle: (view: TableView) => void;
  };
}) {
  const on = (view: TableView) => !enabled || enabled.includes(view);
  const code = field.code;
  const name = <span className="font-mono text-fg">{fieldSystemName(field)}</span>;
  const displayOf = (view: TableView) => (isShotView(view) ? draft.viewDisplay[view] : undefined);
  const setDisplay = (view: TableView, change: Parameters<typeof withViewDisplay>[2]) => {
    if (!isShotView(view)) return;
    onDraft((current) => ({ ...current, viewDisplay: withViewDisplay(current.viewDisplay, view, change) }));
  };

  if (tab === 'gantt') {
    return (
      <DisplaySection>
        <p className="text-sm text-fg-subtle">Task columns on the gantt have no display options. Group and sort the gantt from the Group and sort tab.</p>
      </DisplaySection>
    );
  }

  const viewColumns: TableView[] = ['table', 'card', 'thumb', 'kanban'];
  const shows = (view: TableView) => !showIn || showIn.shows(view);
  const viewName = (view: TableView) => `${VIEW_NAME[view]} view`;
  const rows: GridRow[] = [];

  if (showIn) {
    rows.push({
      kind: 'check',
      id: 'display',
      label: 'Display',
      title: `Display ${field.label} in the ticked views.`,
      cell: (view) => {
        const locked = showIn.locked(view);
        const shown = showIn.shows(view);
        return {
          checked: shown,
          disabled: !!locked,
          title: locked ?? (shown ? `${field.label} shows in ${viewName(view)}. Click to hide it there.` : `${field.label} is hidden in ${viewName(view)}. Click to show it there.`),
          onChange: () => showIn.toggle(view),
        };
      },
    });
  }

  if (canWrap(field)) {
    // In this tab's own view, wrap follows the place the field was picked in (header or body); other views wrap everywhere.
    const places = (view: TableView) => (isShotView(view) ? (view === tab && place ? [place] : WRAP_PLACES_OF[view]) : []);
    const wraps = (view: TableView) => places(view).some((item) => (draft.wrap[item] ?? []).includes(code));
    const setWrap = (view: TableView, value: boolean) =>
      onDraft((current) => {
        let wrap = current.wrap;
        for (const item of places(view)) if ((wrap[item] ?? []).includes(code) !== value) wrap = toggleWrap(wrap, item, code);
        return { ...current, wrap };
      });
    rows.push({
      kind: 'check',
      id: 'wrap',
      label: 'Wrap text',
      title: 'A wrapped value shows whole, over as many lines as it needs.',
      cell: (view) =>
        shows(view)
          ? {
              checked: wraps(view),
              title: wraps(view) ? `${field.label} wraps in ${viewName(view)}. Click to keep it on one line.` : `${field.label} stays on one line in ${viewName(view)}. Click to wrap it.`,
              onChange: () => setWrap(view, !wraps(view)),
            }
          : null,
    });
  }

  /** A group of choices, one pick per view. */
  const choices = (group: string, items: Array<{ id: string; label: ReactNode; text: string; title: string }>, value: (view: TableView) => string, pick: (view: TableView, id: string) => void, note?: (view: TableView, id: string) => string) => {
    for (const item of items) {
      rows.push({
        kind: 'choice',
        id: `${group}:${item.id}`,
        group,
        label: item.label,
        text: item.text,
        title: item.title,
        picked: (view) => (shows(view) ? value(view) === item.id : null),
        onPick: (view) => pick(view, item.id),
        cellTitle: (view, picked) =>
          `${picked ? `${viewName(view)} shows ${field.label} as ${item.text}.` : `Click to show ${field.label} as ${item.text} in ${viewName(view)}.`} ${note?.(view, item.id) ?? item.title}`,
      });
    }
  };

  if (field.type === 'status') {
    rows.push({ kind: 'title', id: 'status', label: 'Status display' });
    choices(
      'status',
      [
        { id: 'long', label: 'Long name', text: 'Long name', title: 'Each status shows its full name.' },
        { id: 'short', label: 'Short name', text: 'Short name', title: 'Each status shows its short code.' },
        { id: 'icon', label: 'Icon only', text: 'Icon only', title: 'Each status shows only its icon; its name is in the tooltip.' },
      ],
      (view) => displayOf(view)?.statusDisplay ?? defaults.statusDisplay,
      (view, value) => setDisplay(view, (current) => ({ ...current, statusDisplay: value as StatusDisplay })),
    );
  }

  if (isNumberField(field) || (field.type === 'calculated' && kindOf(field, fields) === 'number')) {
    const numberOf = (view: TableView) => displayOf(view)?.numberDisplay?.[code] ?? field.display ?? DEFAULT_NUMBER;
    const money = (display: NumberDisplay) => display.style === 'currency' || display.style === 'accounting';
    const setNumber = (view: TableView, change: Partial<NumberDisplay>) => {
      const next = { ...numberOf(view), ...change };
      if (money(next) && !next.currency) next.currency = 'USD';
      setDisplay(view, (current) => ({ ...current, numberDisplay: withFieldEntry(current.numberDisplay, code, next) }));
    };
    const sample = (display: NumberDisplay) => formatNumber(display.style === 'percent' ? 0.125 : 1234.5, display);
    rows.push({ kind: 'title', id: 'number', label: 'Number display' });
    choices(
      'number',
      DISPLAY_STYLES.map((item) => ({ id: item.value, label: item.label, text: item.label, title: `${item.label}, for example ${item.example}.` })),
      (view) => numberOf(view).style,
      (view, style) => setNumber(view, { style: style as NumberDisplay['style'] }),
      (view, style) => `It shows as ${sample({ ...numberOf(view), style: style as NumberDisplay['style'] })}.`,
    );
    rows.push({
      kind: 'control',
      id: 'decimals',
      label: 'Decimals',
      cell: (view, disabled) =>
        shows(view) || !shown ? (
          <select
            aria-label={`Decimals in ${viewName(view)}`}
            disabled={disabled}
            title={`Digits after the decimal point in ${viewName(view)}: ${numberOf(view).decimals}. A value there shows as ${sample(numberOf(view))}.`}
            className={`${control} w-16`}
            style={height}
            value={numberOf(view).decimals}
            onChange={(event) => setNumber(view, { decimals: Number(event.target.value) })}
          >
            {Array.from({ length: 11 }, (_, n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        ) : null,
    });
    if (viewColumns.some((view) => shows(view) && money(numberOf(view)))) {
      rows.push({
        kind: 'control',
        id: 'currency',
        label: 'Currency',
        cell: (view, disabled) =>
          shows(view) && money(numberOf(view)) ? (
            <select
              aria-label={`Currency in ${viewName(view)}`}
              disabled={disabled}
              title={`The currency ${viewName(view)} shows: ${numberOf(view).currency ?? 'USD'}.`}
              className={`${control} w-20`}
              style={height}
              value={numberOf(view).currency ?? 'USD'}
              onChange={(event) => setNumber(view, { currency: event.target.value })}
            >
              {CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          ) : null,
      });
    }
  }

  if (field.type === 'date' || (field.type === 'calculated' && kindOf(field, fields) === 'date')) {
    rows.push({ kind: 'title', id: 'date', label: 'Date display' });
    choices(
      'date',
      DATE_FORMATS.map((item) => ({
        id: item.value,
        label: <span className="font-mono">{item.value}</span>,
        text: item.value,
        title: `${item.value}, for example ${item.sample}.`,
      })),
      (view) => displayOf(view)?.dateFormat?.[code] ?? 'DD-Mon-YYYY',
      (view, format) =>
        setDisplay(view, (current) => ({ ...current, dateFormat: withFieldEntry(current.dateFormat, code, format === 'DD-Mon-YYYY' ? undefined : (format as DateFormat)) })),
    );
  }

  return (
    <DisplaySection>
      {rows.length > 0 ? (
        <DisplayGrid
          caption={<>How {name} shows in each view:</>}
          columns={viewColumns}
          rows={rows}
          locked={shown ? undefined : `${field.label} is not shown. Tick Show next to it in the field list to change how it displays.`}
          offIn={(view) => (on(view) ? undefined : `${viewName(view)} is turned off for this page. Turn it on under Enable / disable views to change it here.`)}
          hiddenIn={(view) => (shows(view) ? undefined : `${field.label} is hidden in ${viewName(view)}. Tick Display to show it there.`)}
        />
      ) : (
        <p className="text-sm text-fg-subtle">No display options for this kind of field. Conditional formatting, and group and sort, have tabs of their own.</p>
      )}
    </DisplaySection>
  );
}

/** The display options as a spreadsheet: views across the top, settings down the side. */
function DisplayGrid({
  caption,
  columns,
  rows,
  locked,
  offIn,
  hiddenIn,
}: {
  caption: ReactNode;
  columns: TableView[];
  rows: GridRow[];
  /** Why nothing can change: every box shows unticked and locked. */
  locked?: string;
  /** Why a view's column cannot change: it stays in place, greyed. */
  offIn: (view: TableView) => string | undefined;
  hiddenIn: (view: TableView) => string | undefined;
}) {
  const id = useId();
  const cell = 'flex items-center rounded-sm px-1.5 py-1';
  // A disabled control shows no tooltip, so its cell carries the reason and lets the pointer through to it.
  const box = (view: TableView, input: ReactNode, title: string, enabled: boolean) => (
    <label key={view} className={`${cell} ${enabled ? 'cursor-pointer hover:bg-row-hover' : ''} ${offIn(view) ? 'opacity-50' : ''}`} title={title}>
      {input}
    </label>
  );
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-line p-2.5" role="group" aria-label="Display options">
      <span className="text-sm text-fg-muted">{caption}</span>
      <div className="grid items-center text-sm" style={{ gridTemplateColumns: `auto repeat(${columns.length}, calc(var(--spacing) * 30))` }}>
        <span />
        {columns.map((view) => (
          <span
            key={view}
            className={`flex items-center gap-1.5 px-1.5 py-1 font-medium whitespace-nowrap ${offIn(view) || (!locked && hiddenIn(view)) ? 'opacity-50' : ''}`}
            title={offIn(view) ?? (locked ? `${VIEW_NAME[view]} view` : hiddenIn(view)) ?? `${VIEW_NAME[view]} view`}
          >
            <Icon name={VIEW_ICON[view]} size={14} className="shrink-0 text-fg-subtle" />
            {VIEW_NAME[view]}
          </span>
        ))}
        {rows.map((row) => {
          if (row.kind === 'title') {
            return (
              <span key={row.id} className="col-span-full mt-1.5 border-t border-line pt-2 pb-0.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
                {row.label}
              </span>
            );
          }
          return (
            <Fragment key={row.id}>
              <span className={`pr-4 whitespace-nowrap ${locked ? 'text-fg-subtle' : 'text-fg-muted'}`} title={locked ?? (row.kind === 'control' ? undefined : row.title)}>
                {row.label}
              </span>
              {columns.map((view) => {
                const off = offIn(view);
                const reason = locked ?? off;
                if (row.kind === 'control') {
                  return (
                    <span key={view} className={`px-1.5 py-0.5 ${off ? 'opacity-50' : ''}`} title={reason}>
                      <span className={reason ? 'pointer-events-none' : ''}>{row.cell(view, !!reason)}</span>
                    </span>
                  );
                }
                if (row.kind === 'check') {
                  const check = row.cell(view);
                  if (!check && !locked) return <span key={view} />;
                  const checked = !locked && !!check?.checked;
                  const disabled = !!reason || !!check?.disabled;
                  return box(
                    view,
                    <input
                      type="checkbox"
                      aria-label={`${row.label} in ${VIEW_NAME[view]} view`}
                      checked={checked}
                      disabled={disabled}
                      onChange={() => check?.onChange()}
                      className="shrink-0 accent-[var(--sgp-color-accent)] disabled:pointer-events-none"
                    />,
                    reason ?? check?.title ?? '',
                    !disabled,
                  );
                }
                const picked = row.picked(view);
                if (picked === null && !locked) return <span key={view} />;
                return box(
                  view,
                  <input
                    type="radio"
                    name={`${id}-${row.group}-${view}`}
                    aria-label={`${row.text} in ${VIEW_NAME[view]} view`}
                    checked={!locked && !!picked}
                    disabled={!!reason}
                    onChange={() => row.onPick(view)}
                    className="shrink-0 accent-[var(--sgp-color-accent)] disabled:pointer-events-none"
                  />,
                  reason ?? row.cellTitle(view, !!picked),
                  !reason,
                );
              })}
            </Fragment>
          );
        })}
      </div>
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

import type { EffectiveField, Expr, FieldType } from '@sgp/mock-data';
import { useEffect, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useReorder } from './reorder';
import { FieldDisplayOptions, type DisplayDefaults, type DisplayDraft } from './DisplayOptions';
import { fieldSystemName, FormulaEditor } from './formulaEditor';
import { isNumberField } from './numberDisplay';
import { StatusOptions } from './StatusConfig';
import { Icon } from './Icon';
import type { WrapByPlace, WrapPlace } from './wrap';

const height = { height: 'var(--sgp-row-compact)' };
const control = 'min-w-0 rounded-md border border-line-strong bg-surface-sunken px-2 text-sm text-fg outline-none focus:border-accent';

const TYPES: Array<{ value: FieldType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'status', label: 'Status' },
  { value: 'calculated', label: 'Calculated' },
];

function binaryFormula(left: string, op: 'add' | 'subtract' | 'multiply' | 'divide', right: string, rightKind: 'field' | 'number' | 'weeks'): Expr {
  const rhs: Expr = rightKind === 'field' ? { field: right } : rightKind === 'weeks' ? { duration: { weeks: Number(right) || 0 } } : { value: Number(right) || 0 };
  return { op, args: [{ field: left }, rhs] };
}

/** A field being edited. Status replacements ride along until the change is saved; they are not part of the schema. */
export type DraftField = EffectiveField & { statusReplacements?: Record<string, string> };

/** Where each card, thumbnail, and kanban field sits, which text fields wrap, and which Task columns the gantt shows. Saved with the page. */
export interface ViewFields extends DisplayDraft {
  cardHeader: string[];
  cardBody: string[];
  thumbInside: string[];
  thumbBelow: string[];
  kanbanHeader: string[];
  kanbanBody: string[];
  wrap: WrapByPlace;
  ganttShown: string[];
}

export type FieldsSection = 'table' | 'card' | 'thumb' | 'kanban' | 'gantt';

const SECTION_LABEL: Record<FieldsSection, string> = {
  table: 'Table view',
  card: 'Card view',
  thumb: 'Thumbnail view',
  kanban: 'Kanban view',
  gantt: 'Gantt view',
};

/** The same settings give the same key, whatever order they were changed in. */
const stable = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(stable)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, stable(item)]))
      : value;
const sortedKey = (views: ViewFields) =>
  JSON.stringify(
    stable({
      ...views,
      wrap: Object.fromEntries(Object.entries(views.wrap).map(([place, list]) => [place, [...((list as string[] | undefined) ?? [])].sort()])),
      ganttShown: [...views.ganttShown].sort(),
    }),
  );


export function ManageFieldsDialog({
  tableLabel,
  fields,
  shown,
  canManage,
  hasData,
  usage,
  noun = 'record',
  view = 'table',
  sections = ['table'],
  viewFields,
  taskFields = [],
  displayDefaults,
  initialField,
  onSave,
  onFormula,
  onClose,
}: {
  tableLabel: string;
  fields: EffectiveField[];
  /** Columns shown in the table view, in order. */
  shown: string[];
  /** Schema changes: new fields, uniqueness, formulas, deletion, and the lock column. */
  canManage: boolean;
  /** True when a record stores a value in this field, so deleting it drops that data. */
  hasData?: (code: string) => boolean;
  /** How many records hold this value in this field, for status lists. */
  usage?: (field: string, value: string) => number;
  /** The table's record, singular: "shot". */
  noun?: string;
  /** The view the page is in; its section opens and the others start collapsed. */
  view?: FieldsSection;
  /** The views this page has, in order. */
  sections?: FieldsSection[];
  /** Field placement and wrapping for the views other than the table. */
  viewFields?: ViewFields;
  /** Every Task field: the gantt shows tasks, so any of them can be a column to the left of the chart. */
  taskFields?: EffectiveField[];
  /** What a view without display settings of its own does. Absent: this page has no display options yet. */
  displayDefaults?: DisplayDefaults;
  /** Opens with this field selected, as Configure field does. */
  initialField?: string;
  /**
   * Saves without closing, so several changes can be made and saved in turn.
   * Fields can carry `statusReplacements`: records on a hidden status move to the named one.
   */
  onSave: (shown: string[], fields: DraftField[], viewFields?: ViewFields) => void;
  /** A saved formula recalculates that column immediately. */
  onFormula?: (code: string, formula: Expr) => void;
  onClose: () => void;
}) {
  const [draftFields, setDraftFields] = useState<EffectiveField[]>(() => fields.map((field) => ({ ...field })));
  const [visible, setVisible] = useState<string[]>(shown);
  const [views, setViews] = useState<ViewFields | undefined>(viewFields);
  const [tab, setTab] = useState<FieldsSection>(() => (sections.includes(view) ? view : sections[0] ?? 'table'));
  // What was last saved; changes since then are unsaved.
  const [saved, setSaved] = useState(() => ({ fields: fields.map((field) => ({ ...field })), shown, views: viewFields }));
  // Each section remembers the field it shows on the right.
  // One selected field across the views of this table's records, so moving between them keeps the same field on the right.
  // The gantt lists Task fields, so it remembers its own.
  const [selected, setSelected] = useState<string | undefined>(view === 'gantt' ? undefined : initialField);
  const [ganttSelected, setGanttSelected] = useState<string | undefined>(view === 'gantt' ? initialField : undefined);
  const [creating, setCreating] = useState<FieldsSection | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<FieldType>('text');
  const [createUnique, setCreateUnique] = useState<'project' | 'table' | undefined>(undefined);
  const dirty =
    JSON.stringify(visible) !== JSON.stringify(saved.shown) ||
    JSON.stringify(draftFields) !== JSON.stringify(saved.fields) ||
    (!!views && !!saved.views && sortedKey(views) !== sortedKey(saved.views));
  const save = () => {
    onSave(visible, draftFields, views);
    // Status moves happen on save; once done they are no longer pending.
    const stored = draftFields.map(({ statusReplacements: _moved, ...field }: DraftField) => field);
    setDraftFields(stored);
    setSaved({ fields: stored, shown: visible, views });
  };
  const shownFields = visible.map((code) => draftFields.find((item) => item.code === code)).filter((item): item is EffectiveField => !!item);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      // Conditional formatting can open over this dialog; Escape closes that one first.
      if (event.key === 'Escape' && document.querySelectorAll('[role="dialog"]').length === 1) onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  const patch = (code: string, change: Partial<DraftField>) =>
    setDraftFields((all) => all.map((item) => (item.code === code ? { ...item, ...change } : item)));

  const toggleShown = (code: string) =>
    setVisible((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]));

  const setView = (change: (current: ViewFields) => Partial<ViewFields>) => setViews((current) => (current ? { ...current, ...change(current) } : current));

  const addField = () => {
    const label = name.trim();
    if (!label) return;
    const code = `cf-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'field'}`;
    const next: EffectiveField = {
      code,
      label,
      type,
      hidden: false,
      ...(type === 'text' && createUnique ? { unique: createUnique } : {}),
      ...(type === 'calculated' ? { formula: binaryFormula('frameOut', 'subtract', 'frameIn', 'field') } : {}),
    };
    setDraftFields((all) => [...all, next]);
    setVisible((current) => [...current, code]);
    // A field created from a card, thumbnail, or kanban section also shows in that view's body.
    if (creating === 'card') setView((current) => ({ cardBody: [...current.cardBody, code] }));
    if (creating === 'kanban') setView((current) => ({ kanbanBody: [...current.kanbanBody, code] }));
    if (creating === 'thumb') setView((current) => ({ thumbBelow: [...current.thumbBelow, code] }));
    setSelected(code);
    setCreating(null);
    setName('');
    setType('text');
    setCreateUnique(undefined);
  };

  const removeField = (code: string) => {
    setDraftFields((all) => all.filter((item) => item.code !== code));
    setVisible((current) => current.filter((item) => item !== code));
    setSelected((current) => (current === code ? undefined : current));
    setView((current) => ({
      cardHeader: current.cardHeader.filter((item) => item !== code),
      cardBody: current.cardBody.filter((item) => item !== code),
      thumbInside: current.thumbInside.filter((item) => item !== code),
      thumbBelow: current.thumbBelow.filter((item) => item !== code),
      kanbanHeader: current.kanbanHeader.filter((item) => item !== code),
      kanbanBody: current.kanbanBody.filter((item) => item !== code),
    }));
  };

  const summary = (section: FieldsSection) => {
    if (section === 'table') return `${shownFields.length} shown`;
    if (!views) return '';
    if (section === 'card') return `${views.cardHeader.length} in the header, ${views.cardBody.length} in the body`;
    if (section === 'kanban') return `${views.kanbanHeader.length} in the header, ${views.kanbanBody.length} in the body`;
    if (section === 'thumb') return `${views.thumbInside.length} inside, ${views.thumbBelow.length} below`;
    return `${new Set(['name', ...views.ganttShown]).size} Task columns shown`;
  };

  type PlaceKey = 'cardHeader' | 'cardBody' | 'thumbInside' | 'thumbBelow' | 'kanbanHeader' | 'kanbanBody';
  /**
   * The places a view shows fields. A card, kanban card, or thumbnail shows a field in one place only: its header (or on
   * the image) or its body (or below the image). Showing a field puts it in the body; a link moves it between the two.
   */
  const placesFor = (section: FieldsSection): { places: ListPlace[]; candidates: EffectiveField[]; isShown: (code: string) => boolean; show: (code: string) => void; hide: (code: string) => void; locked?: (code: string) => boolean; restId: string } => {
    if (section === 'table') {
      return {
        places: [{ id: 'table', order: visible, setOrder: setVisible }],
        candidates: draftFields,
        isShown: (code) => visible.includes(code),
        show: toggleShown,
        hide: toggleShown,
        restId: 'table',
      };
    }
    if (section === 'gantt') {
      const shownCodes = ['name', ...(views?.ganttShown ?? []).filter((code) => code !== 'name')];
      return {
        places: [
          {
            id: 'gantt',
            title: 'Task columns to left of chart',
            order: shownCodes,
            fixedFirst: 'name',
            setOrder: (codes) => setView(() => ({ ganttShown: codes.filter((code) => code !== 'name') })),
          },
        ],
        candidates: taskFields,
        isShown: (code) => shownCodes.includes(code),
        show: (code) => setView((current) => ({ ganttShown: [...current.ganttShown, code] })),
        hide: (code) => setView((current) => ({ ganttShown: current.ganttShown.filter((item) => item !== code) })),
        locked: (code) => code === 'name',
        restId: 'gantt',
      };
    }
    const [head, body, headTitle, bodyTitle, toHead, toBody]: [PlaceKey, PlaceKey, string, string, string, string] =
      section === 'card'
        ? ['cardHeader', 'cardBody', 'Inside the card header', 'Inside the card body', 'Move to header', 'Move to body']
        : section === 'kanban'
          ? ['kanbanHeader', 'kanbanBody', 'Inside the kanban header', 'Inside the kanban body', 'Move to header', 'Move to body']
          : ['thumbInside', 'thumbBelow', 'Inside the thumbnail', 'Below the thumbnail', 'Move inside', 'Move below'];
    const headCodes = views?.[head] ?? [];
    const bodyCodes = (views?.[body] ?? []).filter((code) => !headCodes.includes(code));
    const moveTo = (from: PlaceKey, to: PlaceKey) => (code: string) =>
      setView((current) => ({ [from]: current[from].filter((item) => item !== code), [to]: [...current[to].filter((item) => item !== code), code] }));
    return {
      places: [
        { id: head, title: headTitle, order: headCodes, setOrder: (codes) => setView(() => ({ [head]: codes })), move: { label: toBody, run: moveTo(head, body) } },
        { id: body, title: bodyTitle, order: bodyCodes, setOrder: (codes) => setView(() => ({ [body]: codes })), move: { label: toHead, run: moveTo(body, head) } },
      ],
      candidates: draftFields.filter((item) => item.type !== 'media'),
      isShown: (code) => headCodes.includes(code) || bodyCodes.includes(code),
      show: (code) => setView((current) => ({ [body]: [...current[body].filter((item) => item !== code), code] })),
      hide: (code) => setView((current) => ({ [head]: current[head].filter((item) => item !== code), [body]: current[body].filter((item) => item !== code) })),
      restId: body,
    };
  };

  /** The Display options for a field in a tab, or a note when this page has none yet. */
  const displayDisplay = (section: FieldsSection, item: EffectiveField, zoneId?: string) =>
    views && displayDefaults ? (
      <FieldDisplayOptions
        key={`${section}:${zoneId ?? ''}:${item.code}`}
        field={item}
        fields={section === 'gantt' ? taskFields : draftFields}
        tab={section}
        place={zoneId && zoneId !== 'gantt' ? (zoneId as WrapPlace) : undefined}
        draft={views}
        onDraft={(change) => setViews((current) => (current ? { ...current, ...change(current) } : current))}
        defaults={displayDefaults}
      />
    ) : (
      <section className="flex flex-col gap-2" aria-label="Display options">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Display options</h4>
        <p className="text-sm text-fg-subtle">This page does not have display options yet.</p>
      </section>
    );

  const panes = (section: FieldsSection) => {
    const { places, candidates, isShown, show, hide, locked, restId } = placesFor(section);
    const placed = places.map((place) => ({
      place,
      items: place.order.map((code) => candidates.find((item) => item.code === code)).filter((item): item is EffectiveField => !!item),
    }));
    const restAll = candidates.filter((item) => !isShown(item.code));
    const rest = section === 'table' || section === 'gantt' ? restAll : [...restAll].sort((a, b) => a.label.localeCompare(b.label));
    const firstShown = placed.find((entry) => entry.items.length > 0);
    const placeOf = (code: string) => placed.find((entry) => entry.items.some((item) => item.code === code))?.place.id ?? restId;
    const firstCode = firstShown?.items[0]?.code ?? rest[0]?.code ?? '';
    const remembered = section === 'gantt' ? ganttSelected : selected;
    const selectedCode = remembered && candidates.some((item) => item.code === remembered) ? remembered : firstCode;
    const selectedKey = `${placeOf(selectedCode)}:${selectedCode}`;
    const current = candidates.find((item) => item.code === selectedCode);
    const select = (key: string) => {
      setCreating(null);
      (section === 'gantt' ? setGanttSelected : setSelected)(key.slice(key.indexOf(':') + 1));
    };
    const showToggle: Placement = { checked: isShown, toggle: (code) => (isShown(code) ? hide(code) : show(code)), locked, lockedTitle: 'The task name always shows on the gantt.' };
    const row = (placeId: string, item: EffectiveField, extra?: Partial<Parameters<typeof FieldRow>[0]>) => (
      <FieldRow
        key={item.code}
        field={item}
        show={showToggle}
        selected={selectedKey === `${placeId}:${item.code}` && creating !== section}
        onSelect={() => select(`${placeId}:${item.code}`)}
        {...extra}
      />
    );
    const schemaField = section === 'gantt' ? undefined : draftFields.find((item) => item.code === current?.code);
    return (
      <div className="flex h-[32rem] min-h-0">
        <div className="flex w-max min-w-56 max-w-[50%] shrink-0 flex-col border-r border-line">
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            <p className="flex items-center gap-1.5 px-2 py-1 text-xs text-fg-subtle">
              <span className="w-5 shrink-0" />
              <span className="w-9 shrink-0 text-center">Show</span>
              <span>Field</span>
            </p>
            {placed.map(({ place, items }, index) => (
              <PlaceList
                key={place.id}
                place={place}
                items={items}
                first={index === 0}
                renderRow={(item, drag) => row(place.id, item, { drag, move: place.move && !locked?.(item.code) ? { label: place.move.label, onClick: () => place.move!.run(item.code) } : undefined })}
              />
            ))}
            {rest.length > 0 && <p className="mt-3 border-t border-line px-2 pt-2 pb-1 text-xs font-semibold text-fg-muted">Not shown</p>}
            {rest.map((item) => row(restId, item))}
          </div>
          <div className="border-t border-line p-2">
            <button
              className={`flex w-full items-center gap-1.5 rounded-md px-2 text-sm ${canManage && section !== 'gantt' ? 'text-accent hover:bg-row-hover' : 'cursor-default text-fg-subtle opacity-60'}`}
              style={height}
              disabled={!canManage || section === 'gantt'}
              title={
                section === 'gantt'
                  ? 'Gantt columns are Task fields. Add Task fields from the Tasks page.'
                  : canManage
                    ? 'Add a field to this table'
                    : 'Managing the schema needs permission'
              }
              onClick={() => canManage && section !== 'gantt' && setCreating(section)}
            >
              <Icon name="plus" /> Create custom field
            </button>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {creating === section ? (
            <>
              <h3 className="text-sm font-semibold">New field</h3>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-muted">Name</span>
                <input className={control} style={height} value={name} placeholder="Shot name" onChange={(event) => setName(event.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-fg-muted">Type</span>
                <select className={control} style={height} value={type} onChange={(event) => setType(event.target.value as FieldType)}>
                  {TYPES.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {type === 'text' && (
                <UniqueOptions
                  unique={createUnique}
                  disabled={false}
                  onChange={(project, global) => setCreateUnique(global ? 'table' : project ? 'project' : undefined)}
                />
              )}
              {type === 'calculated' && <p className="text-sm text-fg-muted">A calculated field starts as Cut out − Cut in. You can change that after adding it.</p>}
              <button
                className={`self-start rounded-md px-3 text-sm font-medium text-fg-inverse ${name.trim() ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
                style={height}
                disabled={!name.trim()}
                onClick={addField}
              >
                Add field
              </button>
            </>
          ) : schemaField ? (
            <>
              <FieldHeading field={schemaField} />
              {displayDisplay(section, schemaField, selectedKey.slice(0, selectedKey.indexOf(':')))}
              <ConfigurationSection>
                <FieldConfig
                  key={schemaField.code}
                  heading={false}
                  field={schemaField}
                  fields={draftFields}
                  canManage={canManage}
                  hasData={hasData?.(schemaField.code) ?? false}
                  usage={usage ? (value) => usage(schemaField.code, value) : undefined}
                  noun={noun}
                  onPatch={(change) => patch(schemaField.code, change)}
                  onFormula={onFormula}
                  onDelete={canManage && !schemaField.system ? () => removeField(schemaField.code) : undefined}
                />
              </ConfigurationSection>
            </>
          ) : current && section === 'gantt' ? (
            <>
              <FieldHeading table="Task" field={current} />
              {displayDisplay(section, current)}
              <ConfigurationSection>
                <FieldConfig key={current.code} heading={false} table="Task" field={current} fields={taskFields} canManage={false} hasData={false} noun="task" onPatch={() => {}} />
                <p className="text-sm text-fg-muted">
                  The gantt shows tasks, so its columns are Task fields{current.code === 'name' ? '; the task name always shows' : ''}. Task fields change from the Tasks page.
                </p>
              </ConfigurationSection>
            </>
          ) : (
            <p className="text-sm text-fg-subtle">Select a field.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-12" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label="Manage fields"
        className="flex max-h-[calc(100vh-6rem)] w-[56rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-3 border-b border-line px-4 py-3">
          <Icon name="settings" size={18} className="mt-0.5 text-fg-subtle" />
          <div className="flex flex-col">
            <h2 className="text-lg font-semibold">Manage fields</h2>
            <p className="text-sm text-fg-muted">
              {tableLabel}. Display options belong to each view and are saved with this page. Configuration applies everywhere and needs permission to manage the schema.
            </p>
          </div>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>

        <div role="tablist" aria-label="Views" className="flex gap-1 border-b border-line px-4">
          {sections.map((section) => (
            <button
              key={section}
              role="tab"
              aria-selected={tab === section}
              title={summary(section)}
              onClick={() => setTab(section)}
              className={`-mb-px flex items-center gap-1.5 border-b-2 px-3 text-sm ${
                tab === section ? 'border-accent font-medium text-fg' : 'border-transparent text-fg-muted hover:text-fg'
              }`}
              style={{ height: 'calc(var(--sgp-row-compact) + 0.5rem)' }}
            >
              {SECTION_LABEL[section]}
              {section === view && <span className="rounded-sm bg-accent-subtle px-1.5 text-xs text-fg">Current</span>}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1" role="tabpanel" aria-label={SECTION_LABEL[tab]}>
          {panes(tab)}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="mr-auto text-xs text-fg-subtle">
            {dirty
              ? canManage
                ? 'Unsaved changes. Showing, placing, or wrapping a field changes this page; a new field, a formula, or a uniqueness rule changes the table for everyone who can manage the schema.'
                : 'Unsaved changes. Showing, placing, or wrapping a field changes this page; keep it for everyone from the Page menu.'
              : 'No unsaved changes.'}
          </span>
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Close
          </button>
          <button
            className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
            style={height}
            disabled={!dirty}
            onClick={save}
          >
            Save
          </button>
        </footer>
      </div>
    </div>
  );
}

/** One list of shown fields in a tab: the table's columns, a card header, a card body, and so on. */
interface ListPlace {
  id: string;
  title?: string;
  order: string[];
  setOrder: (codes: string[]) => void;
  /** Always shown, first, and not dragged (the gantt's task name). */
  fixedFirst?: string;
  /** Moves a field to the view's other place, revealed on hover. */
  move?: { label: string; run: (code: string) => void };
}

interface Placement {
  checked: (code: string) => boolean;
  toggle: (code: string) => void;
  /** Shown checked and cannot change. */
  locked?: (code: string) => boolean;
  /** Why a locked field cannot be hidden, on hover. */
  lockedTitle?: string;
}

/** A place's shown fields, dragged by their grips with the standard reorder (dimmed item, gliding hairline). */
function PlaceList({
  place,
  items,
  first,
  renderRow,
}: {
  place: ListPlace;
  items: EffectiveField[];
  first: boolean;
  renderRow: (item: EffectiveField, drag?: { start: (event: ReactPointerEvent<HTMLElement>) => void; props: Record<string, unknown>; dim: string }) => ReactNode;
}) {
  const movable = items.filter((item) => item.code !== place.fixedFirst).map((item) => item.code);
  const reorder = useReorder({
    ids: movable,
    onReorder: (codes) => place.setOrder(place.fixedFirst ? [place.fixedFirst, ...codes] : codes),
  });
  return (
    <div role="group" aria-label={place.title ?? 'Shown'} className={first ? '' : 'mt-3 border-t border-line pt-2'}>
      {place.title && <p className="px-2 py-1 text-xs font-semibold text-fg-muted">{place.title}</p>}
      {place.fixedFirst && items[0]?.code === place.fixedFirst && renderRow(items[0])}
      <div ref={reorder.listRef} className="relative flex flex-col">
        {reorder.indicator}
        {items
          .filter((item) => item.code !== place.fixedFirst)
          .map((item) =>
            renderRow(item, { start: (event) => reorder.startDrag(item.code, event), props: reorder.itemProps(item.code), dim: reorder.dimClass(item.code) }),
          )}
      </div>
      {items.length === 0 && <p className="px-2 py-1.5 text-sm text-fg-subtle">No fields here.</p>}
    </div>
  );
}

function FieldRow({
  field,
  show,
  selected,
  drag,
  move,
  onSelect,
}: {
  field: EffectiveField;
  show: Placement;
  selected: boolean;
  /** Shown fields drag by their grip; fields not shown have none. */
  drag?: { start: (event: ReactPointerEvent<HTMLElement>) => void; props: Record<string, unknown>; dim: string };
  /** A link at the right, shown on hover, that moves the field to the view's other place. */
  move?: { label: string; onClick: () => void };
  onSelect: () => void;
}) {
  const checked = show.checked(field.code);
  return (
    <div
      {...drag?.props}
      className={`group flex items-center gap-1.5 rounded-sm px-2 transition-opacity ${selected ? 'bg-accent-subtle' : 'hover:bg-row-hover'} ${drag?.dim ?? ''}`}
      style={height}
    >
      <span className="flex w-5 shrink-0 justify-center">
        {drag && (
          <button
            type="button"
            className="flex size-5 cursor-grab items-center justify-center rounded-sm text-fg-subtle hover:text-fg active:cursor-grabbing"
            aria-label={`Drag ${field.label} to reorder`}
            title="Drag to reorder"
            onPointerDown={drag.start}
          >
            <Icon name="grip-vertical" size={14} />
          </button>
        )}
      </span>
      <span className="flex w-9 shrink-0 justify-center" title={show.locked?.(field.code) ? show.lockedTitle : undefined}>
        <input
          type="checkbox"
          aria-label={`${checked ? 'Hide' : 'Show'} ${field.label}`}
          checked={show.locked?.(field.code) || checked}
          disabled={show.locked?.(field.code)}
          onChange={() => show.toggle(field.code)}
          className="accent-[var(--sgp-color-accent)] disabled:opacity-50"
        />
      </span>
      <button className="flex min-w-0 flex-1 items-center gap-1.5 self-stretch pr-2 text-left text-sm whitespace-nowrap" onClick={onSelect}>
        {field.type === 'calculated' && <Icon name="square-function" size={12} className="shrink-0 text-fg-subtle" />}
        {field.code === 'locked' && <Icon name="lock" size={12} className="shrink-0 text-fg-subtle" />}
        <span>{field.label}</span>
      </button>
      {move && (
        <button
          type="button"
          className="invisible shrink-0 text-xs whitespace-nowrap text-accent hover:underline group-hover:visible focus-visible:visible"
          onClick={move.onClick}
        >
          {move.label}
        </button>
      )}
    </div>
  );
}

function UniqueOptions({
  unique,
  disabled,
  onChange,
}: {
  unique?: 'project' | 'table';
  disabled: boolean;
  onChange: (project: boolean, global: boolean) => void;
}) {
  const project = unique === 'project' || unique === 'table';
  const global = unique === 'table';
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2 text-sm">
      <legend className="mb-1 text-fg-muted">Uniqueness</legend>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={project} onChange={(event) => onChange(event.target.checked, global && event.target.checked)} className="accent-[var(--sgp-color-accent)]" />
        Require unique in this project
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={global} onChange={(event) => onChange(true, event.target.checked)} className="accent-[var(--sgp-color-accent)]" />
        Require unique globally
      </label>
      {disabled && <p className="text-xs text-fg-subtle">Changing uniqueness needs permission to manage the schema.</p>}
    </fieldset>
  );
}

/** A field's name, system name, type, and System tag. */
function FieldHeading({ table, field }: { table?: string; field: EffectiveField }) {
  return (
    <div className="flex items-center gap-2">
      {field.type === 'calculated' && <Icon name="square-function" className="text-fg-subtle" />}
      {field.code === 'locked' && <Icon name="lock" className="text-fg-subtle" />}
      <h3 className="text-sm font-semibold">{table ? `${table} > ${field.label}` : field.label}</h3>
      <span className="font-mono text-xs text-fg-subtle">{table ? `${table} > ${fieldSystemName(field)}` : fieldSystemName(field)}</span>
      <span className="text-xs text-fg-subtle">{TYPES.find((option) => option.value === field.type)?.label ?? field.type}</span>
      {field.system && <span className="rounded-sm bg-surface-sunken px-1.5 text-xs text-fg-subtle">System</span>}
    </div>
  );
}

/** Settings that apply to the field everywhere, in every view and page. */
function ConfigurationSection({ children }: { children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-line pt-4" aria-label="Configuration">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Configuration</h4>
      {children}
    </section>
  );
}

function FieldConfig({
  heading = true,
  table,
  field,
  fields,
  canManage,
  hasData,
  usage,
  noun = 'record',
  onPatch,
  onFormula,
  onDelete,
}: {
  /** Off when the field's name already heads the pane. */
  heading?: boolean;
  /** Names the table when it is not the page's own, as in the gantt's Task columns: "Task > Assigned to". */
  table?: string;
  field: DraftField;
  fields: EffectiveField[];
  canManage: boolean;
  hasData: boolean;
  usage?: (value: string) => number;
  noun?: string;
  onPatch: (change: Partial<DraftField>) => void;
  onFormula?: (code: string, formula: Expr) => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {heading && <FieldHeading table={table} field={field} />}
      {field.type === 'text' && (
        <UniqueOptions
          unique={field.unique}
          disabled={!canManage}
          onChange={(project, global) => onPatch({ unique: global ? 'table' : project ? 'project' : undefined })}
        />
      )}
      {field.type === 'calculated' && (
        <FormulaEditor
          formula={field.formula}
          fields={fields}
          selfCode={field.code}
          canManage={canManage}
          onSave={(formula) => {
            onPatch({ formula });
            onFormula?.(field.code, formula);
          }}
        />
      )}
      {field.type === 'status' && (
        <StatusOptions
          values={field.validValues ?? []}
          replacements={field.statusReplacements ?? {}}
          usage={usage ?? (() => 0)}
          canManage={canManage}
          noun={noun}
          onChange={(validValues, statusReplacements) =>
            onPatch({ validValues, statusReplacements: Object.keys(statusReplacements).length ? statusReplacements : undefined })
          }
        />
      )}
      {field.code === 'locked' && (
        <p className="text-sm text-fg-muted">
          Show this column to lock or unlock a record. A record locked by the system, such as a timecard after payroll, cannot be unlocked.
        </p>
      )}
      {field.type !== 'text' && field.type !== 'calculated' && field.type !== 'status' && field.code !== 'locked' && !isNumberField(field) && (
        <p className="text-sm text-fg-muted">Nothing else to configure for this type of field.</p>
      )}
      <fieldset disabled className="flex flex-col gap-1 rounded-md border border-dashed border-line-strong p-2.5 text-sm">
        <legend className="px-1 text-fg-muted">Permissions</legend>
        <p className="text-fg-subtle">Who can see and edit {field.label}. Coming soon.</p>
      </fieldset>
      {onDelete && <DeleteField label={field.label} hasData={hasData} onDelete={onDelete} />}
    </div>
  );
}

function DeleteField({ label, hasData, onDelete }: { label: string; hasData: boolean; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <button
        className="self-start rounded-md border border-line-strong px-3 text-sm text-danger hover:bg-row-hover"
        style={height}
        onClick={() => (hasData ? setConfirming(true) : onDelete())}
      >
        Delete field
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-md border border-danger p-3">
      <p className="text-sm">{label} has values on records. Deleting this field removes those values.</p>
      <div className="flex gap-2">
        <button className="rounded-md bg-danger px-3 text-sm font-medium text-fg-inverse hover:opacity-90" style={height} onClick={onDelete}>
          Delete and drop the data
        </button>
        <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={() => setConfirming(false)}>
          Keep field
        </button>
      </div>
    </div>
  );
}

/** One field's configuration, without the column list. */
export function ConfigureFieldDialog({
  field,
  fields,
  canManage,
  hasData = false,
  usage,
  noun,
  onSave,
  onDelete,
  onClose,
}: {
  field: EffectiveField;
  fields: EffectiveField[];
  canManage: boolean;
  hasData?: boolean;
  usage?: (value: string) => number;
  noun?: string;
  /** May carry `statusReplacements` for records on a status that was hidden. */
  onSave: (field: DraftField) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DraftField>(field);
  const formulaKey = JSON.stringify(field.formula ?? null);
  const storedUnique = field.unique;
  const displayKey = JSON.stringify(field.display ?? null);
  const valuesKey = (field.validValues ?? []).join('|');
  useEffect(() => {
    setDraft(field);
    // Reload only when the stored field changes. `field` is a fresh object on each parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.code, storedUnique, formulaKey, displayKey, valuesKey]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);
  const dirty =
    draft.unique !== field.unique ||
    (draft.validValues ?? []).join('|') !== valuesKey ||
    !!draft.statusReplacements ||
    JSON.stringify(draft.display ?? null) !== JSON.stringify(field.display ?? null);
  const hasFooterSave = draft.type !== 'calculated';
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-canvas/60 pt-12" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={`Configure ${field.label}`}
        className="flex max-h-[calc(100vh-6rem)] w-[40rem] max-w-[calc(100vw-2rem)] flex-col rounded-lg border border-line-strong bg-surface-raised text-fg"
        style={{ boxShadow: 'var(--sgp-shadow-overlay)' }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-line px-4 py-3">
          <Icon name="settings" size={18} className="text-fg-subtle" />
          <h2 className="text-lg font-semibold">Configure {field.label}</h2>
          <button className="ml-auto text-fg-subtle hover:text-fg" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4">
          <FieldConfig
            key={field.code}
            field={draft}
            fields={fields}
            canManage={canManage}
            hasData={hasData}
            usage={usage}
            noun={noun}
            onPatch={(change) => {
              const next = { ...draft, ...change };
              setDraft(next);
              if (change.formula) onSave(next);
            }}
            onDelete={canManage && !draft.system ? onDelete : undefined}
          />
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
          <button className="rounded-md border border-line-strong px-3 text-sm hover:bg-row-hover" style={height} onClick={onClose}>
            Close
          </button>
          {hasFooterSave && (
            <button
              className={`rounded-md px-3 text-sm font-medium text-fg-inverse ${dirty && canManage ? 'bg-accent hover:bg-accent-hover' : 'cursor-default bg-accent opacity-40'}`}
              style={height}
              disabled={!dirty || !canManage}
              onClick={() => onSave(draft)}
            >
              Save
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

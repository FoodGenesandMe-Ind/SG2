import type { Sequence, Shot, StatusDisplay } from '@sgp/mock-data';
import { useState } from 'react';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { ShotCell, SummaryValue } from './ShotGridSpecimen';
import { StatusPill } from './StatusPill';
import { getShotsPage, SELECTED_SHOT_ID, summariesFor, type ShotsPage } from './shotsPage';

function TotalsBar({ shotsPage }: { shotsPage: ShotsPage }) {
  const summaries = summariesFor(shotsPage, shotsPage.allShots);
  return (
    <div
      className="sticky top-0 z-10 flex items-center gap-4 border-b border-line-strong bg-surface-sunken px-3 text-sm"
      style={{ height: 'var(--sgp-row-compact)' }}
      aria-label="Totals"
    >
      <span className="font-semibold">Total</span>
      <span className="text-xs text-fg-subtle">{shotsPage.allShots.length} shots on all pages</span>
      {summaries.map((s) => (
        <span key={s.field.code} className="flex items-baseline gap-1.5">
          <span className="text-xs text-fg-muted">{s.field.label}</span>
          <SummaryValue kind={s.kind} value={s.value} />
        </span>
      ))}
    </div>
  );
}

function GroupHeader({
  seq,
  rows,
  shotsPage,
  expanded,
  onToggle,
}: {
  seq: Sequence;
  rows: Shot[];
  shotsPage: ShotsPage;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-sm">
      <button
        className="flex size-5 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
        aria-label={expanded ? `Collapse ${seq.code}` : `Expand ${seq.code}`}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <Icon name={expanded ? 'chevron-down' : 'chevron-right'} size={12} />
      </button>
      <span className="font-semibold">{seq.code}</span>
      <span className="text-fg-muted">{seq.name}</span>
      <span className="text-xs text-fg-subtle">{rows.length} shots</span>
      {summariesFor(shotsPage, rows).map((s) => (
        <span key={s.field.code} className="ml-2 flex items-baseline gap-1.5">
          <span className="text-xs text-fg-subtle">{s.field.label}</span>
          <SummaryValue kind={s.kind} value={s.value} />
        </span>
      ))}
    </div>
  );
}

function useToggleSet(initial: string[]) {
  const [open, setOpen] = useState(() => new Set(initial));
  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return [open, toggle] as const;
}

export function ShotCardsView({
  direction,
  statusDisplay,
  columns,
  shotsPage = getShotsPage(),
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  /** Cards per row, 1-10. */
  columns: number;
  shotsPage?: ShotsPage;
}) {
  const { groups, page, fieldByCode } = shotsPage;
  const expandedFields = (page.cardSettings?.expandedFields ?? [])
    .map(fieldByCode)
    .filter((f): f is NonNullable<typeof f> => !!f);
  const [openGroups, toggleGroup] = useToggleSet(groups.map((g) => g.seq.id));
  const [openCards, toggleCard] = useToggleSet(
    groups.filter((g) => g.seq.code !== 'LMP_030').flatMap((g) => g.rows.map((r) => r.id)),
  );

  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <TotalsBar shotsPage={shotsPage} />
      <div className="flex flex-col gap-3 p-3">
        {groups.map(({ seq, rows }) => (
          <section key={seq.id} className="flex flex-col gap-2">
            <GroupHeader
              seq={seq}
              rows={rows}
              shotsPage={shotsPage}
              expanded={openGroups.has(seq.id)}
              onToggle={() => toggleGroup(seq.id)}
            />
            {openGroups.has(seq.id) && (
              <div className="grid items-start gap-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {rows.map((shot) => {
                  const open = openCards.has(shot.id);
                  const selected = shot.id === SELECTED_SHOT_ID;
                  return (
                    <article
                      key={shot.id}
                      className={`@container flex min-w-0 flex-col gap-2 overflow-hidden rounded-lg border bg-surface-raised p-2 ${
                        selected ? 'border-accent bg-row-selected' : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <button
                          className="flex size-5 shrink-0 items-center justify-center rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
                          aria-label={open ? `Collapse ${shot.code}` : `Expand ${shot.code}`}
                          aria-expanded={open}
                          onClick={() => toggleCard(shot.id)}
                        >
                          <Icon name={open ? 'chevron-down' : 'chevron-right'} size={12} />
                        </button>
                        <span
                          className="hidden h-9 w-16 shrink-0 rounded-sm @[15rem]:block"
                          style={{ background: placeholderThumb(shot.code) }}
                        />
                        <span className="min-w-0 truncate font-medium text-accent">{shot.code}</span>
                        <span className="ml-auto hidden shrink-0 @[15rem]:inline-flex">
                          <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
                        </span>
                        <span className="ml-auto inline-flex shrink-0 @[15rem]:hidden">
                          <StatusPill code={shot.status} pillStyle={direction.pillStyle} display="icon" />
                        </span>
                      </div>
                      {open && (
                        <dl className="grid grid-cols-1 gap-x-3 gap-y-0.5 border-t border-line pt-2 text-sm @[17rem]:grid-cols-[6.5rem_minmax(0,1fr)] @[17rem]:gap-y-1">
                          {expandedFields.map((field) => (
                            <div key={field.code} className="contents">
                              <dt className="flex items-center gap-1 text-xs text-fg-subtle @[17rem]:text-sm">
                                {field.type === 'calculated' && <Icon name="square-function" size={12} />}
                                {field.label}
                              </dt>
                              <dd className="mb-1 flex min-w-0 items-center overflow-hidden @[17rem]:mb-0">
                                <ShotCell field={field} shot={shot} direction={direction} statusDisplay={statusDisplay} />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export function ShotThumbsView({
  direction,
  statusDisplay,
  size,
  shotsPage = getShotsPage(),
}: {
  direction: Direction;
  statusDisplay: StatusDisplay;
  /** Thumbnail width in pixels. */
  size: number;
  shotsPage?: ShotsPage;
}) {
  const { groups } = shotsPage;
  const [openGroups, toggleGroup] = useToggleSet(groups.map((g) => g.seq.id));

  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <TotalsBar shotsPage={shotsPage} />
      <div className="flex flex-col gap-3 p-3">
        {groups.map(({ seq, rows }) => (
          <section key={seq.id} className="flex flex-col gap-2">
            <GroupHeader
              seq={seq}
              rows={rows}
              shotsPage={shotsPage}
              expanded={openGroups.has(seq.id)}
              onToggle={() => toggleGroup(seq.id)}
            />
            {openGroups.has(seq.id) && (
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, ${size}px)` }}>
                {rows.map((shot) => {
                  const selected = shot.id === SELECTED_SHOT_ID;
                  return (
                    <figure key={shot.id} className="group flex flex-col gap-1.5">
                      <div
                        className={`relative aspect-video rounded-md ring-2 ${
                          selected ? 'ring-accent' : 'ring-transparent group-hover:ring-line-strong'
                        }`}
                        style={{ background: placeholderThumb(shot.code) }}
                      >
                        <span className="absolute right-1.5 bottom-1.5 rounded-sm bg-surface-sunken/80 px-1 font-mono text-xs tabular-nums text-fg">
                          {shot.totalFrames}f
                        </span>
                      </div>
                      <figcaption className="flex min-w-0 items-center gap-2 overflow-hidden px-0.5 text-sm">
                        <span className="truncate font-medium text-accent">{shot.code}</span>
                        <span className="ml-auto shrink-0">
                          <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />
                        </span>
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

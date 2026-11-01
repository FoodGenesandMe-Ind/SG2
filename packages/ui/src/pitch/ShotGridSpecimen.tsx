import type { EffectiveField, Shot, StatusDisplay } from '@sgp/mock-data';
import type { MouseEvent } from 'react';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';
import {
  assetNames,
  formatDate,
  getShotsPage,
  SELECTED_SHOT_ID,
  summariesFor,
  SUMMARY_LABEL,
  type ShotsPage,
} from './shotsPage';

const NUMERIC_COLUMNS = new Set(['frameIn', 'frameOut', 'totalFrames']);
const COLUMN_WIDTH: Record<string, string> = {
  code: '6.5rem',
  description: 'minmax(14rem, 1fr)',
  frameIn: '4.5rem',
  frameOut: '4.5rem',
  totalFrames: '7.5rem',
  dueDate: '5.5rem',
  animationDue: '7rem',
  assetIds: '11rem',
};
const STATUS_WIDTH: Record<StatusDisplay, string> = { long: '8.5rem', short: '5rem', icon: '4rem' };

export function ShotCell({
  field,
  shot,
  direction,
  statusDisplay,
}: {
  field: EffectiveField;
  shot: Shot;
  direction: Direction;
  statusDisplay: StatusDisplay;
}) {
  switch (field.code) {
    case 'code':
      return <span className="font-medium text-accent">{shot.code}</span>;
    case 'status':
      return <StatusPill code={shot.status} pillStyle={direction.pillStyle} display={statusDisplay} />;
    case 'frameIn':
      return <span className="font-mono text-xs tabular-nums text-fg-muted">{shot.frameIn}</span>;
    case 'frameOut':
      return <span className="font-mono text-xs tabular-nums text-fg-muted">{shot.frameOut}</span>;
    case 'totalFrames':
      return <span className="font-mono text-xs tabular-nums">{shot.totalFrames}</span>;
    case 'dueDate':
      return <span className="tabular-nums">{formatDate(shot.dueDate)}</span>;
    case 'animationDue':
      return <span className="tabular-nums text-fg-muted">{formatDate(shot.animationDue)}</span>;
    case 'assetIds':
      return <span className="truncate text-fg-muted">{assetNames(shot.assetIds)}</span>;
    default:
      return <span className="truncate">{String(shot[field.code as keyof Shot] ?? '')}</span>;
  }
}

export function SummaryValue({ kind, value }: { kind: keyof typeof SUMMARY_LABEL; value: number }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-xs text-fg-subtle">{SUMMARY_LABEL[kind]}</span>
      <span className="font-mono text-xs font-semibold tabular-nums">{value.toLocaleString('en-US')}</span>
    </span>
  );
}

export function ShotGridSpecimen({
  direction,
  statusDisplay: statusDisplayOverride,
  onColumnContextMenu,
  shotsPage = getShotsPage(),
}: {
  direction: Direction;
  statusDisplay?: StatusDisplay;
  onColumnContextMenu?: (event: MouseEvent, field: EffectiveField) => void;
  shotsPage?: ShotsPage;
}) {
  const { columns, settings, groups, allShots } = shotsPage;
  const statusDisplay = statusDisplayOverride ?? settings.status?.statusDisplay ?? 'long';
  const widthOf = (code: string) => (code === 'status' ? STATUS_WIDTH[statusDisplay] : COLUMN_WIDTH[code]);
  const template = `1.75rem 3.5rem ${columns.map((c) => widthOf(c.code)).join(' ')}`;
  const cellLine = direction.gridLines === 'full' ? 'border-r border-line' : '';
  const headerText = direction.headerCase === 'upper' ? 'text-xs uppercase tracking-wide' : 'text-sm';
  const align = (code: string) => (NUMERIC_COLUMNS.has(code) ? 'justify-end' : '');
  const rowHeight = { height: 'var(--sgp-row-compact)' };

  const firstSummaryIndex = columns.findIndex((c) => settings[c.code]?.summary);
  const labelSpan = 2 + (firstSummaryIndex >= 0 ? firstSummaryIndex : columns.length);
  const trailingColumns = firstSummaryIndex >= 0 ? columns.slice(firstSummaryIndex) : [];

  const summaryCells = (rows: Shot[]) => {
    const summaries = summariesFor(shotsPage, rows);
    return trailingColumns.map((col) => {
      const summary = summaries.find((s) => s.field.code === col.code);
      return (
        <span key={col.code} className={`flex h-full items-center px-2 ${cellLine} ${align(col.code)}`}>
          {summary && <SummaryValue kind={summary.kind} value={summary.value} />}
        </span>
      );
    });
  };

  let rowIndex = 0;

  return (
    <div className="min-w-0 flex-1 overflow-auto bg-surface">
      <div className="min-w-max" role="table" aria-label="Shots">
        <div
          className={`sticky top-0 z-20 grid items-center border-b border-line-strong bg-surface-sunken font-medium text-fg-muted ${headerText}`}
          style={{ gridTemplateColumns: template, ...rowHeight }}
          role="row"
        >
          <span className={`flex h-full items-center justify-center ${cellLine}`}>
            <input type="checkbox" aria-label="Select all" className="accent-[var(--sgp-color-accent)]" />
          </span>
          <span className={`flex h-full items-center px-2 ${cellLine}`} />
          {columns.map((col) => (
            <span
              key={col.code}
              className={`flex h-full cursor-default items-center gap-1 px-2 hover:bg-row-hover ${cellLine} ${align(col.code)}`}
              role="columnheader"
              title={col.type === 'calculated' ? 'Calculated field' : 'Right-click for column options'}
              onContextMenu={(event) => {
                if (!onColumnContextMenu) return;
                event.preventDefault();
                onColumnContextMenu(event, col);
              }}
            >
              {col.type === 'calculated' && <Icon name="square-function" size={12} className="shrink-0 text-fg-subtle" />}
              <span className="truncate">{col.label}</span>
              {col.code === 'code' && <Icon name="arrow-up" size={12} className="text-fg-subtle" />}
            </span>
          ))}
        </div>

        {trailingColumns.length > 0 && (
          <div
            className="sticky z-10 grid items-center border-b border-line-strong bg-surface-sunken text-sm"
            style={{ gridTemplateColumns: template, top: 'var(--sgp-row-compact)', ...rowHeight }}
            aria-label="Totals"
          >
            <span className="flex items-center gap-2 px-2 font-semibold" style={{ gridColumn: `1 / span ${labelSpan}` }}>
              Total
              <span className="text-xs font-normal text-fg-subtle">{allShots.length} shots on all pages</span>
            </span>
            {summaryCells(allShots)}
          </div>
        )}

        {groups.map(({ seq, rows }) => (
          <div key={seq.id} role="rowgroup">
            <div
              className="grid items-center border-b border-line bg-surface-raised text-sm"
              style={{ gridTemplateColumns: template, ...rowHeight }}
            >
              <span className="flex items-center gap-2 px-2" style={{ gridColumn: `1 / span ${labelSpan}` }}>
                <Icon name="chevron-down" size={12} className="text-fg-subtle" />
                <span className="font-semibold">{seq.code}</span>
                <span className="text-fg-muted">{seq.name}</span>
                <span className="text-xs text-fg-subtle">{rows.length} shots</span>
              </span>
              {summaryCells(rows)}
            </div>
            {rows.map((shot) => {
              const selected = shot.id === SELECTED_SHOT_ID;
              const zebra = direction.zebra && rowIndex++ % 2 === 1;
              return (
                <div
                  key={shot.id}
                  role="row"
                  className={`grid items-center border-b border-line text-md ${
                    selected ? 'bg-row-selected' : zebra ? 'bg-row-alt hover:bg-row-hover' : 'hover:bg-row-hover'
                  }`}
                  style={{ gridTemplateColumns: template, ...rowHeight }}
                >
                  <span className={`flex h-full items-center justify-center ${cellLine}`}>
                    <input
                      type="checkbox"
                      defaultChecked={selected}
                      aria-label={`Select ${shot.code}`}
                      className="accent-[var(--sgp-color-accent)]"
                    />
                  </span>
                  <span className={`flex h-full items-center px-1.5 ${cellLine}`}>
                    <span className="h-5 w-9 rounded-sm" style={{ background: placeholderThumb(shot.code) }} />
                  </span>
                  {columns.map((col) => (
                    <span
                      key={col.code}
                      className={`flex h-full min-w-0 items-center px-2 ${cellLine} ${align(col.code)}`}
                      role="cell"
                    >
                      <ShotCell field={col} shot={shot} direction={direction} statusDisplay={statusDisplay} />
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

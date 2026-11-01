import { statusValues, type StatusDisplay } from '@sgp/mock-data';
import { readableTextOn } from './color';
import type { PillStyle } from './directions';
import { Icon } from './Icon';

export function StatusPill({
  code,
  pillStyle,
  display = 'long',
}: {
  code: string;
  pillStyle: PillStyle;
  display?: StatusDisplay;
}) {
  const status = statusValues.find((s) => s.code === code);
  if (!status) return <span className="text-fg-subtle">{code}</span>;

  const text = display === 'short' ? status.shortLabel : status.label;
  const iconOnly = display === 'icon';
  const a11y = iconOnly ? { title: status.label, 'aria-label': status.label } : { title: status.label };

  if (pillStyle === 'solid') {
    return (
      <span
        {...a11y}
        className={`inline-flex items-center gap-1 rounded-sm text-xs font-semibold leading-5 whitespace-nowrap ${
          iconOnly ? 'size-5 justify-center' : 'px-1.5'
        }`}
        style={{ background: status.color, color: readableTextOn(status.color) }}
      >
        <Icon name={status.icon} size={12} strokeWidth={2.25} />
        {!iconOnly && text}
      </span>
    );
  }

  if (pillStyle === 'icon') {
    return (
      <span {...a11y} className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap text-fg">
        <Icon name={status.icon} size={14} strokeWidth={2} className="shrink-0" style={{ color: status.color }} />
        {!iconOnly && text}
      </span>
    );
  }

  return (
    <span
      {...a11y}
      className={`inline-flex items-center gap-1 rounded-md border text-xs font-medium leading-5 whitespace-nowrap ${
        iconOnly ? 'size-5 justify-center' : 'px-1.5'
      }`}
      style={{
        background: `color-mix(in srgb, ${status.color} 16%, transparent)`,
        borderColor: `color-mix(in srgb, ${status.color} 38%, transparent)`,
        color: `color-mix(in srgb, ${status.color} 72%, var(--sgp-color-text))`,
      }}
    >
      <Icon name={status.icon} size={12} />
      {!iconOnly && text}
    </span>
  );
}

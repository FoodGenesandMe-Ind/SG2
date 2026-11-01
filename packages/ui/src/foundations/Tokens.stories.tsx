import type { Meta, StoryObj } from '@storybook/react-vite';
import { statusValues } from '@sgp/mock-data';
import type { ReactNode } from 'react';

const meta: Meta = {
  title: 'Foundations/Tokens',
  tags: ['deprecated'],
};

export default meta;

type Story = StoryObj;

const surfaceTokens = [
  'bg',
  'surface',
  'surface-raised',
  'surface-sunken',
  'border',
  'border-strong',
  'text',
  'text-muted',
  'text-subtle',
  'accent',
  'accent-hover',
  'accent-subtle',
  'danger',
  'warning',
  'success',
];

const paletteTokens = ['gray', 'red', 'orange', 'amber', 'lime', 'green', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink'];
const typeTokens = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const spaceTokens = ['1', '2', '3', '4', '6', '8'];
const radiusTokens = ['sm', 'md', 'lg'];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}

function Swatch({ name, cssVar }: { name: string; cssVar: string }) {
  return (
    <div className="flex w-36 flex-col gap-1">
      <div className="h-12 rounded-md border border-line" style={{ background: `var(${cssVar})` }} />
      <span className="text-sm text-fg">{name}</span>
      <code className="font-mono text-xs text-fg-subtle">{cssVar}</code>
    </div>
  );
}

export const AllTokens: Story = {
  render: () => (
    <div className="flex flex-col gap-8 bg-canvas p-8">
      <p className="max-w-2xl text-md text-fg-muted">
        Provisional values, status Proposed. These are placeholders for the foundations pitch, not approved
        design decisions.
      </p>

      <Section title="Color">
        <div className="flex flex-wrap gap-4">
          {surfaceTokens.map((name) => (
            <Swatch key={name} name={name} cssVar={`--sgp-color-${name}`} />
          ))}
        </div>
      </Section>

      <Section title="Default data palette">
        <p className="max-w-2xl text-fg-subtle">
          Offered to clients when they color status values, list values, and conditional formatting. Clients may
          also pick any other color.
        </p>
        <div className="flex flex-wrap gap-4">
          {paletteTokens.map((name) => (
            <Swatch key={name} name={name} cssVar={`--sgp-palette-${name}`} />
          ))}
        </div>
      </Section>

      <Section title="Starter status values (client data)">
        <div className="flex flex-wrap gap-4">
          {statusValues.map((status) => (
            <div key={status.code} className="flex w-36 flex-col gap-1">
              <div className="h-12 rounded-md border border-line" style={{ background: status.color }} />
              <span className="text-sm text-fg">{status.label}</span>
              <code className="font-mono text-xs text-fg-subtle">
                {status.code} · {status.meaning}
              </code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type scale">
        <div className="flex flex-col gap-2">
          {typeTokens.map((size) => (
            <div key={size} className="flex items-baseline gap-4">
              <code className="w-28 font-mono text-xs text-fg-subtle">--sgp-text-{size}</code>
              <span style={{ fontSize: `var(--sgp-text-${size})` }}>Ezra lights the last lamp.</span>
            </div>
          ))}
          <div className="flex items-baseline gap-4">
            <code className="w-28 font-mono text-xs text-fg-subtle">--sgp-font-script</code>
            <span className="font-script text-lg">EXT. COBBLESTONE STREET - DUSK</span>
          </div>
        </div>
      </Section>

      <Section title="Spacing">
        <div className="flex flex-col gap-2">
          {spaceTokens.map((step) => (
            <div key={step} className="flex items-center gap-4">
              <code className="w-28 font-mono text-xs text-fg-subtle">--sgp-space-{step}</code>
              <div className="h-3 bg-accent" style={{ width: `var(--sgp-space-${step})` }} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Radius and density">
        <div className="flex flex-wrap items-end gap-4">
          {radiusTokens.map((r) => (
            <div key={r} className="flex flex-col gap-1">
              <div
                className="h-16 w-24 border border-line-strong bg-surface-raised"
                style={{ borderRadius: `var(--sgp-radius-${r})` }}
              />
              <code className="font-mono text-xs text-fg-subtle">--sgp-radius-{r}</code>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <div className="w-48 border border-line bg-surface" style={{ height: 'var(--sgp-row-compact)' }} />
            <code className="font-mono text-xs text-fg-subtle">--sgp-row-compact</code>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-48 border border-line bg-surface" style={{ height: 'var(--sgp-row-comfortable)' }} />
            <code className="font-mono text-xs text-fg-subtle">--sgp-row-comfortable</code>
          </div>
        </div>
      </Section>
    </div>
  ),
};

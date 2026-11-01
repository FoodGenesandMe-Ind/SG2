import { resolveTableConfig, type StatusDisplay } from '@sgp/mock-data';
import type { ReactNode } from 'react';
import type { Direction, PillStyle } from './directions';
import { Specimen, type SpecimenProps } from './Specimen';
import { StatusPill } from './StatusPill';

export function StoryFrame({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-[1280px] flex-col gap-4 bg-canvas p-6 text-fg">
      <header className="flex max-w-3xl flex-col gap-1">
        <h2 className="text-xl font-semibold">{title}</h2>
        <div className="text-fg-muted">{intro}</div>
        <p className="text-sm text-fg-subtle">
          Proposed. Real mock data; thumbnails are placeholders. Compact density throughout.
        </p>
      </header>
      {children}
    </div>
  );
}

export function ThemeLabel({ children }: { children: ReactNode }) {
  return <h3 className="text-sm font-semibold uppercase tracking-wide text-fg-subtle">{children}</h3>;
}

/** The same specimen in dark, then light. */
export function DarkAndLight(props: Omit<SpecimenProps, 'theme'>) {
  return (
    <>
      <ThemeLabel>Dark</ThemeLabel>
      <Specimen {...props} theme="dark" />
      <ThemeLabel>Light</ThemeLabel>
      <Specimen {...props} theme="light" />
    </>
  );
}

const pillStyles: Array<{ style: PillStyle; name: string }> = [
  { style: 'icon', name: 'Icon and name' },
  { style: 'solid', name: 'Solid chips' },
  { style: 'tint', name: 'Tinted chips' },
];

const displays: Array<{ display: StatusDisplay; name: string }> = [
  { display: 'long', name: 'Long name' },
  { display: 'short', name: 'Short name' },
  { display: 'icon', name: 'Icon only' },
];

export function StatusMatrix({ direction, theme }: { direction: Direction; theme: 'dark' | 'light' }) {
  const codes = resolveTableConfig('Shot', 'prj01')!.fields.find((f) => f.code === 'status')!.validValues ?? [];
  return (
    <div
      className={`sgp-dir-${direction.id} sgp-theme-${theme} grid grid-cols-[9rem_repeat(3,minmax(0,1fr))] gap-px overflow-hidden rounded-lg border border-line bg-line font-sans text-md text-fg`}
      style={{ colorScheme: theme }}
    >
      <span className="bg-surface-sunken p-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{theme}</span>
      {displays.map((d) => (
        <span key={d.display} className="bg-surface-sunken p-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {d.name}
        </span>
      ))}
      {pillStyles.map((p) => (
        <div key={p.style} className="contents">
          <span className="bg-surface p-2 text-sm font-medium">{p.name}</span>
          {displays.map((d) => (
            <span key={d.display} className="flex flex-wrap content-start gap-x-2.5 gap-y-1.5 bg-surface p-2">
              {codes.map((code) => (
                <StatusPill key={code} code={code} pillStyle={p.style} display={d.display} />
              ))}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

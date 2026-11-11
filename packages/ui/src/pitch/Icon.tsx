import { Circle, icons, type LucideProps } from 'lucide-react';
import type { ComponentType } from 'react';

function toPascal(name: string) {
  return name
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

// Tabler's `stroke` is a number (line width); Lucide's is a color string.
type IconComponent = ComponentType<Omit<LucideProps, 'stroke'> & { stroke?: number | string }>;

/** Icons picked from a library at runtime (for example a Tabler icon on a new status), by their stored name. */
const registered = new Map<string, { Component: IconComponent; tabler: boolean }>();

export function registerIcon(name: string, Component: IconComponent, tabler = false) {
  registered.set(name, { Component, tabler });
}

/**
 * Renders an icon by its stored name, as kept in client data (tables, status values).
 * Plain names are Lucide in kebab case; "tabler:" names come from the Tabler library.
 */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const picked = registered.get(name);
  if (picked) {
    const { Component, tabler } = picked;
    return tabler ? (
      <Component size={props.size ?? 14} stroke={props.strokeWidth ?? 1.75} className={props.className} style={props.style} aria-hidden />
    ) : (
      <Component size={14} strokeWidth={1.75} aria-hidden {...props} />
    );
  }
  const Component = icons[toPascal(name) as keyof typeof icons] ?? Circle;
  return <Component size={14} strokeWidth={1.75} aria-hidden {...props} />;
}

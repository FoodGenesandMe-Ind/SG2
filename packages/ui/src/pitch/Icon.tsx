import { Circle, icons, type LucideProps } from 'lucide-react';

function toPascal(name: string) {
  return name
    .split('-')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join('');
}

/** Renders a lucide icon by its kebab-case name, as stored in client data (tables, status values). */
export function Icon({ name, ...props }: { name: string } & LucideProps) {
  const Component = icons[toPascal(name) as keyof typeof icons] ?? Circle;
  return <Component size={14} strokeWidth={1.75} aria-hidden {...props} />;
}

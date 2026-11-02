import { people } from '@sgp/mock-data';

export function personName(id: string) {
  return people.find((p) => p.id === id)?.name ?? id;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');
}

export function Avatar({ personId, size = 'sm' }: { personId: string; size?: 'sm' | 'md' }) {
  const name = personName(personId);
  return (
    <span
      title={name}
      className={`flex shrink-0 items-center justify-center rounded-full bg-accent-subtle font-semibold text-fg ${
        size === 'sm' ? 'size-5 text-xs' : 'size-7 text-xs'
      }`}
    >
      {initials(name)}
    </span>
  );
}

export function PersonChip({ personId }: { personId: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <Avatar personId={personId} />
      <span className="truncate">{personName(personId)}</span>
    </span>
  );
}

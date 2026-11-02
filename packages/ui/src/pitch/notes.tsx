import { versions, type Note } from '@sgp/mock-data';
import { placeholderThumb } from './color';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { Avatar, personName } from './people';
import { StatusPill } from './StatusPill';

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function noteSubject(note: Note) {
  const version = versions.find((v) => v.id === note.versionId);
  return `Note on ${version?.code ?? 'version'}`;
}

/** A frame grab with optional drawn markup, as attached to review notes. */
export function FrameGrab({ seed, frame, markup, large }: { seed: string; frame?: number; markup?: boolean; large?: boolean }) {
  return (
    <span
      className={`relative shrink-0 overflow-hidden rounded-sm ${large ? 'aspect-video w-full max-w-xl' : 'h-12 w-20'}`}
      style={{ background: placeholderThumb(seed) }}
    >
      {markup && (
        <svg viewBox="0 0 160 90" className="absolute inset-0 size-full" aria-label="Drawn markup">
          <ellipse cx="96" cy="40" rx="26" ry="16" fill="none" stroke="var(--sgp-markup-1)" strokeWidth={large ? 1.5 : 3} />
          <path d="M 60 70 C 72 62, 80 58, 88 54" fill="none" stroke="var(--sgp-markup-2)" strokeWidth={large ? 1.5 : 3} />
          <path d="M 84 50 l 6 2 l -3 5" fill="none" stroke="var(--sgp-markup-2)" strokeWidth={large ? 1.5 : 3} />
        </svg>
      )}
      {large && frame !== undefined && (
        <span className="absolute bottom-2 left-2 rounded-sm bg-surface-sunken/80 px-1.5 font-mono text-xs text-fg tabular-nums">
          Frame {frame}
        </span>
      )}
    </span>
  );
}

export function NoteCard({
  note,
  replies,
  direction,
  onOpen,
}: {
  note: Note;
  replies: Note[];
  direction: Direction;
  onOpen?: () => void;
}) {
  const version = versions.find((v) => v.id === note.versionId)!;
  return (
    <article className="flex gap-3">
      <Avatar personId={note.authorId} size="md" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-line bg-surface-raised p-3">
        <header className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <span className="font-medium">{personName(note.authorId)}</span>
          <Icon name="arrow-right" size={12} className="text-fg-subtle" />
          <span className="text-fg-muted">{personName(note.toId)}</span>
          <span className="text-fg-subtle">on</span>
          <span className="font-mono text-xs text-accent">{version.code}</span>
          <span className="ml-auto flex items-center gap-2 text-xs text-fg-subtle">
            {formatDateTime(note.createdAt)}
            <StatusPill code={note.status} pillStyle={direction.pillStyle} />
          </span>
        </header>
        <p className="text-md">{note.body}</p>
        {note.frame !== undefined && (
          <div className="flex items-center gap-2">
            <FrameGrab seed={version.code} markup={note.hasMarkup} />
            <span className="flex flex-col text-xs text-fg-muted">
              <span className="flex items-center gap-1 font-mono tabular-nums">
                <Icon name="film" size={12} /> Frame {note.frame}
              </span>
              {note.hasMarkup && <span>Drawn markup attached</span>}
            </span>
          </div>
        )}
        {replies.map((reply) => (
          <div key={reply.id} className="flex gap-2 border-t border-line pt-2">
            <Avatar personId={reply.authorId} />
            <div className="flex min-w-0 flex-col">
              <span className="flex items-center gap-2 text-sm">
                <span className="font-medium">{personName(reply.authorId)}</span>
                <span className="text-xs text-fg-subtle">{formatDateTime(reply.createdAt)}</span>
              </span>
              <span className="text-md">{reply.body}</span>
            </div>
          </div>
        ))}
        {onOpen && (
          <footer className="flex items-center gap-3 text-xs text-fg-subtle">
            <button className="flex items-center gap-1 hover:text-fg" onClick={onOpen}>
              <Icon name="mail-open" size={12} /> Open note
            </button>
            <span>
              {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
            </span>
          </footer>
        )}
      </div>
    </article>
  );
}

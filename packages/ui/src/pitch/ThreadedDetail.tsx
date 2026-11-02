import { useState, type MouseEvent, type ReactNode } from 'react';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { formatDateTime } from './notes';
import { Avatar, personName } from './people';
import { StatusPill } from './StatusPill';

export interface ThreadMessage {
  id: string;
  authorId: string;
  toId?: string;
  body: string;
  at: string;
  /** Internal comments are tinted and visible to staff only. */
  internal?: boolean;
  /** Attached files; counted with a paperclip on collapsed messages. */
  attachments?: string[];
  /** Inline preview shown when the message is expanded (for example a frame grab with markup). */
  preview?: ReactNode;
}

/** Non-reply entries: reads, status changes, assignments. */
export interface ThreadEvent {
  id: string;
  at: string;
  icon: string;
  text: ReactNode;
}

export interface SidePaneSection {
  title: string;
  fields: Array<{ label: string; value: ReactNode }>;
}

export interface ThreadedRecord {
  icon: string;
  subject: string;
  status: string;
  breadcrumb: ReactNode;
  messages: ThreadMessage[];
  events: ThreadEvent[];
  sidePane: SidePaneSection[];
  replyToId: string;
}

type Entry = { kind: 'message'; at: string; message: ThreadMessage } | { kind: 'event'; at: string; event: ThreadEvent };

function IconButton({ icon, label, onClick, active }: { icon: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      className={`flex size-7 items-center justify-center rounded-md border border-line-strong hover:bg-row-hover hover:text-fg ${
        active ? 'bg-accent-subtle text-fg' : 'text-fg-muted'
      }`}
      title={label}
      aria-label={label}
      onClick={onClick}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Composer({ replyToId }: { replyToId: string }) {
  const [mode, setMode] = useState<'public' | 'internal'>('public');
  return (
    <div
      className={`flex flex-col gap-2 rounded-lg border p-3 ${
        mode === 'internal' ? 'border-warning/50 bg-warning/10' : 'border-line-strong bg-surface-raised'
      }`}
    >
      <div className="flex items-center gap-3 text-sm">
        {(['public', 'internal'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`border-b-2 pb-0.5 ${mode === m ? 'border-accent font-medium text-fg' : 'border-transparent text-fg-muted'}`}
          >
            {m === 'public' ? 'Public reply' : 'Internal note'}
          </button>
        ))}
        <span className="ml-auto text-xs text-fg-subtle">
          {mode === 'public' ? `To ${personName(replyToId)}` : 'Visible to staff only'}
        </span>
      </div>
      <textarea
        aria-label={mode === 'public' ? 'Reply' : 'Internal note'}
        placeholder={mode === 'public' ? `Reply to ${personName(replyToId)}...` : 'Add an internal note...'}
        rows={3}
        className="resize-none bg-transparent text-md outline-none placeholder:text-fg-subtle"
      />
      <div className="flex items-center gap-3 text-fg-subtle">
        <Icon name="paperclip" />
        <Icon name="pen-line" />
        <Icon name="at-sign" />
        <button
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-accent px-3 text-sm font-medium text-fg-inverse"
          style={{ height: 'var(--sgp-row-compact)' }}
        >
          <Icon name="send" /> Send
        </button>
      </div>
    </div>
  );
}

/**
 * Display standard for "threaded" tables (Notes, Issues): one email-style thread, no tabs,
 * collapsible messages, inline system events, and all metadata in a side pane.
 */
export function ThreadedDetail({ record, direction }: { record: ThreadedRecord; direction: Direction }) {
  const [newestFirst, setNewestFirst] = useState(false);
  const ids = record.messages.map((m) => m.id);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([ids[0], ids[ids.length - 1]]));
  const allExpanded = expanded.size >= ids.length;
  const setAll = (open: boolean) => setExpanded(new Set(open ? ids : []));

  const toggle = (id: string, event: MouseEvent) => {
    if (event.metaKey || event.ctrlKey) {
      setAll(!allExpanded);
      return;
    }
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const entries: Entry[] = [
    ...record.messages.map((message) => ({ kind: 'message' as const, at: message.at, message })),
    ...record.events.map((event) => ({ kind: 'event' as const, at: event.at, event })),
  ].sort((a, b) => (newestFirst ? b.at.localeCompare(a.at) : a.at.localeCompare(b.at)));

  const composer = <Composer replyToId={record.replyToId} />;

  return (
    <div className="flex min-h-0 min-w-0 flex-1 bg-surface">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 flex-col gap-2 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1 text-xs text-fg-subtle">{record.breadcrumb}</div>
          <div className="flex items-center gap-3">
            <Icon name={record.icon} size={18} className="text-fg-subtle" />
            <h1 className="truncate text-xl font-semibold">{record.subject}</h1>
            <StatusPill code={record.status} pillStyle={direction.pillStyle} display="long" />
            <span className="ml-auto flex items-center gap-1.5">
              <span className="mr-1 text-xs text-fg-subtle">{record.messages.length} messages</span>
              <IconButton
                icon={newestFirst ? 'clock-arrow-down' : 'clock-arrow-up'}
                label={newestFirst ? 'Showing newest first. Show oldest first' : 'Showing oldest first. Show newest first'}
                active={newestFirst}
                onClick={() => setNewestFirst(!newestFirst)}
              />
              <IconButton
                icon={allExpanded ? 'chevrons-down-up' : 'chevrons-up-down'}
                label={allExpanded ? 'Collapse all messages (or Cmd+click a message)' : 'Expand all messages (or Cmd+click a message)'}
                onClick={() => setAll(!allExpanded)}
              />
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="flex flex-col gap-2 px-3 py-3">
            {newestFirst && composer}
            {entries.map((entry) => {
              if (entry.kind === 'event') {
                return (
                  <div key={entry.event.id} className="flex items-center gap-2 py-1 pl-10 text-xs text-fg-subtle">
                    <Icon name={entry.event.icon} size={12} />
                    <span>{entry.event.text}</span>
                    <span className="ml-auto">{formatDateTime(entry.at)}</span>
                  </div>
                );
              }
              const m = entry.message;
              const open = expanded.has(m.id);
              return (
                <article
                  key={m.id}
                  className={`flex gap-2 rounded-lg border ${
                    m.internal ? 'border-warning/40 bg-warning/10' : 'border-line bg-surface-raised'
                  } ${open ? 'py-3 pr-3 pl-1.5' : 'py-2 pr-3 pl-1.5'}`}
                >
                  <button
                    className="flex size-6 shrink-0 items-center justify-center self-start rounded-sm text-fg-subtle hover:bg-row-hover hover:text-fg"
                    aria-label={open ? 'Collapse message' : 'Expand message'}
                    aria-expanded={open}
                    title="Collapse or expand. Cmd+click to collapse or expand all."
                    onClick={(event) => toggle(m.id, event)}
                  >
                    <Icon name={open ? 'chevron-down' : 'chevron-right'} size={14} />
                  </button>
                  <Avatar personId={m.authorId} size="md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <header
                      className="flex cursor-pointer items-center gap-2 text-sm"
                      onClick={(event) => toggle(m.id, event)}
                      title="Click to expand or collapse. Cmd+click to expand or collapse all."
                    >
                      <span className="font-medium">{personName(m.authorId)}</span>
                      {open && m.toId && (
                        <>
                          <Icon name="arrow-right" size={12} className="text-fg-subtle" />
                          <span className="text-fg-muted">{personName(m.toId)}</span>
                        </>
                      )}
                      {m.internal && (
                        <span className="flex items-center gap-1 rounded-sm bg-warning/20 px-1.5 text-xs text-fg">
                          <Icon name="lock" size={11} /> Internal
                        </span>
                      )}
                      {!open && <span className="min-w-0 flex-1 truncate text-fg-muted">{m.body}</span>}
                      {!open && (m.attachments?.length ?? 0) > 0 && (
                        <span
                          className="ml-auto flex shrink-0 items-center gap-0.5 text-xs text-fg-muted"
                          title={m.attachments!.join('\n')}
                          aria-label={`${m.attachments!.length} ${m.attachments!.length === 1 ? 'attachment' : 'attachments'}`}
                        >
                          <Icon name="paperclip" size={12} />
                          {m.attachments!.length}
                        </span>
                      )}
                      <span className={`${!open && m.attachments?.length ? '' : 'ml-auto'} shrink-0 text-xs text-fg-subtle`}>
                        {formatDateTime(m.at)}
                      </span>
                    </header>
                    {open && (
                      <>
                        <p className="text-md">{m.body}</p>
                        {m.preview}
                        {(m.attachments?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {m.attachments!.map((name) => (
                              <span
                                key={name}
                                className="flex items-center gap-1.5 rounded-md border border-line bg-surface px-2 text-xs text-fg"
                                style={{ height: 'var(--sgp-row-compact)' }}
                              >
                                <Icon name="paperclip" size={12} className="text-fg-subtle" />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </article>
              );
            })}
            {!newestFirst && composer}
          </div>
        </div>
      </div>

      <aside className="flex w-80 shrink-0 flex-col overflow-auto border-l border-line bg-surface-raised" aria-label="Details">
        {record.sidePane.map((section) => (
          <section key={section.title} className="flex flex-col gap-2 border-b border-line p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{section.title}</h2>
            <dl className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 text-sm">
              {section.fields.map((f) => (
                <div key={f.label} className="contents">
                  <dt className="text-fg-subtle">{f.label}</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </aside>
    </div>
  );
}

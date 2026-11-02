import { notes, shots, statusValues, tasks, versions, type StatusDisplay } from '@sgp/mock-data';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { FrameGrab, formatDateTime, noteSubject } from './notes';
import { PersonChip, personName } from './people';
import { StatusPill } from './StatusPill';
import { ThreadedDetail, type ThreadEvent, type ThreadedRecord } from './ThreadedDetail';

const statusLabel = (code: string) => statusValues.find((s) => s.code === code)?.label ?? code;

function Chip({ children }: { children: string }) {
  return <span className="rounded-sm bg-accent-subtle px-1.5 text-xs">{children}</span>;
}

/** Note detail, using the threaded-table standard. */
export function NoteDetail({
  noteId,
  direction,
  statusDisplay,
  onBackToShot,
  onBackToShots,
}: {
  noteId: string;
  direction: Direction;
  statusDisplay: StatusDisplay;
  onBackToShot: (shotId: string) => void;
  onBackToShots: () => void;
}) {
  const note = notes.find((n) => n.id === noteId)!;
  const version = versions.find((v) => v.id === note.versionId)!;
  const task = tasks.find((t) => t.id === version.taskId)!;
  const shot = shots.find((s) => s.id === task.entityId);
  const replies = notes.filter((n) => n.parentNoteId === note.id);
  const kind = note.frame !== undefined ? 'Retake' : 'Approval';
  const updated = [note, ...replies].map((n) => n.createdAt).sort().at(-1)!;
  const link = 'hover:text-fg hover:underline';

  const events: ThreadEvent[] = [
    ...(note.readBy ?? []).map((r, i) => ({
      id: `read-${i}`,
      at: r.at,
      icon: 'eye',
      text: `${personName(r.personId)} read this note`,
    })),
    ...(note.statusChanges ?? []).map((c, i) => ({
      id: `status-${i}`,
      at: c.at,
      icon: 'arrow-right-left',
      text: `${personName(c.byId)} changed the status of the Note from ${statusLabel(c.from)} to ${statusLabel(c.to)}`,
    })),
  ];

  const record: ThreadedRecord = {
    icon: 'message-square',
    subject: noteSubject(note),
    status: note.status,
    replyToId: note.authorId,
    breadcrumb: (
      <>
        <span>The Last Lamplighter</span>
        <Icon name="chevron-right" size={12} />
        <span>Production</span>
        <Icon name="chevron-right" size={12} />
        <button className={link} onClick={onBackToShots}>
          Shots
        </button>
        {shot && (
          <>
            <Icon name="chevron-right" size={12} />
            <button className={link} onClick={() => onBackToShot(shot.id)}>
              {shot.code}
            </button>
            <Icon name="chevron-right" size={12} />
            <button className={link} onClick={() => onBackToShot(shot.id)}>
              Notes
            </button>
          </>
        )}
        <Icon name="chevron-right" size={12} />
        <span className="text-fg-muted">{noteSubject(note)}</span>
      </>
    ),
    messages: [note, ...replies].map((n, i) => ({
      id: n.id,
      authorId: n.authorId,
      toId: n.toId,
      body: n.body,
      at: n.createdAt,
      attachments: i === 0 && n.frame !== undefined ? [`${version.code}_frame${n.frame}${n.hasMarkup ? '_markup' : ''}.png`] : undefined,
      preview:
        i === 0 && n.frame !== undefined ? <FrameGrab seed={version.code} frame={n.frame} markup={n.hasMarkup} large /> : undefined,
    })),
    events,
    sidePane: [
      {
        title: 'Note',
        fields: [
          { label: 'Status', value: <StatusPill code={note.status} pillStyle={direction.pillStyle} display="long" /> },
          { label: 'Type', value: <Chip>{kind}</Chip> },
          { label: 'To', value: <PersonChip personId={note.toId} /> },
          { label: 'From', value: <PersonChip personId={note.authorId} /> },
          {
            label: 'Cc',
            value: (
              <span className="flex items-center gap-1 text-fg-muted">
                <Icon name="users" size={12} /> Shot followers
              </span>
            ),
          },
          {
            label: 'Labels',
            value: (
              <span className="flex flex-wrap gap-1">
                <Chip>{task.name}</Chip>
                <Chip>Director note</Chip>
              </span>
            ),
          },
        ],
      },
      {
        title: 'Regarding',
        fields: [
          {
            label: 'Shot',
            value: shot ? (
              <button className="font-medium text-accent hover:underline" onClick={() => onBackToShot(shot.id)}>
                {shot.code}
              </button>
            ) : (
              '-'
            ),
          },
          { label: 'Version', value: <span className="truncate font-mono text-xs">{version.code}</span> },
          { label: 'Version status', value: <StatusPill code={version.status} pillStyle={direction.pillStyle} display={statusDisplay} /> },
          { label: 'Task', value: task.name },
          { label: 'Frame', value: <span className="font-mono text-xs">{note.frame ?? '-'}</span> },
        ],
      },
      {
        title: 'Attachments',
        fields:
          note.frame !== undefined
            ? [
                {
                  label: note.hasMarkup ? 'Frame + markup' : 'Frame grab',
                  value: <FrameGrab seed={version.code} markup={note.hasMarkup} />,
                },
              ]
            : [{ label: 'None', value: <span className="text-fg-subtle">-</span> }],
      },
      {
        title: 'Dates',
        fields: [
          { label: 'Created', value: formatDateTime(note.createdAt) },
          { label: 'Updated', value: formatDateTime(updated) },
        ],
      },
    ],
  };

  return <ThreadedDetail record={record} direction={direction} />;
}

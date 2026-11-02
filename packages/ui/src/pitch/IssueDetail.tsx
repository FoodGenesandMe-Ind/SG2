import { issueComments, issues, projects, statusValues } from '@sgp/mock-data';
import type { Direction } from './directions';
import { Icon } from './Icon';
import { formatDateTime } from './notes';
import { PersonChip, personName } from './people';
import { StatusPill } from './StatusPill';
import { ThreadedDetail, type ThreadedRecord } from './ThreadedDetail';

const statusLabel = (code: string) => statusValues.find((s) => s.code === code)?.label ?? code;

/** Issue detail: the same threaded-table standard as Notes. */
export function IssueDetail({ issueId, direction }: { issueId: string; direction: Direction }) {
  const issue = issues.find((i) => i.id === issueId)!;
  const comments = issueComments.filter((c) => c.issueId === issue.id);
  const project = projects.find((p) => p.id === issue.projectId);
  const updated = [issue.createdAt, ...comments.map((c) => c.createdAt), ...(issue.statusChanges ?? []).map((c) => c.at)]
    .sort()
    .at(-1)!;

  const record: ThreadedRecord = {
    icon: 'bug',
    subject: issue.title,
    status: issue.status,
    replyToId: issue.reporterId,
    breadcrumb: (
      <>
        <span>Company</span>
        <Icon name="chevron-right" size={12} />
        <span>Studio admin</span>
        <Icon name="chevron-right" size={12} />
        <span>Open issues</span>
        <Icon name="chevron-right" size={12} />
        <span className="text-fg-muted">#{issue.id.replace('iss', '')}</span>
      </>
    ),
    messages: comments.map((c) => ({
      id: c.id,
      authorId: c.authorId,
      body: c.body,
      at: c.createdAt,
      internal: c.internal,
      attachments: c.attachments,
    })),
    events: [
      ...(issue.readBy ?? []).map((r, i) => ({ id: `read-${i}`, at: r.at, icon: 'eye', text: `${personName(r.personId)} viewed this issue` })),
      ...(issue.statusChanges ?? []).map((c, i) => ({
        id: `status-${i}`,
        at: c.at,
        icon: 'arrow-right-left',
        text: `${personName(c.byId)} changed the status of the Issue from ${statusLabel(c.from)} to ${statusLabel(c.to)}`,
      })),
      ...(issue.assigneeId
        ? [{ id: 'assigned', at: issue.readBy?.[0]?.at ?? issue.createdAt, icon: 'user-plus', text: `${personName(issue.assigneeId)} was assigned` }]
        : []),
    ],
    sidePane: [
      {
        title: 'Issue',
        fields: [
          { label: 'Status', value: <StatusPill code={issue.status} pillStyle={direction.pillStyle} display="long" /> },
          { label: 'Priority', value: <span className="capitalize">{issue.priority ?? 'normal'}</span> },
          { label: 'Assignee', value: issue.assigneeId ? <PersonChip personId={issue.assigneeId} /> : '-' },
          { label: 'Requester', value: <PersonChip personId={issue.reporterId} /> },
          { label: 'Project', value: project?.name ?? 'Company-wide' },
          {
            label: 'Tags',
            value: (
              <span className="flex flex-wrap gap-1">
                {(issue.tags ?? []).map((t) => (
                  <span key={t} className="rounded-sm bg-accent-subtle px-1.5 text-xs">
                    {t}
                  </span>
                ))}
              </span>
            ),
          },
        ],
      },
      {
        title: 'Dates',
        fields: [
          { label: 'Created', value: formatDateTime(issue.createdAt) },
          { label: 'Updated', value: formatDateTime(updated) },
        ],
      },
    ],
  };

  return <ThreadedDetail record={record} direction={direction} />;
}

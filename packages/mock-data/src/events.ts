import { notes, versions } from './generate';
import { people } from './people';
import { teaserShots } from './project';
import type { PipelineEvent } from './types';

const nameOf = (id: string) => people.find((p) => p.id === id)?.name ?? id;

type RawEvent = Omit<PipelineEvent, 'id'>;

const raw: RawEvent[] = [
  {
    at: '2026-09-01T08:30:00Z',
    userId: 'p01',
    kind: 'create',
    table: 'Project',
    recordId: 'prj01',
    projectId: 'prj01',
    description: 'Nephi Sanchez created The Last Lamplighter from template 3D Animation v1',
  },
  {
    at: '2026-10-20T10:00:00Z',
    userId: 'p01',
    kind: 'config',
    table: 'Template',
    recordId: 'tpl-3d',
    projectId: 'tprj-3d',
    field: 'currentVersion',
    oldValue: 1,
    newValue: 2,
    description: 'Nephi Sanchez published 3D Animation v2 (3 changes); queued as incoming changes in The Last Lamplighter',
  },
  {
    at: '2026-10-22T09:30:00Z',
    userId: 'p04',
    kind: 'config',
    table: 'Sequence',
    recordId: 'description',
    projectId: 'prj01',
    field: 'label',
    oldValue: 'Description',
    newValue: 'Synopsis',
    description: 'Grace Okafor accepted the incoming template change "Sequence description is now Synopsis"',
  },
  {
    at: '2026-10-22T09:31:00Z',
    userId: 'p04',
    kind: 'config',
    table: 'Shot',
    recordId: 'dueDate',
    projectId: 'prj01',
    field: 'label',
    description: 'Grace Okafor dismissed the incoming template change "Shot due date is now Delivery due"',
  },
  {
    at: '2026-10-01T08:15:00Z',
    userId: 'p01',
    kind: 'create',
    table: 'Project',
    recordId: 'prj02',
    projectId: 'prj02',
    description: 'Nephi Sanchez created Lamplighter Teaser from template Live action / VFX v1',
  },
  {
    at: '2026-10-12T14:00:00Z',
    userId: 'p03',
    kind: 'config',
    table: 'Shot',
    recordId: 'status',
    projectId: 'prj01',
    field: 'validValues',
    newValue: 'adds Omitted',
    description: 'Tomas Reyes added Omitted to the Shot status list in The Last Lamplighter (local change)',
  },
  {
    at: '2026-10-01T08:24:00Z',
    userId: 'p01',
    kind: 'config',
    table: 'Shot',
    recordId: 'frameIn',
    projectId: 'prj02',
    field: 'label',
    oldValue: 'Cut in',
    newValue: 'Plate in',
    description: 'Nephi Sanchez relabeled Shot field "Cut in" to "Plate in" in Lamplighter Teaser (local change)',
  },
  {
    at: '2026-10-28T17:02:00Z',
    userId: 'p01',
    kind: 'config',
    table: 'Page',
    recordId: 'pg-lmp-animation-status',
    projectId: 'prj01',
    field: 'filters',
    newValue: 'projectId is prj01',
    description:
      'Nephi Sanchez narrowed page "Lamplighter animation status" to one project and filed it in The Last Lamplighter > Production',
  },
];

for (const version of versions) {
  raw.push({
    at: version.submittedAt,
    userId: version.createdById,
    kind: 'create',
    table: 'Version',
    recordId: version.id,
    projectId: version.projectId,
    description: `${nameOf(version.createdById)} submitted ${version.code}`,
  });
}

for (const note of notes) {
  const version = versions.find((v) => v.id === note.versionId)!;
  const approved = note.frame === undefined;
  raw.push({
    at: note.createdAt,
    userId: note.authorId,
    kind: 'create',
    table: 'Note',
    recordId: note.id,
    projectId: note.projectId,
    description: note.parentNoteId
      ? `${nameOf(note.authorId)} replied on ${version.code}`
      : `${nameOf(note.authorId)} wrote a note on ${version.code}${note.frame ? ` at frame ${note.frame}` : ''}`,
  });
  if (note.parentNoteId) continue;
  raw.push({
    at: note.createdAt,
    userId: note.authorId,
    kind: 'update',
    table: 'Version',
    recordId: version.id,
    projectId: version.projectId,
    field: 'status',
    oldValue: 'rev',
    newValue: approved ? 'apr' : 'rtk',
    description: `${nameOf(note.authorId)} set ${version.code} to ${approved ? 'Approved' : 'Retake'}`,
  });
}

teaserShots
  .filter((shot) => shot.status === 'frc')
  .forEach((shot, i) => {
    raw.push({
      at: `2026-10-2${4 + i}T15:00:00Z`,
      userId: 'p13',
      kind: 'update',
      table: 'Shot',
      recordId: shot.id,
      projectId: shot.projectId,
      field: 'status',
      oldValue: 'ip',
      newValue: 'frc',
      description: `${nameOf('p13')} set ${shot.code} to Final Render Complete`,
    });
  });

raw.sort((a, b) => a.at.localeCompare(b.at));

export const events: PipelineEvent[] = raw.map((event, i) => ({ id: 100_001 + i, ...event }));

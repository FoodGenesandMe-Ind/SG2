import {
  addDays,
  animationShotSeeds,
  assetProgress,
  assetSeeds,
  pipelineSteps,
  sequences,
  shotProgress,
  teaserShots,
} from './project';
import type { Asset, Note, PipelineStep, Shot, Task, Version } from './types';

/** Deterministic FNV-1a hash so the mock production is identical on every load. */
export function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const BASE_DATE = Date.parse('2026-09-01T09:00:00Z');
const DAY_MS = 86_400_000;

function isoAt(offsetDays: number): string {
  return new Date(BASE_DATE + offsetDays * DAY_MS).toISOString();
}

const ANIMATION_PROJECT_ID = 'prj01';
const DIRECTOR_ID = 'p02';

const assigneeByStep: Record<string, string> = {
  ART: 'p11',
  MOD: 'p07',
  RIG: 'p08',
  TEX: 'p11',
  STB: 'p11',
  LAY: 'p12',
  ANM: 'p09',
  FX: 'p10',
  LGT: 'p06',
  CMP: 'p13',
};

const reviewerByStep: Record<string, string> = {
  RIG: 'p05',
  ANM: 'p05',
};

/** Shot stage status (animated short pipeline type) while a step is the first unapproved one. */
const shotStageByStep: Record<string, string> = {
  STB: 'story',
  LAY: 'layout',
  ANM: 'anim',
  FX: 'complight',
  LGT: 'complight',
  CMP: 'complight',
};

const retakeNotes: Record<string, string[]> = {
  ART: [
    'Ezra reads too young. Deepen the brow lines and slump the shoulders.',
    'Push the silhouette; it gets lost against the street.',
  ],
  MOD: [
    'Coat hem needs more thickness; it looks like paper.',
    'Topology around the mouth will not hold up in close-ups.',
  ],
  RIG: ['Wing fold control flips past 80 degrees.', 'Need a space switch on the pole hand.'],
  TEX: [
    'Brass is too clean. Add hand-worn wear on the grip.',
    'Roughness reads as plastic under the warm lamps.',
  ],
  STB: [
    'Hold on Ezra\u2019s face two beats longer before the cut.',
    'Staging feels flat. Try a lower angle so the lamps tower over him.',
  ],
  LAY: [
    'Camera drifts too early. Lock it until Pip enters frame.',
    'Go wider on the lens; we lose the depth of the street.',
  ],
  ANM: [
    'Ezra\u2019s weight shift on the step reads light. He is carrying a pole.',
    'Pip\u2019s wing beats are too regular. Add flutter variation.',
    'Love the watch beat, but the smile lands a few frames late.',
  ],
  FX: [
    'Flame flicker is too fast for gas. Slow it down and soften it.',
    'Smoke from the wick should drift camera left with the wind.',
  ],
  LGT: [
    'Lamp pools are too even. Let the gaps between lamps fall darker.',
    'Warm key on Ezra is great; cool the fill a touch.',
  ],
  CMP: [
    'Edges on Pip\u2019s wings are chattering.',
    'Lift the haze on the skyline matte; it is crushing the silhouette.',
  ],
};

const approvalNotes = ['Approved. Beautiful work.', 'Approved. Moving on to the next step.'];

const subTaskNames = ['Blocking', 'Spline', 'Polish'];

const todoTexts: Record<string, string[]> = {
  ART: ['Silhouette pass', 'Color keys', 'Turnaround sheet', 'Expression sheet'],
  MOD: ['Blockout', 'Topology pass', 'UV layout', 'Hand off to rigging'],
  RIG: ['Skeleton', 'Facial controls', 'Space switches', 'Rig test animation'],
  TEX: ['Base materials', 'Wear and dirt', 'Look-dev turntable', 'Texture publish'],
  STB: ['Thumbnails', 'Clean-up boards', 'Camera notes', 'Export panels'],
  LAY: ['Camera blocking', 'Set dressing check', 'Lens and framing', 'Layout publish'],
  ANM: ['Lip sync', 'Hand contacts', 'Arc pass', 'Final playblast'],
  FX: ['Flame sim', 'Smoke sim', 'Cache publish'],
  LGT: ['Key and fill', 'Lamp pools', 'Render layers', 'Light publish'],
  CMP: ['Plate prep', 'Matte integration', 'Grade', 'Final render check'],
};

function buildTodos(taskId: string, stepCode: string, status: string, h: number) {
  if (status === 'wtg') return [];
  const texts = todoTexts[stepCode].slice(0, 2 + (h % 3));
  const doneCount = status === 'apr' ? texts.length : status === 'rdy' ? 0 : Math.floor(texts.length / 2);
  return texts.map((text, i) => ({ id: `${taskId}-todo-${i + 1}`, text, done: i < doneCount }));
}

function pick<T>(items: T[], key: string): T {
  return items[hash(key) % items.length];
}

function taskStatus(progress: number, stepIndex: number, stepCount: number, key: string): string {
  const done = progress * stepCount;
  if (stepIndex + 1 <= done) return 'apr';
  if (stepIndex < done) return pick(['ip', 'rev', 'rtk'], key);
  if (stepIndex < done + 1) return 'rdy';
  return 'wtg';
}

function assetStatus(statuses: string[]): string {
  if (statuses.every((s) => s === 'apr')) return 'apr';
  if (statuses.some((s) => s === 'ip' || s === 'rev' || s === 'rtk' || s === 'apr')) return 'ip';
  if (statuses.some((s) => s === 'rdy')) return 'rdy';
  return 'wtg';
}

function shotStatus(statuses: string[], steps: PipelineStep[]): string {
  if (statuses.every((s) => s === 'apr')) return 'final';
  if (statuses.every((s) => s === 'wtg')) return 'nrdy';
  const current = statuses.findIndex((s) => s !== 'apr');
  if (current === 0 && statuses[0] === 'rdy') return 'rdy';
  return shotStageByStep[steps[current].code];
}

function reviewerFor(stepCode: string, assigneeId: string): string {
  const reviewer = reviewerByStep[stepCode] ?? DIRECTOR_ID;
  return reviewer === assigneeId ? DIRECTOR_ID : reviewer;
}

interface EntityRef {
  type: 'Shot' | 'Asset';
  id: string;
  code: string;
  progress: number;
  frameIn: number;
  frameOut: number;
  scheduleOffset: number;
}

const tasks: Task[] = [];
const versions: Version[] = [];
const notes: Note[] = [];

function buildEntity(entity: EntityRef, steps: PipelineStep[]): string[] {
  return steps.map((step, stepIndex) => {
    const key = `${entity.id}:${step.code}`;
    const h = hash(key);
    const status = taskStatus(entity.progress, stepIndex, steps.length, key);
    const assigneeId = step.code === 'ANM' && h % 3 === 0 ? 'p05' : assigneeByStep[step.code];
    const dueOffset = entity.scheduleOffset + step.order * 5;
    const inFlight = status === 'ip' || status === 'rev' || status === 'rtk';
    const loggedDays =
      status === 'apr'
        ? Math.round(step.bidDays * (0.8 + (h % 50) / 100) * 10) / 10
        : inFlight
          ? Math.round(step.bidDays * 0.5 * 10) / 10
          : 0;

    const startOffset = dueOffset - Math.max(2, Math.round(step.bidDays * 1.4));
    const taskId = `t-${entity.id}-${step.code.toLowerCase()}`;
    const task: Task = {
      id: taskId,
      projectId: ANIMATION_PROJECT_ID,
      name: step.name,
      entityType: entity.type,
      entityId: entity.id,
      stepId: step.id,
      assigneeId,
      status,
      bidDays: step.bidDays,
      loggedDays,
      startDate: isoAt(startOffset).slice(0, 10),
      dueDate: isoAt(dueOffset).slice(0, 10),
      todos: buildTodos(taskId, step.code, status, h),
    };
    tasks.push(task);

    if (step.code === 'ANM' && status !== 'wtg' && status !== 'rdy') {
      const span = dueOffset - startOffset;
      subTaskNames.forEach((name, i) => {
        const subStatus = status === 'apr' ? 'apr' : i === 0 ? 'apr' : i === 1 ? (status === 'rev' ? 'rev' : 'ip') : 'wtg';
        tasks.push({
          ...task,
          id: `${taskId}-${name.toLowerCase()}`,
          parentTaskId: taskId,
          name,
          status: subStatus,
          bidDays: Math.round((step.bidDays / 3) * 10) / 10,
          loggedDays: subStatus === 'apr' ? Math.round((loggedDays / 3) * 10) / 10 : subStatus === 'wtg' ? 0 : 0.5,
          startDate: isoAt(startOffset + Math.round((span * i) / 3)).slice(0, 10),
          dueDate: isoAt(startOffset + Math.round((span * (i + 1)) / 3)).slice(0, 10),
          todos: [],
        });
      });
    }

    const versionCount =
      status === 'ip' ? h % 2 : status === 'apr' || status === 'rev' || status === 'rtk' ? 1 + (h % 3) : 0;
    const reviewerId = reviewerFor(step.code, assigneeId);

    for (let n = 1; n <= versionCount; n++) {
      const isLatest = n === versionCount;
      const versionStatus = isLatest && status !== 'ip' ? status : 'rtk';
      const code = `${entity.code}_${step.code}_v${String(n).padStart(3, '0')}`;
      const submittedOffset = dueOffset - (versionCount - n) * 2 - 3;
      const version: Version = {
        id: `v-${code.toLowerCase()}`,
        projectId: ANIMATION_PROJECT_ID,
        code,
        taskId: task.id,
        createdById: assigneeId,
        status: versionStatus,
        submittedAt: isoAt(submittedOffset),
        frameIn: entity.frameIn,
        frameOut: entity.frameOut,
        description:
          n === 1
            ? 'First pass.'
            : versionStatus === 'apr'
              ? 'Final polish.'
              : `Addressed notes from v${String(n - 1).padStart(3, '0')}.`,
        reviewedById: versionStatus === 'apr' || versionStatus === 'rtk' ? reviewerId : undefined,
      };
      versions.push(version);

      if (versionStatus === 'rtk') {
        const length = entity.frameOut - entity.frameIn + 1;
        const addressed = !isLatest;
        notes.push({
          id: `n-${version.id}`,
          projectId: ANIMATION_PROJECT_ID,
          status: addressed ? 'closed' : 'open',
          versionId: version.id,
          authorId: reviewerId,
          toId: assigneeId,
          body: pick(retakeNotes[step.code], code),
          frame: entity.frameIn + (hash(`${code}:frame`) % length),
          hasMarkup: hash(`${code}:markup`) % 2 === 0,
          createdAt: isoAt(submittedOffset + 1),
        });
        if (addressed) {
          notes.push({
            id: `n-${version.id}-reply`,
            projectId: ANIMATION_PROJECT_ID,
            parentNoteId: `n-${version.id}`,
            status: 'closed',
            versionId: version.id,
            authorId: assigneeId,
            toId: reviewerId,
            body: `Thanks. Addressed in v${String(n + 1).padStart(3, '0')}.`,
            hasMarkup: false,
            createdAt: isoAt(submittedOffset + 1.8),
          });
        }
      } else if (versionStatus === 'apr') {
        notes.push({
          id: `n-${version.id}`,
          projectId: ANIMATION_PROJECT_ID,
          status: 'closed',
          versionId: version.id,
          authorId: reviewerId,
          toId: assigneeId,
          body: pick(approvalNotes, code),
          hasMarkup: false,
          createdAt: isoAt(submittedOffset + 1),
        });
      }
    }

    return status;
  });
}

const assetSteps = pipelineSteps.filter((s) => s.templateId === 'tpl-3d' && s.appliesTo === 'Asset');
const shotSteps = pipelineSteps.filter((s) => s.templateId === 'tpl-3d' && s.appliesTo === 'Shot');

export const assets: Asset[] = assetSeeds.map((seed) => {
  const statuses = buildEntity(
    {
      type: 'Asset',
      id: seed.id,
      code: seed.code,
      progress: assetProgress[seed.id],
      frameIn: 1001,
      frameOut: 1048,
      scheduleOffset: 7,
    },
    assetSteps,
  );
  return { ...seed, status: assetStatus(statuses) };
});

const animationShots: Shot[] = animationShotSeeds.map((seed) => {
  const sequenceIndex = sequences.findIndex((s) => s.id === seed.sequenceId);
  const statuses = buildEntity(
    {
      type: 'Shot',
      id: seed.id,
      code: seed.code,
      progress: shotProgress[seed.id],
      frameIn: seed.frameIn,
      frameOut: seed.frameOut,
      scheduleOffset: 20 + sequenceIndex * 30,
    },
    shotSteps,
  );
  const latest = versions
    .filter((v) => v.taskId.startsWith(`t-${seed.id}-`))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0];
  return {
    ...seed,
    status: shotStatus(statuses, shotSteps),
    updatedAt: latest?.submittedAt ?? seed.createdAt,
    updatedById: latest?.createdById ?? seed.createdById,
  };
});

const taskById = (id: string) => tasks.find((t) => t.id === id)!;

// Sub-tasks under one task, each with its own assignee and to-do list (Comp on 010_0030).
{
  const comp = taskById('t-sh010_30-cmp');
  comp.todos = [];
  tasks.push(
    {
      ...comp,
      id: `${comp.id}-roto`,
      parentTaskId: comp.id,
      name: "Roto Pip's wings",
      assigneeId: 'p10',
      status: 'apr',
      bidDays: 0.5,
      loggedDays: 0.6,
      dueDate: addDays(comp.startDate, 1),
      todos: [
        { id: `${comp.id}-roto-1`, text: 'Left wing mattes', done: true },
        { id: `${comp.id}-roto-2`, text: 'Right wing mattes', done: true },
        { id: `${comp.id}-roto-3`, text: 'Motion blur check', done: true },
      ],
    },
    {
      ...comp,
      id: `${comp.id}-matte`,
      parentTaskId: comp.id,
      name: 'Skyline matte integration',
      assigneeId: 'p11',
      status: 'ip',
      bidDays: 1,
      loggedDays: 0.5,
      startDate: addDays(comp.startDate, 1),
      todos: [
        { id: `${comp.id}-matte-1`, text: 'Match haze to plate', done: true },
        { id: `${comp.id}-matte-2`, text: 'Edge blend on rooftops', done: false },
        { id: `${comp.id}-matte-3`, text: 'Grade to the lamp pools', done: false },
      ],
    },
  );
}

// One example of each dependency type on 030_0010, with dates that honor them.
{
  const t = (step: string) => taskById(`t-sh030_10-${step}`);
  const [stb, lay, anm, fx, lgt, cmp] = ['stb', 'lay', 'anm', 'fx', 'lgt', 'cmp'].map(t);
  lay.startDate = addDays(stb.dueDate, 1);
  lay.dependencies = [{ predecessorId: stb.id, type: 'FS' }];
  anm.startDate = addDays(lay.dueDate, -1);
  anm.dependencies = [{ predecessorId: lay.id, type: 'FS' }];
  fx.startDate = anm.startDate;
  fx.dependencies = [{ predecessorId: anm.id, type: 'SS' }];
  lgt.dependencies = [{ predecessorId: fx.id, type: 'SF' }];
  cmp.dueDate = lgt.dueDate;
  cmp.startDate = addDays(lgt.dueDate, -3);
  cmp.dependencies = [{ predecessorId: lgt.id, type: 'FF' }];
}

// Read receipts and status history, shown inline in note threads.
for (const note of notes) {
  if (note.parentNoteId) continue;
  const created = Date.parse(note.createdAt);
  note.readBy = [{ personId: note.toId, at: new Date(created + 0.15 * DAY_MS).toISOString() }];
  if (note.status === 'closed') {
    const reply = notes.find((r) => r.parentNoteId === note.id);
    const closedAt = reply ? Date.parse(reply.createdAt) + 0.05 * DAY_MS : created + 0.4 * DAY_MS;
    note.statusChanges = [{ from: 'open', to: 'closed', byId: note.toId, at: new Date(closedAt).toISOString() }];
  }
}

export const shots: Shot[] = [...animationShots, ...teaserShots];

export { tasks, versions, notes };

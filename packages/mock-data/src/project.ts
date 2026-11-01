import type { Asset, PipelineStep, Project, Sequence, Shot } from './types';

const ALL_CREW = ['p01', 'p02', 'p03', 'p04', 'p05', 'p06', 'p07', 'p08', 'p09', 'p10', 'p11', 'p12', 'p13', 'p14', 'p16', 'p17'];

function templateProject(id: string, code: string, name: string): Project {
  return {
    id,
    code,
    name,
    logline: '',
    isTemplate: true,
    memberIds: ['p01'],
    fps: 24,
    resolution: { width: 1920, height: 1080 },
    startDate: '2026-08-20',
    targetDate: '2026-08-20',
  };
}

export const projects: Project[] = [
  {
    id: 'prj01',
    code: 'LMP',
    name: 'The Last Lamplighter',
    logline:
      'In a city switching to electric light, an old lamplighter and the moth who follows his flame make one final round.',
    isTemplate: false,
    source: { kind: 'template', sourceId: 'tpl-3d', version: 1, templateId: 'tpl-3d' },
    memberIds: ALL_CREW,
    fps: 24,
    resolution: { width: 2048, height: 858 },
    startDate: '2026-09-01',
    targetDate: '2027-03-31',
  },
  {
    id: 'prj02',
    code: 'TSR',
    name: 'Lamplighter Teaser',
    logline: 'A live-action teaser: a real gas lamp on a real street, and a CG Pip who finds it.',
    isTemplate: false,
    source: { kind: 'template', sourceId: 'tpl-live', version: 1, templateId: 'tpl-live' },
    memberIds: ['p01', 'p02', 'p03', 'p10', 'p13', 'p14', 'p15'],
    fps: 24,
    resolution: { width: 3840, height: 1608 },
    startDate: '2026-10-01',
    targetDate: '2026-12-15',
  },
  templateProject('tprj-3d', 'TPL_3D', '3D Animation'),
  templateProject('tprj-live', 'TPL_LIVE', 'Live action / VFX'),
  templateProject('tprj-2d', 'TPL_2D', '2D Animation'),
  templateProject('tprj-manga', 'TPL_MANGA', 'Manga'),
  templateProject('tprj-games', 'TPL_GAMES', 'Video games'),
];

export const pipelineSteps: PipelineStep[] = [
  { id: 'st-art', templateId: 'tpl-3d', code: 'ART', name: 'Art', appliesTo: 'Asset', order: 1, bidDays: 3 },
  { id: 'st-mod', templateId: 'tpl-3d', code: 'MOD', name: 'Model', appliesTo: 'Asset', order: 2, bidDays: 5 },
  { id: 'st-rig', templateId: 'tpl-3d', code: 'RIG', name: 'Rig', appliesTo: 'Asset', order: 3, bidDays: 4 },
  { id: 'st-tex', templateId: 'tpl-3d', code: 'TEX', name: 'Texture', appliesTo: 'Asset', order: 4, bidDays: 3 },
  { id: 'st-stb', templateId: 'tpl-3d', code: 'STB', name: 'Storyboard', appliesTo: 'Shot', order: 1, bidDays: 1 },
  { id: 'st-lay', templateId: 'tpl-3d', code: 'LAY', name: 'Layout', appliesTo: 'Shot', order: 2, bidDays: 1.5 },
  { id: 'st-anm', templateId: 'tpl-3d', code: 'ANM', name: 'Animation', appliesTo: 'Shot', order: 3, bidDays: 4 },
  { id: 'st-fx', templateId: 'tpl-3d', code: 'FX', name: 'FX', appliesTo: 'Shot', order: 4, bidDays: 2 },
  { id: 'st-lgt', templateId: 'tpl-3d', code: 'LGT', name: 'Lighting', appliesTo: 'Shot', order: 5, bidDays: 2 },
  { id: 'st-cmp', templateId: 'tpl-3d', code: 'CMP', name: 'Comp', appliesTo: 'Shot', order: 6, bidDays: 1.5 },
];

export const sequences: Sequence[] = [
  {
    id: 'seq010',
    projectId: 'prj01',
    code: 'LMP_010',
    name: 'Dusk Rounds',
    description: 'Ezra makes his evening rounds lighting gas lamps. Pip follows the flame from lamp to lamp.',
  },
  {
    id: 'seq020',
    projectId: 'prj01',
    code: 'LMP_020',
    name: 'The Power Station',
    description: 'Workers install electric lamps along Ezra\u2019s route. Ezra confronts Mayor Voss.',
  },
  {
    id: 'seq030',
    projectId: 'prj01',
    code: 'LMP_030',
    name: 'Last Light',
    description: 'The final gas lamp. Pip leads Ezra across the rooftops to see the city glow.',
  },
  {
    id: 'seqT10',
    projectId: 'prj02',
    code: 'TSR_010',
    name: 'Teaser',
    description: 'A single evening street, one gas lamp, and Pip.',
  },
];

/** Assets with projectId null form the company library, shared across projects. */
export const assetSeeds: Omit<Asset, 'status'>[] = [
  { id: 'a-ezra', projectId: null, code: 'CHR_ezra', name: 'Ezra', type: 'character', description: 'The old lamplighter.' },
  { id: 'a-pip', projectId: null, code: 'CHR_pip', name: 'Pip', type: 'character', description: 'A moth drawn to Ezra\u2019s flame.' },
  { id: 'a-voss', projectId: null, code: 'CHR_voss', name: 'Mayor Voss', type: 'character', description: 'Champion of the electric city.' },
  { id: 'a-gaslamp', projectId: null, code: 'PRP_gaslamp', name: 'Gas street lamp', type: 'prop', description: 'Cast-iron lamp with glass lantern.' },
  { id: 'a-workers', projectId: 'prj01', code: 'CRW_workers', name: 'Station workers', type: 'crowd', description: 'Crowd of electricians and laborers.' },
  { id: 'a-street', projectId: 'prj01', code: 'SET_street', name: 'Cobblestone Street', type: 'set', description: 'Ezra\u2019s route, lined with gas lamps.' },
  { id: 'a-station', projectId: 'prj01', code: 'SET_station', name: 'Power Station', type: 'set', description: 'Brick and iron, humming with new current.' },
  { id: 'a-rooftops', projectId: 'prj01', code: 'SET_rooftops', name: 'Rooftops', type: 'set', description: 'Chimneys and slate above the city.' },
  { id: 'a-pole', projectId: 'prj01', code: 'PRP_pole', name: 'Lamplighter\u2019s pole', type: 'prop', description: 'Brass hook and wick holder.' },
  { id: 'a-watch', projectId: 'prj01', code: 'PRP_watch', name: 'Pocket watch', type: 'prop', description: 'Ezra\u2019s cracked pocket watch.' },
  { id: 'a-bulb', projectId: 'prj01', code: 'PRP_bulb', name: 'Electric street lamp', type: 'prop', description: 'New steel post with a bare bulb.' },
  { id: 'a-skyline', projectId: 'prj01', code: 'MAT_skyline', name: 'City skyline matte', type: 'matte', description: 'Dusk-to-night painted skyline.' },
];

/** 0 = not started, 1 = complete. Drives generated task status. */
export const assetProgress: Record<string, number> = {
  'a-ezra': 1,
  'a-pip': 0.6,
  'a-voss': 0.45,
  'a-workers': 0.1,
  'a-street': 1,
  'a-station': 0.55,
  'a-rooftops': 0.05,
  'a-pole': 1,
  'a-watch': 1,
  'a-gaslamp': 1,
  'a-bulb': 0.5,
  'a-skyline': 0.7,
};

const DAY_MS = 86_400_000;

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

const sequenceDue: Record<string, string> = {
  seq010: '2026-12-04',
  seq020: '2027-01-15',
  seq030: '2027-02-26',
  seqT10: '2026-11-27',
};

/** [sequence, progress (0..1, or -1 = not ready to start), length in frames, description, assets] */
const animationShotSpecs: Array<[string, number, number, string, string[]]> = [
  ['seq010', 1, 96, 'Wide: Ezra walks the street at dusk, pole on his shoulder.', ['a-ezra', 'a-street', 'a-pole', 'a-gaslamp', 'a-skyline']],
  ['seq010', 1, 72, 'Close: the wick catches. Pip flutters into the light.', ['a-ezra', 'a-pip', 'a-gaslamp', 'a-pole']],
  ['seq010', 0.85, 84, 'Ezra checks his pocket watch, smiles at Pip.', ['a-ezra', 'a-pip', 'a-watch', 'a-street']],
  ['seq010', 0.7, 120, 'Tracking: lamp after lamp blooms down the street.', ['a-ezra', 'a-pip', 'a-street', 'a-gaslamp', 'a-skyline']],
  ['seq020', 0.6, 108, 'Workers bolt an electric lamp beside Ezra\u2019s gas lamp.', ['a-workers', 'a-bulb', 'a-gaslamp', 'a-street']],
  ['seq020', 0.5, 90, 'Ezra enters the humming Power Station.', ['a-ezra', 'a-station']],
  ['seq020', 0.35, 132, 'Mayor Voss addresses the workers from a catwalk.', ['a-voss', 'a-workers', 'a-station']],
  ['seq020', 0.3, 150, 'Ezra and Voss face off. Pip lands on Ezra\u2019s hat.', ['a-ezra', 'a-voss', 'a-pip', 'a-station']],
  ['seq030', 0.15, 110, 'Ezra lights the last gas lamp. Electric lamps flicker on around it.', ['a-ezra', 'a-gaslamp', 'a-bulb', 'a-street']],
  ['seq030', 0, 80, 'Pip circles, then flies upward. Ezra follows.', ['a-ezra', 'a-pip', 'a-rooftops']],
  ['seq030', -1, 144, 'Rooftops: the whole city glows below them.', ['a-ezra', 'a-pip', 'a-rooftops', 'a-skyline']],
];

/** 0 = not started, 1 = complete, -1 = not ready to start. Drives generated task status. */
export const shotProgress: Record<string, number> = {};

export const animationShotSeeds: Omit<Shot, 'status'>[] = animationShotSpecs.map(
  ([sequenceId, progress, length, description, assetIds], index) => {
    const sequence = sequences.find((s) => s.id === sequenceId)!;
    const indexInSequence = animationShotSpecs.slice(0, index + 1).filter(([seq]) => seq === sequenceId).length;
    const shotNumber = indexInSequence * 10;
    const seqNumber = sequence.code.split('_')[1];
    const id = `sh${seqNumber}_${shotNumber}`;
    const dueDate = addDays(sequenceDue[sequenceId], (indexInSequence - 1) * 7);
    shotProgress[id] = progress;
    return {
      id,
      projectId: sequence.projectId,
      code: `${seqNumber}_${String(shotNumber).padStart(4, '0')}`,
      sequenceId,
      description,
      frameIn: 1001,
      frameOut: 1000 + length,
      dueDate,
      animationDue: addDays(dueDate, -28),
      assetIds,
    };
  },
);

/** [status, length in frames, camera roll, description, assets] */
const teaserShotSpecs: Array<[string, number, string, string, string[]]> = [
  ['frc', 120, 'A001_C003', 'Establishing: wet street at dusk, one gas lamp.', ['a-gaslamp']],
  ['frc', 96, 'A001_C007', 'Lamplighter\u2019s hand raises the pole into frame.', ['a-gaslamp']],
  ['ip', 72, 'A002_C002', 'The wick catches. CG Pip flutters into the light.', ['a-pip', 'a-gaslamp']],
  ['ip', 84, 'A002_C005', 'Close on Pip settling on the lantern glass.', ['a-pip', 'a-gaslamp']],
  ['rdy', 60, 'A003_C001', 'Title card over the glowing lamp.', ['a-gaslamp']],
];

export const teaserShots: Shot[] = teaserShotSpecs.map(([status, length, cameraRoll, description, assetIds], index) => {
  const shotNumber = (index + 1) * 10;
  const dueDate = addDays(sequenceDue.seqT10, index * 3);
  return {
    id: `shT10_${shotNumber}`,
    projectId: 'prj02',
    code: `T10_${String(shotNumber).padStart(4, '0')}`,
    sequenceId: 'seqT10',
    description,
    status,
    frameIn: 1001,
    frameOut: 1000 + length,
    dueDate,
    animationDue: addDays(dueDate, -28),
    assetIds,
    cameraRoll,
  };
});

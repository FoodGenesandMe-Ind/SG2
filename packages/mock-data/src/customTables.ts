import type { Bid, Issue, Reel, SubBid } from './types';

/** Company-level custom table. */
export const issues: Issue[] = [
  { id: 'iss01', title: 'Render nodes run out of memory on SET_station', status: 'open', reporterId: 'p06', projectId: 'prj01', createdAt: '2026-10-22T16:10:00Z' },
  { id: 'iss02', title: 'Blender add-on fails to resolve the latest Pip rig', status: 'open', reporterId: 'p09', projectId: 'prj01', createdAt: '2026-10-27T11:42:00Z' },
  { id: 'iss03', title: 'Teaser plates delivered at the wrong frame rate', status: 'closed', reporterId: 'p13', projectId: 'prj02', createdAt: '2026-10-08T09:05:00Z' },
  { id: 'iss04', title: 'Write the onboarding guide for new artists', status: 'ip', reporterId: 'p04', projectId: null, createdAt: '2026-10-15T14:30:00Z' },
];

/** Project-level custom tables. */
export const subBids: SubBid[] = [
  { id: 'sb01', projectId: 'prj01', bidId: 'bid01', department: 'Story', amount: 18000 },
  { id: 'sb02', projectId: 'prj01', bidId: 'bid01', department: 'Assets', amount: 64000 },
  { id: 'sb03', projectId: 'prj01', bidId: 'bid01', department: 'Layout', amount: 22000 },
  { id: 'sb04', projectId: 'prj01', bidId: 'bid01', department: 'Animation', amount: 96000 },
  { id: 'sb05', projectId: 'prj01', bidId: 'bid01', department: 'FX', amount: 28000 },
  { id: 'sb06', projectId: 'prj01', bidId: 'bid01', department: 'Lighting', amount: 34000 },
  { id: 'sb07', projectId: 'prj01', bidId: 'bid01', department: 'Comp', amount: 21000 },
  { id: 'sb08', projectId: 'prj02', bidId: 'bid02', department: 'Shoot', amount: 30000 },
  { id: 'sb09', projectId: 'prj02', bidId: 'bid02', department: 'VFX', amount: 24000 },
  { id: 'sb10', projectId: 'prj02', bidId: 'bid02', department: 'Comp', amount: 9000 },
];

function totalBid(bidId: string, markup: number): number {
  const sum = subBids.filter((s) => s.bidId === bidId).reduce((total, s) => total + s.amount, 0);
  return Math.round(sum * markup);
}

export const bids: Bid[] = [
  { id: 'bid01', projectId: 'prj01', name: 'Production bid v2', markup: 1.15, totalBid: totalBid('bid01', 1.15) },
  { id: 'bid02', projectId: 'prj02', name: 'Teaser bid v1', markup: 1.2, totalBid: totalBid('bid02', 1.2) },
];

export const reels: Reel[] = [
  { id: 'reel01', projectId: 'prj02', name: 'Client reel 1', status: 'apr', shotIds: ['shT10_10', 'shT10_20'] },
  { id: 'reel02', projectId: 'prj02', name: 'Client reel 2', status: 'rev', shotIds: ['shT10_30', 'shT10_40'] },
];

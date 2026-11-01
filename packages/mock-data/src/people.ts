import type { Person } from './types';

export const people: Person[] = [
  { id: 'p01', name: 'Nephi Sanchez', email: 'nephi@example.com', permissionSetIds: ['ps-admin', 'ps-producer'] },
  { id: 'p02', name: 'Mara Ellison', email: 'mara@example.com', permissionSetIds: ['ps-director', 'ps-story'] },
  { id: 'p03', name: 'Tomas Reyes', email: 'tomas@example.com', permissionSetIds: ['ps-producer'] },
  { id: 'p04', name: 'Grace Okafor', email: 'grace@example.com', permissionSetIds: ['ps-manager'] },
  { id: 'p05', name: 'Ilya Petrov', email: 'ilya@example.com', permissionSetIds: ['ps-lead'], department: 'Animation', dayRate: 720 },
  { id: 'p06', name: 'Sun-hee Park', email: 'sunhee@example.com', permissionSetIds: ['ps-lead'], department: 'Lighting', dayRate: 700 },
  { id: 'p07', name: 'Diego Alvarez', email: 'diego@example.com', permissionSetIds: ['ps-artist'], department: 'Modeling', dayRate: 560 },
  { id: 'p08', name: 'Priya Nair', email: 'priya@example.com', permissionSetIds: ['ps-artist'], department: 'Rigging', dayRate: 600 },
  { id: 'p09', name: 'Lena Fischer', email: 'lena@example.com', permissionSetIds: ['ps-artist'], department: 'Animation', dayRate: 580 },
  { id: 'p10', name: 'Kwame Mensah', email: 'kwame@example.com', permissionSetIds: ['ps-artist'], department: 'FX', dayRate: 620 },
  { id: 'p11', name: 'Hana Sato', email: 'hana@example.com', permissionSetIds: ['ps-artist', 'ps-story'], department: 'Art', dayRate: 540 },
  { id: 'p12', name: 'Owen Clarke', email: 'owen@example.com', permissionSetIds: ['ps-artist'], department: 'Layout', dayRate: 520 },
  { id: 'p13', name: 'Rosa Lindqvist', email: 'rosa@example.com', permissionSetIds: ['ps-artist'], department: 'Compositing', dayRate: 590 },
  { id: 'p14', name: 'Ben Adler', email: 'ben@example.com', permissionSetIds: ['ps-accounting'] },
  { id: 'p15', name: 'Claire Dubois', email: 'claire@studio-client.example', permissionSetIds: ['ps-client'] },
  { id: 'p16', name: 'Harriet Cole', email: 'harriet@example.com', permissionSetIds: ['ps-executive'] },
  { id: 'p17', name: 'Sam Ortiz', email: 'sam@northlight-fund.example', permissionSetIds: ['ps-funder'] },
];

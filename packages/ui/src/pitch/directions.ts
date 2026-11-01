/** solid = colored chip; icon = the status's colored icon beside its name; tint = tinted chip with icon. */
export type PillStyle = 'solid' | 'icon' | 'tint';

export interface Direction {
  id: 'a' | 'b' | 'c';
  name: string;
  summary: string;
  pillStyle: PillStyle;
  /** full = vertical and horizontal cell lines; horizontal = row lines only. */
  gridLines: 'full' | 'horizontal';
  zebra: boolean;
  headerCase: 'normal' | 'upper';
}

export const directions: Direction[] = [
  {
    id: 'a',
    name: 'Classic',
    summary:
      'Closest to classic Shotgun: dark top bar over bright work areas, Shotgun-style blue, solid status chips, full grid lines, tight corners.',
    pillStyle: 'solid',
    gridLines: 'full',
    zebra: false,
    headerCase: 'normal',
  },
  {
    id: 'b',
    name: 'Studio neutral',
    summary:
      'True neutral grays so review media and colors read accurately; teal accent; status shown as its colored icon and name; striped rows, no vertical lines.',
    pillStyle: 'icon',
    gridLines: 'horizontal',
    zebra: true,
    headerCase: 'normal',
  },
  {
    id: 'c',
    name: 'Bold',
    summary:
      'Higher contrast and a warm orange accent; tinted status pills with icons; small uppercase column headers; softer, rounder shapes.',
    pillStyle: 'tint',
    gridLines: 'horizontal',
    zebra: false,
    headerCase: 'upper',
  },
];

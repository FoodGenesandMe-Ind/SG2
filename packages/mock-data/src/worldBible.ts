import type { WorldBible } from './types';

export const worldBible: WorldBible = {
  projectId: 'prj01',
  tone: 'Warm, wistful, quietly funny. A goodbye that feels like a gift, not a loss.',
  era: 'An unnamed European-flavored city around 1910, at the moment gas gives way to electricity.',
  palette:
    'Gas light is amber and soft-edged. Electric light is cool, hard, and white. Dusk skies move from amber to violet.',
  rules: [
    'Gas light always flickers gently; electric light never flickers until the final sequence.',
    'Pip never speaks. Pip reacts only to light, and only Ezra seems to understand her.',
    'No villains. Mayor Voss believes electric light will make the city safer, and he is not wrong.',
    'The camera stays at Ezra\u2019s eye level on the street and only rises when Pip leads him upward.',
  ],
  characters: [
    {
      assetId: 'a-ezra',
      name: 'Ezra',
      summary: 'The city\u2019s last lamplighter, forty-two years on the same route.',
      want: 'To finish one more round before the lamps are gone.',
      visualNotes: 'Stooped, long patched coat, brass-hooked pole, cracked pocket watch.',
    },
    {
      assetId: 'a-pip',
      name: 'Pip',
      summary: 'A moth who meets Ezra at the first lamp every evening.',
      want: 'To stay near the warmest light.',
      visualNotes: 'Small, dusty gold wings with a single dark spot. Glows faintly in lamplight.',
    },
    {
      assetId: 'a-voss',
      name: 'Mayor Voss',
      summary: 'An earnest modernizer who sees the future in electric light.',
      want: 'A city that never goes dark.',
      visualNotes: 'Immaculate three-piece suit, upright posture, always lit from below by bulbs.',
    },
  ],
  locations: [
    {
      assetId: 'a-street',
      name: 'Cobblestone Street',
      summary: 'Ezra\u2019s route: narrow, curved, lined with cast-iron gas lamps.',
      visualNotes: 'Wet cobbles that catch lamp reflections; shuttered shops; laundry lines overhead.',
    },
    {
      assetId: 'a-station',
      name: 'Power Station',
      summary: 'The heart of the new electric city.',
      visualNotes: 'Cathedral scale, brick arches, iron catwalks, humming turbines, cold white light.',
    },
    {
      assetId: 'a-rooftops',
      name: 'Rooftops',
      summary: 'Where Pip leads Ezra to see the whole city at once.',
      visualNotes: 'Slate roofs and chimney pots; the city below is a mix of amber and white lights.',
    },
  ],
};

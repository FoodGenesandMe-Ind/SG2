/** Picks dark or light text for any client-chosen background color (WCAG relative luminance). */
export function readableTextOn(hex: string): string {
  const value = hex.replace('#', '');
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? '#111214' : '#ffffff';
}

/** Placeholder media: a stable gradient per record until real thumbnails exist. */
export function placeholderThumb(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(135deg, hsl(${h} 45% 38%), hsl(${(h + 50) % 360} 55% 18%))`;
}

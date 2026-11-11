/**
 * Places where a text field can wrap. Each keeps its own list, saved with the page, so a field can wrap in a card body
 * and stay on one line in the card header.
 */
export type WrapPlace = 'table' | 'cardHeader' | 'cardBody' | 'kanbanHeader' | 'kanbanBody' | 'thumbInside' | 'thumbBelow';
export type WrapByPlace = Partial<Record<WrapPlace, string[]>>;

export const WRAP_PLACES: WrapPlace[] = ['table', 'cardHeader', 'cardBody', 'kanbanHeader', 'kanbanBody', 'thumbInside', 'thumbBelow'];

/** Text and multi-link fields can wrap; other values are short enough to stay on one line. */
export function canWrap(field: { type: string } | undefined) {
  return field?.type === 'text' || field?.type === 'multi-entity';
}

export function toggleWrap(wrap: WrapByPlace, place: WrapPlace, code: string): WrapByPlace {
  const list = wrap[place] ?? [];
  return { ...wrap, [place]: list.includes(code) ? list.filter((item) => item !== code) : [...list, code] };
}

export function sameWrap(a: WrapByPlace = {}, b: WrapByPlace = {}) {
  return WRAP_PLACES.every((place) => [...(a[place] ?? [])].sort().join() === [...(b[place] ?? [])].sort().join());
}

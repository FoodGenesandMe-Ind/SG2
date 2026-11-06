export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Every date field reads as DD-Mon-YYYY, for example 12-Dec-2026. */
export function formatDate(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return iso ?? '';
  const [, year, month, day] = match;
  return `${day}-${MONTHS[Number(month) - 1] ?? month}-${year}`;
}

function isoOf(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

/** A typed date: 12-Dec-2026, 12 December 2026, 2026-12-12, or 12/12/2026 (month first). Anything else is not a date. */
export function parseDateText(text: string): string | null {
  const value = text.trim();
  if (!value) return null;
  let match = /^(\d{1,2})[-\s/.]+([A-Za-z]{3,9})\.?[-\s/.,]+(\d{4})$/.exec(value);
  if (match) {
    const month = MONTHS.findIndex((name) => name.toLowerCase() === match![2].slice(0, 3).toLowerCase());
    const full = MONTH_NAMES[month]?.toLowerCase() ?? '';
    if (month < 0 || !full.startsWith(match[2].toLowerCase())) return null;
    return isoOf(Number(match[3]), month + 1, Number(match[1]));
  }
  match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value);
  if (match) return isoOf(Number(match[1]), Number(match[2]), Number(match[3]));
  match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (match) return isoOf(Number(match[3]), Number(match[1]), Number(match[2]));
  return null;
}

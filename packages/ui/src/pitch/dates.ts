import type { DateFormat } from '@sgp/mock-data';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Date formats a view can choose, with a sample of each. */
export const DATE_FORMATS: Array<{ value: DateFormat; sample: string }> = [
  { value: 'DD-Mon-YYYY', sample: '12-Dec-2026' },
  { value: 'YYYY-MM-DD', sample: '2026-12-12' },
  { value: 'MM/DD/YYYY', sample: '12/12/2026' },
  { value: 'DD/MM/YYYY', sample: '12/12/2026' },
  { value: 'Mon D, YYYY', sample: 'Dec 12, 2026' },
];

/** A date as the view shows it. Every date reads DD-Mon-YYYY (12-Dec-2026) unless the view picks another format. */
export function formatDate(iso: string, format: DateFormat = 'DD-Mon-YYYY') {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!match) return iso ?? '';
  const [, year, month, day] = match;
  const mon = MONTHS[Number(month) - 1] ?? month;
  if (format === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  if (format === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (format === 'DD/MM/YYYY') return `${day}/${month}/${year}`;
  if (format === 'Mon D, YYYY') return `${mon} ${Number(day)}, ${year}`;
  return `${day}-${mon}-${year}`;
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

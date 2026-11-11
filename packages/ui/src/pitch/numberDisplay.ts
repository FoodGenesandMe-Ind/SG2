import type { EffectiveField, NumberDisplay } from '@sgp/mock-data';

export const CURRENCIES = ['USD', 'CAD', 'EUR', 'GBP', 'AUD', 'NZD', 'JPY'];

export const DISPLAY_STYLES: Array<{ value: NumberDisplay['style']; label: string; example: string }> = [
  { value: 'number', label: 'Number', example: '1,234.50' },
  { value: 'currency', label: 'Currency', example: '$1,234.50' },
  { value: 'accounting', label: 'Accounting', example: '$ (1,234.50)' },
  { value: 'percent', label: 'Percent', example: '12.50%' },
  { value: 'scientific', label: 'Scientific', example: '1.23E+3' },
];

function clampDecimals(decimals: number) {
  return Math.min(10, Math.max(0, Math.round(decimals || 0)));
}

function symbolOf(currency: string) {
  const part = new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' })
    .formatToParts(0)
    .find((item) => item.type === 'currency');
  return part?.value ?? currency;
}

/** The text a number shows with this display. Without a display it prints as stored. */
export function formatNumber(value: number, display?: NumberDisplay): string {
  if (!Number.isFinite(value)) return '';
  if (!display) return String(value);
  const decimals = clampDecimals(display.decimals);
  const digits = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const currency = display.currency ?? 'USD';
  switch (display.style) {
    case 'currency':
      return new Intl.NumberFormat('en-US', { style: 'currency', currency, currencyDisplay: 'narrowSymbol', ...digits }).format(value);
    case 'accounting': {
      const body = new Intl.NumberFormat('en-US', digits).format(Math.abs(value));
      const symbol = symbolOf(currency);
      return value < 0 ? `${symbol} (${body})` : `${symbol} ${body}`;
    }
    case 'percent':
      return new Intl.NumberFormat('en-US', { style: 'percent', ...digits }).format(value);
    case 'scientific': {
      const [mantissa, exponent] = value.toExponential(decimals).split('e');
      const power = Number(exponent);
      return `${mantissa}E${power < 0 ? '-' : '+'}${Math.abs(power)}`;
    }
    default:
      return new Intl.NumberFormat('en-US', digits).format(value);
  }
}

/** A typed number. Accepts what the display shows: $, commas, a trailing %, parentheses for negatives, and 1.2E+3. */
export function parseNumberText(text: string): number | null {
  let value = text.trim();
  if (!value) return null;
  const negative = /\(.*\)/.test(value);
  value = value.replace(/[()]/g, '');
  const percent = value.endsWith('%');
  value = value.replace(/%$/, '').replace(/[,\s$€£¥]/g, '');
  if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(value)) return null;
  let number = Number(value);
  if (negative) number = -Math.abs(number);
  if (percent) number /= 100;
  return number;
}

/** The text a number cell edits as: plain digits, or the percent with its % sign. */
export function numberEditText(value: number, display?: NumberDisplay) {
  if (display?.style === 'percent') return `${Number((value * 100).toFixed(10))}%`;
  return String(value);
}

export function isNumberField(field: EffectiveField | undefined) {
  return !!field && ['number', 'currency', 'percent', 'duration'].includes(field.type);
}

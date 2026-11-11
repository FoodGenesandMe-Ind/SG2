import { useLayoutEffect, useRef, useState } from 'react';

let canvas: HTMLCanvasElement | null = null;
function textWidth(text: string, font: string) {
  canvas ??= document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) return text.length * 7;
  context.font = font;
  return context.measureText(text).width;
}

/** How many names fit in `room`, leaving space for "+N" when some are left out. Always at least one. */
export function fitCount(names: string[], room: number, measure: (text: string) => number) {
  for (let count = names.length; count > 1; count -= 1) {
    const shown = names.slice(0, count).join(', ');
    const rest = names.length - count;
    if (measure(rest ? `${shown} +${rest}` : shown) <= room) return count;
  }
  return Math.min(1, names.length);
}

/** Linked names on one line: as many as the space allows, then "+N" for the rest. Widening the column shows more. */
export function FitList({ names, className = '' }: { names: string[]; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [count, setCount] = useState(names.length);
  const key = names.join('\n');

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const fit = () => {
      const font = getComputedStyle(node).font;
      const room = node.parentElement?.clientWidth ?? node.clientWidth;
      const padding = node.parentElement ? parseFloat(getComputedStyle(node.parentElement).paddingLeft) + parseFloat(getComputedStyle(node.parentElement).paddingRight) : 0;
      const next = fitCount(names, Math.max(0, room - padding - 1), (text) => textWidth(text, font));
      setCount((current) => (current === next ? current : next));
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (node.parentElement) observer.observe(node.parentElement);
    return () => observer.disconnect();
    // `key` stands for the names.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const rest = names.length - count;
  return (
    <span ref={ref} className={`min-w-0 truncate ${className}`} title={names.join(', ')}>
      {names.slice(0, count).join(', ')}
      {rest > 0 && <span className="text-fg-subtle"> +{rest}</span>}
    </span>
  );
}

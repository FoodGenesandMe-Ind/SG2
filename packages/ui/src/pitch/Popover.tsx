import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders a floating panel (pick list, calendar) at the root of the themed surface instead of inside the cell.
 * A card is a size container, and a container traps and clips fixed-position children, so a panel drawn inside
 * a card would be cut off. The themed root still supplies the design tokens.
 */
export function Popover({ anchorRef, children }: { anchorRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  const find = () => anchorRef.current?.closest<HTMLElement>('[class*="sgp-theme-"]') ?? (anchorRef.current ? document.body : null);
  // The anchor usually exists already (the editor opens on a cell that is on screen), so the panel renders at once.
  const [host, setHost] = useState<HTMLElement | null>(find);
  useLayoutEffect(() => {
    if (!host) setHost(find() ?? document.body);
    // Only the first mount needs a host.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return host ? createPortal(children, host) : null;
}

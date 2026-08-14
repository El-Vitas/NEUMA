'use client';

import { useEffect, useRef } from 'react';
import type { DocsIconDrawing } from '../types/docs.types';

interface IProps {
  readonly drawing: DocsIconDrawing | null;
  readonly size: number;
}

/**
 * One picture, drawn as it comes from its book.
 *
 * What a book hands over is the drawing itself and not an address, so it is put
 * into the page as drawing; nothing here is fetched from anywhere and nothing
 * here came from anybody but us.
 */
export const DocsIcon = ({ drawing, size }: IProps) => {
  const iconRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const shown = iconRef.current;
    if (shown === null) return;
    shown.innerHTML = drawing?.body ?? '';
  }, [drawing]);

  return (
    <svg
      aria-hidden="true"
      height={size}
      ref={iconRef}
      viewBox={`0 0 ${String(drawing?.width ?? size)} ${String(drawing?.height ?? size)}`}
      width={size}
      xmlns="http://www.w3.org/2000/svg"
    />
  );
};

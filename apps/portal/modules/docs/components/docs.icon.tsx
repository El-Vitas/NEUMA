'use client';

import { useEffect, useRef } from 'react';
import type { DocsIconDrawing } from '../types/docs.types';

interface IProps {
  readonly drawing: DocsIconDrawing | null;
  readonly size: number;
}

/** The icon book returns markup, not a URL, and it comes from our own server, so it is injected as is. */
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

import type { PointerEvent as ReactPointerEvent } from 'react';

export interface ResizablePanelController {
  readonly applyWidth: (nextWidth: number) => void;
  readonly startResizing: (event: ReactPointerEvent<HTMLElement>) => void;
  readonly width: number;
}

export interface ResizablePanelSettings {
  /** Which way the panel grows when the pointer moves right. */
  readonly grows: 'leftwards' | 'rightwards';
  readonly clamp: (candidate: number) => number;
  readonly defaultWidth: number;
  readonly storageKey: string;
}

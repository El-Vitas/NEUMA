import type { PointerEvent as ReactPointerEvent } from 'react';

export interface PortalSidebarTreePanelController {
  readonly handleWidthChange: (width: number) => void;
  readonly startResizing: (event: ReactPointerEvent<HTMLInputElement>) => void;
  readonly width: number;
}

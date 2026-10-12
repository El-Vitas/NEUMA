import type { DragEvent, RefObject } from 'react';

export interface PagesEdgeScrolling {
  readonly onDragLeave: () => void;
  readonly onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  readonly onDrop: () => void;
  readonly surface: RefObject<HTMLDivElement | null>;
}

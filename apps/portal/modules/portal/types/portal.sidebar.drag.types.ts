import type { DragEvent } from 'react';
import type { PortalSidebarPage } from '@/modules/portal/types/portal.types';
import type { PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE } from '../constants/portal.sidebar.drag.constants';

export type PortalSidebarPageKeyboardMove =
  (typeof PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE)[keyof typeof PORTAL_SIDEBAR_PAGE_KEYBOARD_MOVE];

/** What letting go over a row would do: put the page inside it, or beside it. */
export type PortalSidebarDropIntent = 'after' | 'before' | 'nest';

export interface PortalSidebarPageDragState {
  readonly draggedPageId: string;
  readonly draggedPageTitle: string;
}

export interface PortalSidebarPageDragController {
  readonly announcement: string;
  readonly draggedPageId: null | string;
  readonly handleDragEnd: () => void;
  readonly handleDragStart: (event: DragEvent<HTMLAnchorElement>, page: PortalSidebarPage) => void;
  readonly handleRootDragOver: (event: DragEvent<HTMLButtonElement>) => void;
  readonly handleRootDrop: (event: DragEvent<HTMLButtonElement>) => void;
  readonly handleRowDragOver: (event: DragEvent<HTMLAnchorElement>, targetPage: PortalSidebarPage) => void;
  readonly handleRowDrop: (event: DragEvent<HTMLAnchorElement>, targetPage: PortalSidebarPage) => void;
  readonly moveByKeyboard: (page: PortalSidebarPage, direction: PortalSidebarPageKeyboardMove) => void;
}

export interface PortalSidebarDraggedPage {
  readonly pageId: string;
  readonly spaceId: string;
}

export interface PortalSidebarSpaceDropController {
  readonly draggedSpaceId: null | string;
  readonly handleSpaceDragEnd: () => void;
  readonly handleSpaceDragOver: (event: DragEvent<HTMLElement>) => void;
  readonly handleSpaceDragStart: (event: DragEvent<HTMLElement>, spaceId: string) => void;
  readonly handleSpaceDrop: (event: DragEvent<HTMLElement>, targetSpaceId: string) => void;
  readonly isMovingIntoSpace: boolean;
}

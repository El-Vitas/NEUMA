import type { PageIcon } from '../../appearance/types/pages.icon.types';
import type { PageEditorSpot } from '../../editor/menus/types/pages.editor.surface.types';

export interface PagePreviewTarget {
  readonly pageId: string;
  readonly spaceId: string;
}

export interface PagePreviewAtHand {
  readonly spot: PageEditorSpot;
  readonly target: PagePreviewTarget;
}

export interface PagePreviewLinkMatch {
  readonly anchor: Element;
  readonly target: PagePreviewTarget;
}

export interface PagePreviewProperty {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

export interface PagePreviewContent {
  readonly fragment: string;
  readonly icon: PageIcon | null;
  readonly properties: readonly PagePreviewProperty[];
  readonly title: string;
}

export type PagePreviewOutcome =
  | { readonly kind: 'denied' }
  | { readonly content: PagePreviewContent; readonly kind: 'found' };

export interface PagesPreviewState {
  readonly atHand: PagePreviewAtHand | null;
  readonly close: () => void;
  /** Called by the card while hovered, which the editor underneath cannot detect. */
  readonly hold: () => void;
  readonly letGo: () => void;
  readonly outcome: PagePreviewOutcome | null;
}

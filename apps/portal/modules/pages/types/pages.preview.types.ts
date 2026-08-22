import type { PageEditorSpot } from '../editor/menus/types/pages.editor.surface.types';
import type { PageIcon } from './pages.icon.types';

/** Which page a mention or an internal link points at. */
export interface PagePreviewTarget {
  readonly pageId: string;
  readonly spaceId: string;
}

/** A page somebody is pointing at, and where its preview should stand. */
export interface PagePreviewAtHand {
  readonly spot: PageEditorSpot;
  readonly target: PagePreviewTarget;
}

/**
 * A link the pointer or the keyboard is on, and the page it names, if it
 * names one of this app's own — before anything about it has been measured.
 */
export interface PagePreviewLinkMatch {
  readonly anchor: Element;
  readonly target: PagePreviewTarget;
}

/** One of the page's own properties, already told apart from the schema and formatted for reading. */
export interface PagePreviewProperty {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

/** What a page says about itself, read for whoever is only glancing at it. */
export interface PagePreviewContent {
  readonly fragment: string;
  readonly icon: PageIcon | null;
  readonly properties: readonly PagePreviewProperty[];
  readonly title: string;
}

/** Whether the page could be read at all, since a page nobody may see is not shown as one. */
export type PagePreviewOutcome =
  | { readonly kind: 'denied' }
  | { readonly content: PagePreviewContent; readonly kind: 'found' };

/** What `usePagesPreview` hands back: what is at hand, what it says, and how to let go of it. */
export interface PagesPreviewState {
  readonly atHand: PagePreviewAtHand | null;
  readonly close: () => void;
  /** Said by the card itself while the pointer is on it, which the writing underneath cannot see. */
  readonly hold: () => void;
  readonly letGo: () => void;
  readonly outcome: PagePreviewOutcome | null;
}

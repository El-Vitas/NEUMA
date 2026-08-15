import type { PageEditorSpot } from './pages.editor.surface.types';

/** The stretch of writing a link is on, and where it goes when it already goes somewhere. */
export interface PageEditorWrittenLink {
  readonly from: number;
  readonly href: string | null;
  readonly to: number;
}

/** A link somebody is pointing at, and where anything said about it should stand. */
export interface PageEditorLinkAtHand {
  readonly link: PageEditorWrittenLink;
  readonly spot: PageEditorSpot;
}

/** What the link field is called, since none of it is writing to read. */
export interface PageEditorLinkLabels {
  readonly apply: string;
  readonly field: string;
  readonly fault: string;
  readonly placeholder: string;
  readonly remove: string;
  readonly searching: string;
}

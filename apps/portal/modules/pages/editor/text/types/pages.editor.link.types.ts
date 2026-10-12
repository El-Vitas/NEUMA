import type { PageEditorSpot } from '../../menus/types/pages.editor.surface.types';

export interface PageEditorWrittenLink {
  readonly from: number;
  readonly href: string | null;
  readonly to: number;
}

export interface PageEditorLinkAtHand {
  readonly link: PageEditorWrittenLink;
  readonly spot: PageEditorSpot;
}

export interface PageEditorLinkLabels {
  readonly apply: string;
  readonly field: string;
  readonly fault: string;
  readonly placeholder: string;
  readonly remove: string;
  readonly searching: string;
}

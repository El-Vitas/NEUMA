import type { PAGE_EDITOR_LINK_SHAPES } from '../constants/pages.editor.link-shape.constants';

/** One of the three shapes a pasted link can take. */
export type PageEditorLinkShape = (typeof PAGE_EDITOR_LINK_SHAPES)[number];

/** Where the pasted link sits in the writing, so what replaces it takes exactly its place. */
export interface PageEditorLinkRange {
  readonly from: number;
  readonly to: number;
}

/** A link already on the page: where it sits, where it points, and the shape it is wearing. */
export interface PageEditorLinkTarget extends PageEditorLinkRange {
  readonly chosen: PageEditorLinkShape;
  readonly url: string;
}

/** The link that was just pasted, and where its choice is offered. */
export interface PageEditorPastedLink extends PageEditorLinkRange {
  readonly left: number;
  readonly top: number;
  readonly url: string;
}

import type { PAGE_EDITOR_LINK_SHAPES } from '../constants/pages.editor.link-shape.constants';

export type PageEditorLinkShape = (typeof PAGE_EDITOR_LINK_SHAPES)[number];

export interface PageEditorLinkRange {
  readonly from: number;
  readonly to: number;
}

export interface PageEditorLinkTarget extends PageEditorLinkRange {
  readonly chosen: PageEditorLinkShape;
  readonly url: string;
}

export interface PageEditorPastedLink extends PageEditorLinkRange {
  readonly left: number;
  readonly top: number;
  readonly url: string;
}

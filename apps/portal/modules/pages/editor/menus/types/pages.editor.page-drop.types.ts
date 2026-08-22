import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type { PageEditorBlockRange } from '../../blocks/types/pages.editor.block-drag.types';

/** A row of the page tree the blocks can be dropped on, and the page it stands for. */
export interface PageEditorPageDropTarget {
  readonly element: Element;
  readonly pageId: string;
}

/** What answering the gesture needs: the page being written, and the space it lives in. */
export interface PageEditorPageDropParameters {
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly spaceId: string;
}

/** The link left where blocks used to be, once they became a page of their own. */
export interface PageEditorBlockLink {
  readonly label: string;
  readonly pageId: string;
  readonly range: PageEditorBlockRange;
  readonly spaceId: string;
}

/** Turning a stretch of blocks into a page: whose child it becomes, and what is left behind. */
export interface PageEditorBlocksToPage {
  readonly leaveLink: boolean;
  readonly parentPageId: string;
  readonly range: PageEditorBlockRange;
}

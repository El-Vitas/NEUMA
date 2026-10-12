import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type { PageEditorBlockRange } from '../../blocks/types/pages.editor.block-drag.types';

export interface PageEditorPageDropTarget {
  readonly element: Element;
  readonly pageId: string;
}

export interface PageEditorPageDropParameters {
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly spaceId: string;
}

export interface PageEditorBlockLink {
  readonly label: string;
  readonly pageId: string;
  readonly range: PageEditorBlockRange;
  readonly spaceId: string;
}

export interface PageEditorBlocksToPage {
  readonly leaveLink: boolean;
  readonly parentPageId: string;
  readonly range: PageEditorBlockRange;
}

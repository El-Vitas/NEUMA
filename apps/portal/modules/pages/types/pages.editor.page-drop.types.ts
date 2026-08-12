import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';

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

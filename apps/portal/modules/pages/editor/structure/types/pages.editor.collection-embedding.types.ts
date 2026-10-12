import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type {
  PageCollectionShape,
  PageCollectionView,
  PageEditorCollectionChoice,
} from '../../../collections/types/pages.collections.types';

export interface PageEditorCollectionEmbeddingInput {
  readonly editorViewRef: RefObject<EditorView | null>;
  readonly onInserted: () => void;
  readonly spaceId: string;
}

export interface PageEditorCollectionCreation {
  readonly parentId: string;
  readonly shape: PageCollectionShape;
  readonly spot: number;
  readonly title: string;
}

export interface PagesEditorCollectionEmbedding {
  readonly cancel: () => void;
  readonly choice: null | PageEditorCollectionChoice;
  readonly choosableViews: null | readonly PageCollectionView[];
  readonly chooseView: (viewName: string) => void;
  readonly create: (creation: PageEditorCollectionCreation) => void;
  /** Inserts without asking, for a new collection that has a single view. */
  readonly insert: (pageId: string, viewName: null | string, spot: number) => void;
  readonly isAsking: boolean;
  /** Asks which view to use when the collection has several, then inserts. */
  readonly show: (pageId: string, spot: number) => void;
}

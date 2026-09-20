import type { EditorView } from 'prosemirror-view';
import type { RefObject } from 'react';
import type {
  PageCollectionShape,
  PageCollectionView,
  PageEditorCollectionChoice,
} from '../../../collections/types/pages.collections.types';

/** Con qué trabaja quien pone colecciones en la escritura: dónde está el editor y qué hacer una vez puesta. */
export interface PageEditorCollectionEmbeddingInput {
  readonly editorViewRef: RefObject<EditorView | null>;
  /** Qué hacer cuando el bloque ya quedó puesto: la página que lo lleva se vuelve a leer. */
  readonly onInserted: () => void;
  readonly spaceId: string;
}

/** Una colección que se está haciendo: de quién cuelga, cómo se llama, con qué forma nace y dónde va el bloque. */
export interface PageEditorCollectionCreation {
  readonly parentId: string;
  readonly shape: PageCollectionShape;
  readonly spot: number;
  readonly title: string;
}

/** Poner en la escritura el bloque que muestra una colección, y preguntar lo que haga falta antes. */
export interface PagesEditorCollectionEmbedding {
  readonly cancel: () => void;
  /** La colección elegida mientras se pregunta cuál de sus vistas, o nada. */
  readonly choice: null | PageEditorCollectionChoice;
  /** Las vistas por las que se está preguntando, o nada cuando no se está preguntando. */
  readonly choosableViews: null | readonly PageCollectionView[];
  readonly chooseView: (viewName: string) => void;
  /** Hace una colección nueva y pone el bloque que la mira donde se estaba escribiendo. */
  readonly create: (creation: PageEditorCollectionCreation) => void;
  /** Pone el bloque sin preguntar nada, para una colección recién hecha que tiene una sola vista. */
  readonly insert: (pageId: string, viewName: null | string, spot: number) => void;
  readonly isAsking: boolean;
  /** Pregunta lo que falte —si es una colección, y por cuál de sus vistas— y entonces la pone. */
  readonly show: (pageId: string, spot: number) => void;
}

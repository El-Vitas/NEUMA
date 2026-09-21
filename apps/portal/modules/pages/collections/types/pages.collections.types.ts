import type { PagePropertyOption, PagePropertyType, PageViewType } from '@company-brain/shared';

/** What a collection is called in the language of whoever is making it. */
export interface PageCollectionWording {
  readonly firstProperty: string;
  readonly firstView: string;
  readonly titleProperty: string;
}

export interface PageCollectionProperty {
  readonly key: string;
  readonly label: string;
  readonly options: readonly PagePropertyOption[] | null;
  readonly required: boolean;
  readonly type: PagePropertyType;
}

export interface PageCollectionView {
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly isDefault: boolean;
  readonly name: string;
  readonly type: PageViewType;
}

/** What a collection keeps and how it is looked at. */
export interface PageCollectionShape {
  readonly properties: readonly PageCollectionProperty[];
  readonly views: readonly PageCollectionView[];
}

/** Which collection a block shows, and through which of its views. */
export interface PageCollectionInsert {
  readonly pageId: string;
  readonly spaceId: string;
  readonly viewName: string | null;
}

/**
 * La colección ya elegida mientras se pregunta cuál de sus vistas se muestra.
 *
 * Lleva también dónde se había quedado la escritura: elegir en un diálogo se
 * lleva el cursor, y el bloque tiene que caer donde estaba y no al final.
 */
export interface PageEditorCollectionChoice {
  readonly pageId: string;
  readonly spot: number;
  readonly views: readonly PageCollectionView[];
}

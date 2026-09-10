import type { PageViewShape, PageViewType } from '@company-brain/shared';
import type { ReactNode } from 'react';
import type {
  PagePersonOption,
  PageSchemaProperty,
  PageSchemaView,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from './pages.schema.types';

export interface PageViewRenderInput<TOutcome> {
  /** Whether whoever is looking may also change what the rows hold. */
  readonly canEdit: boolean;
  /** La página que lleva la colección, de la que cuelgan sus filas. */
  readonly collectionPageId: string;
  readonly outcome: TOutcome;
  /** Quiénes son las personas que las filas nombran, para decir su nombre y no su identificador. */
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
  readonly view: PageSchemaView;
}

/**
 * What one kind of view knows how to draw, paired with the shape its rows have
 * to arrive in.
 *
 * The shape travels with the renderer so that whoever draws a view can tell,
 * before drawing, whether the rows it received are the ones this kind of view
 * reads. A calendar asking for groups and receiving a flat list is a mismatch
 * worth saying out loud instead of rendering something empty.
 */
export type PageViewRenderer =
  | {
      readonly render: (input: PageViewRenderInput<PageViewFlatOutcome>) => Promise<ReactNode> | ReactNode;
      readonly shape: Extract<PageViewShape, 'FLAT'>;
    }
  | {
      /**
       * Agrupadas en columnas, o en rejilla cuando la vista pide una segunda
       * agrupación. Las dos son la misma forma de leer: por eso la clase de
       * vista no cambia según cuántas agrupaciones tenga puestas, que es cosa de
       * su configuración y no de lo que es.
       */
      readonly render: (
        input: PageViewRenderInput<PageViewBandedOutcome | PageViewGroupedOutcome>,
      ) => Promise<ReactNode> | ReactNode;
      readonly shape: Extract<PageViewShape, 'GROUPED'>;
    };

export type PageViewRendererRegistry = Record<PageViewType, PageViewRenderer>;

import type { PageViewShape, PageViewType } from '@company-brain/shared';
import type { ReactNode } from 'react';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from './pages.schema.types';

export interface PageViewRenderInput<TOutcome> {
  /** Whether whoever is looking may also change what the rows hold. */
  readonly canEdit: boolean;
  readonly outcome: TOutcome;
  /** Quiénes son las personas que las filas nombran, para decir su nombre y no su identificador. */
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  /**
   * La colección entera: qué página la lleva, qué guarda y qué vistas tiene.
   *
   * Una vista no solo dibuja sus filas, también cambia lo que dice de sí misma
   * —qué calcula cada columna, por ejemplo—, y eso se guarda junto al resto de
   * la colección y no vista por vista.
   */
  readonly schema: PageSchema;
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
 *
 * `EITHER` es para quien lee de las dos maneras según lo que se le pida: una
 * tabla saca sus filas una tras otra hasta que alguien la manda agrupar, y
 * entonces las saca en grupos sin dejar de ser una tabla.
 */
export type PageViewRenderer =
  | {
      readonly render: (input: PageViewRenderInput<PageViewFlatOutcome>) => Promise<ReactNode> | ReactNode;
      readonly shape: Extract<PageViewShape, 'FLAT'>;
    }
  | {
      readonly render: (
        input: PageViewRenderInput<PageViewFlatOutcome | PageViewGroupedOutcome>,
      ) => Promise<ReactNode> | ReactNode;
      readonly shape: 'EITHER';
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

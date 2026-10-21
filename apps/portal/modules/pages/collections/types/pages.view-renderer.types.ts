import type { PageViewShape, PageViewType } from '@neuma/shared';
import type { ReactNode } from 'react';
import type {
  PagePersonOption,
  PageSchema,
  PageSchemaProperty,
  PageSchemaView,
  PageViewAggregates,
  PageViewBandedOutcome,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from './pages.schema.types';

export interface PageViewRenderInput<TOutcome> {
  /** The counts and calculations, which arrive after the rows. */
  readonly aggregates: Promise<PageViewAggregates | null>;
  readonly canEdit: boolean;
  readonly outcome: TOutcome;
  readonly personOptions: readonly PagePersonOption[];
  readonly properties: readonly PageSchemaProperty[];
  /** The whole collection, because a view's own settings are saved together with it. */
  readonly schema: PageSchema;
  readonly spaceId: string;
  readonly view: PageSchemaView;
}

/**
 * The shape travels with the renderer so a mismatch with the received rows can be reported before drawing.
 * `EITHER` is for views that read flat or grouped rows depending on their configuration, such as a table.
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
      /** Columns or a grid (second grouping) are the same way of reading, so the view type does not change. */
      readonly render: (
        input: PageViewRenderInput<PageViewBandedOutcome | PageViewGroupedOutcome>,
      ) => Promise<ReactNode> | ReactNode;
      readonly shape: Extract<PageViewShape, 'GROUPED'>;
    };

export type PageViewRendererRegistry = Record<PageViewType, PageViewRenderer>;

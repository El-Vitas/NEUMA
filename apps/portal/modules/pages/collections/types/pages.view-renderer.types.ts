import type { PageViewShape, PageViewType } from '@company-brain/shared';
import type { ReactNode } from 'react';
import type {
  PageSchemaProperty,
  PageSchemaView,
  PageViewFlatOutcome,
  PageViewGroupedOutcome,
} from './pages.schema.types';

export interface PageViewRenderInput<TOutcome> {
  /** Whether whoever is looking may also change what the rows hold. */
  readonly canEdit: boolean;
  readonly outcome: TOutcome;
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
      readonly render: (input: PageViewRenderInput<PageViewGroupedOutcome>) => Promise<ReactNode> | ReactNode;
      readonly shape: Extract<PageViewShape, 'GROUPED'>;
    };

export type PageViewRendererRegistry = Record<PageViewType, PageViewRenderer>;

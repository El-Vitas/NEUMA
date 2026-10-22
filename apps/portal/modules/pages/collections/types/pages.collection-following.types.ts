import type { ChangesController } from './pages.collection-changes.types';
import type { PageSchemaView } from './pages.schema.types';

export interface PagesCollectionFollowingInput {
  /** Where to read what changed; null when the view cannot follow changes. */
  readonly changesCursor: null | string;
  /** Builds the controller that applies the changes; called again whenever the cursor is a new one. */
  readonly createController: () => ChangesController;
  readonly enabled: boolean;
  /** The view moved on with the same settings: the order of its rows may be another one. */
  readonly onViewReordered?: (() => void) | undefined;
  readonly pageId: string;
  readonly spaceId: string;
  readonly view: PageSchemaView;
}

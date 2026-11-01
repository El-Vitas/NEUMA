import type { Result } from '@neuma/shared';
import type { CollectionRowsRequest } from '@/modules/pages/collections/types/pages.collections.types';
import type { FavoritePage } from '@/shared/types/favorites.types';

/** Who looks at the page and what they asked to see of its collection. */
export interface PageViewing {
  readonly favoritesResult: Result<readonly FavoritePage[], Error>;
  readonly requestedViewName: null | string;
  readonly rowsRequest: CollectionRowsRequest;
  readonly viewerId: null | string;
}

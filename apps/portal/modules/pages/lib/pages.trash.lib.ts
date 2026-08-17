import { ROUTES } from '@/shared/routes/constants/routes.constants';

export const buildPageTrashUrl = (search: string): string => {
  const trimmedSearch = search.trim();
  if (trimmedSearch === '') return ROUTES.PORTAL_TRASH;
  return `${ROUTES.PORTAL_TRASH}?search=${encodeURIComponent(trimmedSearch)}`;
};

/** The `?spaceId=&search=` a page-trash API request carries, empty when neither was given. */
export const buildPageTrashListQuerySuffix = (spaceId?: string, search?: string): string => {
  const query = new URLSearchParams();
  if (spaceId !== undefined) query.set('spaceId', spaceId);
  if (search !== undefined && search.length > 0) query.set('search', search);
  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
};

import { ROUTES } from '@/shared/routes/constants/routes.constants';
import type { PageRestoreNotice, TrashRestoreOutcome } from '../types/pages.trash.types';

export const buildPageTrashUrl = (search: string): string => {
  const trimmedSearch = search.trim();
  if (trimmedSearch === '') return ROUTES.PORTAL_TRASH;
  return `${ROUTES.PORTAL_TRASH}?search=${encodeURIComponent(trimmedSearch)}`;
};

export const buildPageTrashListQuerySuffix = (spaceId?: string, search?: string): string => {
  const query = new URLSearchParams();
  if (spaceId !== undefined) query.set('spaceId', spaceId);
  if (search !== undefined && search.length > 0) query.set('search', search);
  const serialized = query.toString();
  return serialized.length > 0 ? `?${serialized}` : '';
};

export const resolvePageRestoreNotice = (outcome: TrashRestoreOutcome): PageRestoreNotice => {
  if (outcome.spaceName !== null) return { kind: 'toRoot', space: outcome.spaceName };
  if (outcome.parentTitle !== null) return { kind: 'underParent', parent: outcome.parentTitle };
  return { kind: 'restored' };
};

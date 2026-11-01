import { callAction, isActionSuccess } from '@/shared/lib/action-result';
import type { PageButtonTemplateChoice } from '../../editor/structure/types/pages.editor.button.types';
import { listPageTemplatesAction } from '../server/actions/pages.templates.actions';
import type { PageTemplateListing } from '../types/pages.templates.types';

/** Null when the templates cannot be read from here, so the caller does not mistake that for "none". */
export const readPageTemplatesFromBrowser = async (
  collectionId: string,
  spaceId: string,
): Promise<PageTemplateListing | null> => {
  const asked = await callAction(() => listPageTemplatesAction({ collectionId, spaceId }));
  return isActionSuccess<PageTemplateListing>(asked) ? asked.data : null;
};

/** What the choice of a button lists: the name and the id of each template. */
export const readButtonTemplates = async (
  collectionId: string,
  spaceId: string,
): Promise<readonly PageButtonTemplateChoice[]> => {
  const listing = await readPageTemplatesFromBrowser(collectionId, spaceId);
  return listing === null ? [] : listing.templates.map(({ id, title }) => ({ id, title }));
};

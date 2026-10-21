import type { PageSchemaProperty } from '../../collections/types/pages.schema.types';
import { getPageTemplates } from '../server/queries/pages.templates.queries';
import { PagesTemplatesMenu } from './pages.templates.menu';

interface IProps {
  readonly collectionId: string;
  /** The columns of the collection: the ones a template may fill, and the ones with a default value. */
  readonly properties: readonly PageSchemaProperty[];
  readonly spaceId: string;
}

/** The "New" button of a collection with the templates it offers; nothing shows if they cannot be read. */
export const PagesTemplatesSection = async ({ collectionId, properties, spaceId }: IProps) => {
  const listing = await getPageTemplates(spaceId, collectionId);
  if (listing.isFail()) return null;
  return (
    <PagesTemplatesMenu
      collectionId={collectionId}
      listing={listing.getValue()}
      properties={properties}
      spaceId={spaceId}
    />
  );
};

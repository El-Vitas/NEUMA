import { PAGE_PROPERTY_TYPE, toValueList, withPageDerivedValues } from '@neuma/shared';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import type { PageSummary } from '../../types/pages.types';
import type { PageCollectionLookups } from '../types/pages.lookups.types';
import type {
  PagePersonOption,
  PagePropertyValues,
  PageRelatedRow,
  PageSchemaProperty,
} from '../types/pages.schema.types';

/** The values of a row as its page shows them: what it stores, plus what the page itself says about who made it. */
export const withPanelDerivedValues = (
  properties: readonly PageSchemaProperty[],
  propertyValues: PagePropertyValues,
  page: PageSummary | null,
): PagePropertyValues =>
  page === null
    ? propertyValues
    : withPageDerivedValues(properties, propertyValues, {
        createdAt: page.createdAt.toISOString(),
        createdById: page.createdBy?.id ?? '',
        editedAt: page.updatedAt.toISOString(),
        editedById: page.updatedBy?.id ?? '',
      });

/**
 * The names a row's own page already knows: the rows its relations point to come with the page when it opens, and
 * its files are the ones uploaded to it. Nothing is asked of the server.
 */
export const buildPanelLookups = (
  properties: readonly PageSchemaProperty[],
  propertyValues: PagePropertyValues,
  relatedRows: readonly PageRelatedRow[],
  attachments: readonly AttachmentSummary[],
  people: readonly PagePersonOption[],
): PageCollectionLookups => {
  const relatedIds = new Set(
    properties
      .filter((property) => property.type === PAGE_PROPERTY_TYPE.RELATION)
      .flatMap((property) => toValueList(propertyValues[property.key] ?? [])),
  );
  return {
    attachedFiles: attachments.map((attachment) => ({
      id: attachment.id,
      mimeType: attachment.mimeType,
      name: attachment.originalFilename,
      size: attachment.size,
    })),
    people,
    relatedRows: relatedRows.filter((row) => relatedIds.has(row.id)),
  };
};

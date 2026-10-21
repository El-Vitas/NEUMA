'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PagesAttachments } from '../../attachments/components/pages.attachments';
import type { AttachmentSummary } from '../../attachments/types/pages.attachments.types';
import { PagesMetadataRow } from '../../components/pages.metadata.row';
import {
  EMPTY_PAGE_ATTACHMENTS,
  EMPTY_PAGE_PERSON_OPTIONS,
  EMPTY_PAGE_SUMMARIES,
  PAGE_PROPERTIES_VISIBLE_LIMIT,
} from '../../constants/pages.constants';
import { PagesMoveForm } from '../../navigation/components/pages.move.form';
import type { PageSummary } from '../../types/pages.types';
import { buildPanelLookups, withPanelDerivedValues } from '../lib/pages.panel-lookups.lib';
import { getEditableSchemaProperties } from '../lib/pages.properties.lib';
import type { PagePersonOption, PagePropertyValue, PagePropertyValues, PageSchema } from '../types/pages.schema.types';
import { PagesCollectionLookupsProvider } from './pages.collection.lookups.provider';
import { PagesPropertiesRow } from './pages.properties.row';

interface IProps {
  readonly attachments?: readonly AttachmentSummary[];
  readonly canEdit: boolean;
  readonly onAttachmentDeleted?: (attachmentId: string) => void;
  readonly onAttachmentUploaded?: (attachment: AttachmentSummary) => void;
  readonly onPropertyValueChange: (key: string, value: PagePropertyValue) => void;
  readonly page?: PageSummary | null;
  readonly pageId?: string | null;
  /** The pages of the space: the rows a relation points to are some of them. */
  readonly pages?: readonly PageSummary[];
  readonly parentSchema: PageSchema | null;
  readonly personOptions?: readonly PagePersonOption[];
  readonly propertyValues: PagePropertyValues;
  readonly spaceId?: string;
}

export const PagesPropertiesPanel = ({
  attachments = EMPTY_PAGE_ATTACHMENTS,
  canEdit,
  onAttachmentDeleted = () => undefined,
  onAttachmentUploaded = () => undefined,
  onPropertyValueChange,
  page = null,
  pageId = null,
  pages = EMPTY_PAGE_SUMMARIES,
  parentSchema,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  propertyValues,
  spaceId = '',
}: IProps) => {
  const t = useTranslations('pages');
  const [isExpanded, setIsExpanded] = useState(false);
  const properties = getEditableSchemaProperties(parentSchema);
  const canMove = canEdit && page !== null;
  const hasAttachmentsSection = pageId !== null;

  if (properties.length === 0 && !canMove && !hasAttachmentsSection) return null;

  const hiddenPropertiesCount = Math.max(properties.length - PAGE_PROPERTIES_VISIBLE_LIMIT, 0);
  const visibleProperties = isExpanded ? properties : properties.slice(0, PAGE_PROPERTIES_VISIBLE_LIMIT);
  const hiddenSectionsCount = (canMove ? 1 : 0) + (hasAttachmentsSection ? 1 : 0);
  const hiddenItemsCount = hiddenPropertiesCount + hiddenSectionsCount;
  const hasHiddenContent = hiddenItemsCount > 0;
  const shownValues = withPanelDerivedValues(properties, propertyValues, page);
  const lookups = buildPanelLookups(properties, shownValues, pages, attachments, personOptions);

  return (
    <section aria-label={t('properties.title')} className="max-w-336 border-border border-b pb-2">
      <p className="text-muted-foreground text-xs sm:hidden">{t('propertiesPanel.narrowScreenHint')}</p>
      <PagesCollectionLookupsProvider lookups={lookups}>
        {visibleProperties.map((property) => (
          <PagesPropertiesRow
            attachments={attachments}
            computedError={page?.computedErrors?.[property.key]}
            disabled={!canEdit}
            key={property.key}
            onChange={(value) => onPropertyValueChange(property.key, value)}
            personOptions={personOptions}
            property={property}
            rowId={pageId ?? undefined}
            spaceId={spaceId}
            value={shownValues[property.key]}
          />
        ))}
      </PagesCollectionLookupsProvider>
      {isExpanded && canMove && page !== null && (
        <PagesMetadataRow label={t('location')} labelId="page-location-label">
          <PagesMoveForm ariaLabelledBy="page-location-label" page={page} spaceId={spaceId} />
        </PagesMetadataRow>
      )}
      {isExpanded && hasAttachmentsSection && pageId !== null && (
        <PagesMetadataRow label={t('attachments.title')} labelId="page-attachments-label">
          <PagesAttachments
            attachments={attachments}
            canEdit={canEdit}
            onAssetDeleted={onAttachmentDeleted}
            onAssetUploaded={onAttachmentUploaded}
            pageId={pageId}
          />
        </PagesMetadataRow>
      )}
      {hasHiddenContent && (
        <button
          className="min-h-11 text-muted-foreground text-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
          onClick={() => setIsExpanded((current) => !current)}
          type="button"
        >
          {isExpanded ? t('properties.showLess') : t('propertiesPanel.showMore', { count: hiddenItemsCount })}
        </button>
      )}
    </section>
  );
};

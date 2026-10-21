'use client';

import { isPagePropertyValueEmpty, PAGE_PROPERTY_TYPE } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useOptimistic, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { hasActionError } from '@/shared/lib/action-result';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { isPropertyEditableInPlace, pagePropertyAnswersOnPick } from '../lib/pages.properties.lib';
import { updatePageRowPropertiesAction } from '../server/actions/pages.collections.actions';
import type { PagePersonOption, PagePropertyValue, PageSchemaProperty } from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly alignmentClass: string;
  readonly ariaLabelledBy: string;
  readonly canEdit: boolean;
  readonly contentClass: string;
  readonly controlClass: string;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly rowId: string;
  readonly spaceId: string;
  readonly value: PagePropertyValue | undefined;
}

/** Shows the answer before the server replies and reverts on failure. Only the touched property is sent. */
export const PagesCollectionTableCell = ({
  alignmentClass,
  ariaLabelledBy,
  canEdit,
  contentClass,
  controlClass,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  rowId,
  spaceId,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PagePropertyValue | undefined>(value);
  const [, startWriting] = useTransition();
  const [shown, showWritten] = useOptimistic(
    value,
    (_current: PagePropertyValue | undefined, written: PagePropertyValue | undefined) => written,
  );

  const write = (written: PagePropertyValue): void => {
    setIsEditing(false);
    if (written === value) return;
    const sent = isPagePropertyValueEmpty(property.type, written) ? null : written;
    startWriting(async () => {
      showWritten(sent ?? undefined);
      const saved = await updatePageRowPropertiesAction({
        pageId: rowId,
        propertyValues: { [property.key]: sent },
        spaceId,
      });
      if (hasActionError(saved)) {
        setDraft(value);
        toast.error(tErrors('generic'));
      }
    });
  };

  /** Chosen values save at once; typed text passes through partial states, so it saves on blur. */
  const answer = (answered: PagePropertyValue): void => {
    setDraft(answered);
    if (pagePropertyAnswersOnPick(property.type)) write(answered);
  };

  const answerKey = (event: KeyboardEvent<HTMLFieldSetElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      write(draft ?? '');
      return;
    }
    if (event.key !== 'Escape') return;
    setDraft(value);
    setIsEditing(false);
  };

  if (!canEdit || !isPropertyEditableInPlace(property)) {
    return (
      <span className={cn('block min-w-0', contentClass)}>
        <PagesPropertyValue personOptions={personOptions} property={property} value={shown} />
      </span>
    );
  }

  if (!isEditing) {
    return (
      <button
        aria-label={t('properties.editCell', { property: property.label })}
        className={cn(
          '-mx-2 flex min-h-11 w-full items-center rounded-none px-2 text-left hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring',
          controlClass,
          alignmentClass,
        )}
        data-testid="collection-cell"
        onClick={() => setIsEditing(true)}
        title={t('properties.editCell', { property: property.label })}
        type="button"
      >
        <span className={cn('block min-w-0', contentClass)}>
          <PagesPropertyValue isLinked={false} personOptions={personOptions} property={property} value={shown} />
        </span>
      </button>
    );
  }

  return (
    /*
      Only listens for Enter and Escape bubbling up from the field. `min-w-0` undoes the element's own
      minimum width, which would stop the cell from shrinking.
    */
    <fieldset className="min-w-0" onKeyDown={answerKey}>
      <PagesPropertiesField
        ariaLabelledBy={ariaLabelledBy}
        claimsFocus
        disabled={false}
        onBlur={pagePropertyAnswersOnPick(property.type) ? undefined : () => write(draft ?? '')}
        onChange={answer}
        personOptions={personOptions}
        property={property}
        rowId={rowId}
        spaceId={spaceId}
        value={property.type === PAGE_PROPERTY_TYPE.RELATION ? shown : draft}
      />
    </fieldset>
  );
};

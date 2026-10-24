'use client';

import { isPagePropertyValueEmpty, PAGE_PROPERTY_TYPE } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useCallback, useContext, useOptimistic, useState, useSyncExternalStore, useTransition } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EMPTY_PAGE_PERSON_OPTIONS } from '../../constants/pages.constants';
import { PAGE_VIEW_WRITE_ACTIONS_CONTEXT } from '../constants/pages.view-writes.context.constants';
import { canQueueCellWrite, isPropertyEditableInPlace, pagePropertyAnswersOnPick } from '../lib/pages.properties.lib';
import { isOfflineRefusal } from '../lib/pages.view-writes.direct.lib';
import { describeWrittenValue } from '../lib/pages.view-writes.optimistic.lib';
import type {
  PageComputedError,
  PagePersonOption,
  PagePropertyValue,
  PageSchemaProperty,
} from '../types/pages.schema.types';
import { PagesPropertiesField } from './pages.properties.field';
import { PagesPropertyValue } from './pages.properties.value';

interface IProps {
  readonly alignmentClass: string;
  readonly ariaLabelledBy: string;
  readonly canEdit: boolean;
  /** Why a formula or rollup could not be computed in this row. */
  readonly computedError?: PageComputedError;
  readonly contentClass: string;
  readonly controlClass: string;
  /** Tells the row a value is being written, so the formulas that read it can follow at once. */
  readonly onWriting?: (propertyKey: string, value: PagePropertyValue | undefined) => void;
  readonly personOptions?: readonly PagePersonOption[];
  readonly property: PageSchemaProperty;
  readonly rowId: string;
  /** The version of the row as drawn, which the server holds the edit against. */
  readonly rowVersion?: number;
  readonly spaceId: string;
  readonly value: PagePropertyValue | undefined;
}

/** Shows the answer before the server replies and reverts on failure. Only the touched property is sent. */
export const PagesCollectionTableCell = ({
  alignmentClass,
  ariaLabelledBy,
  canEdit,
  computedError,
  contentClass,
  controlClass,
  onWriting,
  personOptions = EMPTY_PAGE_PERSON_OPTIONS,
  property,
  rowId,
  rowVersion,
  spaceId,
  value,
}: IProps) => {
  const t = useTranslations('pages');
  const tErrors = useTranslations('errors');
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PagePropertyValue | undefined>(value);
  const [, startWriting] = useTransition();
  const writes = useContext(PAGE_VIEW_WRITE_ACTIONS_CONTEXT);
  const subscribeToRow = useCallback(
    (listener: () => void) => writes.pendingValues.subscribeRow(rowId, listener),
    [rowId, writes],
  );
  const pending = useSyncExternalStore(
    subscribeToRow,
    () => writes.pendingValues.read(rowId, property.key),
    () => undefined,
  );
  const [answered, showWritten] = useOptimistic(
    value,
    (_current: PagePropertyValue | undefined, written: PagePropertyValue | undefined) => written,
  );
  const shown = pending === undefined ? answered : (pending ?? undefined);

  const write = (written: PagePropertyValue): void => {
    setIsEditing(false);
    if (written === value) return;
    const sent = isPagePropertyValueEmpty(property.type, written) ? null : written;
    const change = {
      ...(rowVersion === undefined ? {} : { expectedVersion: rowVersion }),
      kind: 'cell',
      pageId: rowId,
      propertyValues: { [property.key]: sent },
      spaceId,
    } as const;
    startWriting(async () => {
      showWritten(sent ?? undefined);
      onWriting?.(property.key, sent ?? undefined);
      const settled = canQueueCellWrite(property.type)
        ? await writes.write(change, `${property.label}: ${describeWrittenValue(sent)}`)
        : await writes.writeNow(change);
      if (settled.kind !== 'rejected') return;
      setDraft(value);
      toast.error(isOfflineRefusal(settled) ? t('collection.needsConnection') : tErrors('generic'));
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
        <PagesPropertyValue
          computedError={computedError}
          personOptions={personOptions}
          property={property}
          value={shown}
        />
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

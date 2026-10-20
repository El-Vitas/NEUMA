'use client';

import { useRef } from 'react';
import { callAction, hasActionError } from '@/shared/lib/action-result';
import { updatePageRowPropertiesAction } from '../../collections/server/actions/pages.collections.actions';
import type { PagePropertyValue, PagePropertyValues } from '../../collections/types/pages.schema.types';
import { renamePageAction } from '../../server/actions/pages.actions';
import type { PagesEditorSaves, PagesEditorSavesOptions } from '../types/pages.editor.saves.types';

/** A request that never reached the server counts as not arrived, like one the server refused. */
const didArrive = async (send: () => Promise<unknown>): Promise<boolean> => !hasActionError(await callAction(send));

/**
 * Content travels through the block channel, not from here. Title and each property travel separately,
 * so one property's change is never sent back stale. A part that fails stays pending for the next save.
 */
export const usePagesEditorSaves = (options: PagesEditorSavesOptions): PagesEditorSaves => {
  const isTitlePendingRef = useRef(false);
  const pendingPropertyValuesRef = useRef<PagePropertyValues>({});
  const hasStoredPropertyValuesRef = useRef(options.storedPropertyValues !== null || !options.hasEditableProperties);

  const saveTitle = async (): Promise<boolean> => {
    if (!isTitlePendingRef.current) return true;
    isTitlePendingRef.current = false;
    const arrived = await didArrive(() =>
      renamePageAction({ pageId: options.pageId, spaceId: options.spaceId, title: options.readTitle().trim() }),
    );
    if (!arrived) isTitlePendingRef.current = true;
    return arrived;
  };

  const saveProperties = async (): Promise<boolean> => {
    const changed = hasStoredPropertyValuesRef.current
      ? pendingPropertyValuesRef.current
      : options.readPropertyValues();
    if (Object.keys(changed).length === 0) return true;
    pendingPropertyValuesRef.current = {};
    const arrived = await didArrive(() =>
      updatePageRowPropertiesAction({ pageId: options.pageId, propertyValues: changed, spaceId: options.spaceId }),
    );
    if (!arrived) {
      pendingPropertyValuesRef.current = { ...changed, ...pendingPropertyValuesRef.current };
      return false;
    }
    hasStoredPropertyValuesRef.current = true;
    return true;
  };

  return {
    markPropertyChanged: (key: string, value: PagePropertyValue) => {
      pendingPropertyValuesRef.current = { ...pendingPropertyValuesRef.current, [key]: value };
    },
    markTitleChanged: () => {
      isTitlePendingRef.current = true;
    },
    saveWhatIsPending: async () => {
      const outcomes = await Promise.all([saveTitle(), saveProperties()]);
      return outcomes.every(Boolean);
    },
  };
};

'use client';

import { useRef } from 'react';
import { callAction, hasActionError } from '@/shared/lib/action-result';
import { updatePageRowPropertiesAction } from '../../collections/server/actions/pages.collections.actions';
import type { PagePropertyValue, PagePropertyValues } from '../../collections/types/pages.schema.types';
import { renamePageAction, replacePageContentAction } from '../../server/actions/pages.actions';
import type { PagesEditorSaves, PagesEditorSavesOptions } from '../types/pages.editor.saves.types';

/**
 * What of the page is waiting to be kept, and how each part travels.
 *
 * The writing is kept by the live document while there is one, so it is only
 * sent from here when there is not. The name travels on its own. A property
 * travels alone, so nobody's change to another one is sent back stale. A part
 * that fails to arrive stays waiting for the next save, and a change made while
 * a save is on its way is not forgotten when that save comes back.
 */
/**
 * Whether a part arrived. One that never reached the server — the connection
 * dropped, a new version was being put up — did not arrive either, and stays
 * waiting just like one the server refused.
 */
const didArrive = async (send: () => Promise<unknown>): Promise<boolean> => !hasActionError(await callAction(send));

export const usePagesEditorSaves = (options: PagesEditorSavesOptions): PagesEditorSaves => {
  const isTitlePendingRef = useRef(false);
  const isContentPendingRef = useRef(false);
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

  const saveContent = async (): Promise<boolean> => {
    if (!isContentPendingRef.current) return true;
    isContentPendingRef.current = false;
    const arrived = await didArrive(() =>
      replacePageContentAction({ content: options.readContent(), pageId: options.pageId, spaceId: options.spaceId }),
    );
    if (!arrived) isContentPendingRef.current = true;
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
    markContentChanged: () => {
      isContentPendingRef.current = true;
    },
    markPropertyChanged: (key: string, value: PagePropertyValue) => {
      pendingPropertyValuesRef.current = { ...pendingPropertyValuesRef.current, [key]: value };
    },
    markTitleChanged: () => {
      isTitlePendingRef.current = true;
    },
    saveWhatIsPending: async () => {
      const outcomes = await Promise.all([saveTitle(), saveContent(), saveProperties()]);
      return outcomes.every(Boolean);
    },
  };
};

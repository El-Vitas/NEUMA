'use client';

import type { PageOptionColor, PagePropertyType } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import {
  addSchemaOption,
  addSchemaProperty,
  removeSchemaOption,
  removeSchemaProperty,
  toSavableView,
  updateSchemaOptionColor,
  updateSchemaProperty,
} from '../lib/pages.schema-editing.lib';
import { setViewGroupBy, toggleViewProperty } from '../lib/pages.view-editing.lib';
import { updatePageCollectionAction } from '../server/actions/pages.collections.actions';
import type { PageSchema, PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

/**
 * The shape of a collection while somebody is changing it.
 *
 * Nothing travels until it is saved, so a half-made change never reaches the
 * rows: adding a property and then naming its options is several steps, and
 * sending each one would leave the collection in shapes nobody asked for.
 */
export const usePagesSchemaEditor = (schema: PageSchema, spaceId: string): PagesSchemaEditor => {
  const t = useTranslations('pages.collection');
  const tErrors = useTranslations('errors');
  const [properties, setProperties] = useState<readonly PageSchemaProperty[]>(schema.properties);
  const [views, setViews] = useState<readonly PageSchemaView[]>(schema.views);
  const [isSaving, startSaving] = useTransition();

  const save = (): void => {
    startSaving(async () => {
      const saved = await updatePageCollectionAction({
        pageId: schema.pageId,
        properties,
        spaceId,
        views: views.map(toSavableView),
      });
      if (!isActionSuccess<PageSchema>(saved)) {
        toast.error(tErrors('generic'));
        return;
      }
      setProperties(saved.data.properties);
      setViews(saved.data.views);
      toast.success(t('saved'));
    });
  };

  return {
    addOption: (key: string, value: string) => setProperties((current) => addSchemaOption(current, key, value)),
    addProperty: (label: string, type: PagePropertyType) =>
      setProperties((current) => addSchemaProperty(current, { label, type })),
    changeOptionColor: (key: string, value: string, color: PageOptionColor) =>
      setProperties((current) => updateSchemaOptionColor(current, key, value, color)),
    groupViewBy: (viewName: string, propertyKey: string) =>
      setViews((current) => setViewGroupBy(current, viewName, propertyKey)),
    isSaving,
    properties,
    removeOption: (key: string, value: string) => setProperties((current) => removeSchemaOption(current, key, value)),
    removeProperty: (key: string) => setProperties((current) => removeSchemaProperty(current, key)),
    renameProperty: (key: string, label: string) =>
      setProperties((current) => updateSchemaProperty(current, key, { label })),
    save,
    toggleViewProperty: (viewName: string, propertyKey: string) =>
      setViews((current) =>
        toggleViewProperty(
          current,
          viewName,
          propertyKey,
          properties.map((property) => property.key),
        ),
      ),
    views,
  };
};

'use client';

import type {
  PageChartKind,
  PageChartMeasure,
  PageDateBucket,
  PageOptionColor,
  PagePropertyType,
  PageViewType,
} from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { isActionSuccess } from '@/shared/lib/action-result';
import {
  addSchemaOption,
  addSchemaProperty,
  addSchemaView,
  changeSchemaPropertyType,
  convertSchemaView,
  duplicateSchemaView,
  makeSchemaViewDefault,
  moveSchemaProperty,
  moveSchemaView,
  removeSchemaOption,
  removeSchemaProperty,
  removeSchemaView,
  renameSchemaView,
  toSavableView,
  updateSchemaOptionColor,
  updateSchemaProperty,
} from '../lib/pages.schema-editing.lib';
import {
  setViewChartKind,
  setViewChartMeasure,
  setViewDateBucket,
  setViewDateProperty,
  setViewGroupBy,
  setViewIcon,
  setViewSubGroupBy,
  toggleViewProperty,
} from '../lib/pages.view-editing.lib';
import { toggleViewHidesEmptyGroups } from '../lib/pages.view-filtering.lib';
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
  /**
   * Lo último que llegó a viajar, para poder decir si lo que se ve ya no es
   * eso. Se compara por identidad y no por contenido: cada operación devuelve
   * la misma lista cuando no cambia nada y una nueva cuando sí, así que la
   * identidad ya dice exactamente lo que hay que saber.
   */
  const [saved, setSaved] = useState({ properties: schema.properties, views: schema.views });

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
      setSaved({ properties: saved.data.properties, views: saved.data.views });
      toast.success(t('saved'));
    });
  };

  return {
    addOption: (key: string, value: string) => setProperties((current) => addSchemaOption(current, key, value)),
    addProperty: (label: string, type: PagePropertyType) =>
      setProperties((current) => addSchemaProperty(current, { label, type })),
    addView: (name: string, type: PageViewType) =>
      setViews((current) => addSchemaView(current, { name, type }, properties)),
    changeOptionColor: (key: string, value: string, color: PageOptionColor) =>
      setProperties((current) => updateSchemaOptionColor(current, key, value, color)),
    changePropertyType: (key: string, type: PagePropertyType) =>
      setProperties((current) => changeSchemaPropertyType(current, key, type)),
    convertView: (viewName: string, type: PageViewType) =>
      setViews((current) => convertSchemaView(current, viewName, type, properties)),
    duplicateView: (viewName: string) => setViews((current) => duplicateSchemaView(current, viewName)),
    groupViewBy: (viewName: string, propertyKey: null | string) =>
      setViews((current) => setViewGroupBy(current, viewName, propertyKey)),
    groupViewByDateBucket: (viewName: string, bucket: PageDateBucket) =>
      setViews((current) => setViewDateBucket(current, viewName, bucket)),
    hasUnsavedChanges: properties !== saved.properties || views !== saved.views,
    isSaving,
    makeViewDefault: (viewName: string) => setViews((current) => makeSchemaViewDefault(current, viewName)),
    moveProperty: (key: string, direction: 'EARLIER' | 'LATER') =>
      setProperties((current) => moveSchemaProperty(current, key, direction)),
    moveView: (viewName: string, direction: 'EARLIER' | 'LATER') =>
      setViews((current) => moveSchemaView(current, viewName, direction)),
    placeViewByDate: (viewName: string, propertyKey: null | string) =>
      setViews((current) => setViewDateProperty(current, viewName, propertyKey)),
    drawViewAs: (viewName: string, kind: PageChartKind) =>
      setViews((current) => setViewChartKind(current, viewName, kind)),
    measureViewBy: (viewName: string, measure: PageChartMeasure, propertyKey: null | string) =>
      setViews((current) => setViewChartMeasure(current, viewName, measure, propertyKey)),
    properties,
    removeOption: (key: string, value: string) => setProperties((current) => removeSchemaOption(current, key, value)),
    removeProperty: (key: string) => setProperties((current) => removeSchemaProperty(current, key)),
    removeView: (name: string) => setViews((current) => removeSchemaView(current, name)),
    renameProperty: (key: string, label: string) =>
      setProperties((current) => updateSchemaProperty(current, key, { label })),
    renameView: (viewName: string, name: string) => setViews((current) => renameSchemaView(current, viewName, name)),
    save,
    setViewIcon: (viewName: string, icon: null | string) => setViews((current) => setViewIcon(current, viewName, icon)),
    subGroupViewBy: (viewName: string, propertyKey: null | string) =>
      setViews((current) => setViewSubGroupBy(current, viewName, propertyKey)),
    toggleViewEmptyGroups: (viewName: string) => setViews((current) => toggleViewHidesEmptyGroups(current, viewName)),
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

'use client';

import {
  makeSchemaViewDefault,
  type PageChartKind,
  type PageChartMeasure,
  type PageDateBucket,
  type PageOptionColor,
  type PagePropertyType,
  type PageViewType,
  removeSchemaView,
} from '@neuma/shared';
import { useState } from 'react';
import {
  addSchemaOption,
  addSchemaProperty,
  addSchemaView,
  changeSchemaPropertyType,
  convertSchemaView,
  duplicateSchemaView,
  moveSchemaProperty,
  moveSchemaView,
  removeSchemaOption,
  removeSchemaProperty,
  renameSchemaView,
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
import type { PageSchema, PageSchemaProperty, PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import { usePagesShapeSaving } from './use.pages.shape-saving';

/** Nothing is sent until saved: a multi-step change (add a property, then name its options) must not land half done. */
export const usePagesSchemaEditor = (schema: PageSchema, spaceId: string): PagesSchemaEditor => {
  const [properties, setProperties] = useState<readonly PageSchemaProperty[]>(schema.properties);
  const [views, setViews] = useState<readonly PageSchemaView[]>(schema.views);
  const shape = usePagesShapeSaving(schema, spaceId);
  // Compared by identity: each operation returns the same list when nothing changed.
  const [saved, setSaved] = useState({ properties: schema.properties, views: schema.views });

  const save = (): void => {
    shape.save(properties, views, (stored) => {
      setProperties(stored.properties);
      setViews(stored.views);
      setSaved({ properties: stored.properties, views: stored.views });
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
    isSaving: shape.isSaving,
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

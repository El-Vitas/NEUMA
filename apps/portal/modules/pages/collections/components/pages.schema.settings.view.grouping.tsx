'use client';

import {
  PAGE_DATE_BUCKET_VALUES,
  PAGE_PROPERTY_TYPE,
  pageViewRequiresGrouping,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { readPropertyLabel } from '../lib/pages.properties.lib';
import { listGroupablePropertyKeys, readPageDateBucket } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsMissingProperty } from './pages.schema.settings.missing-property';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly view: PageSchemaView;
}

export const PagesSchemaSettingsViewGrouping = ({ editor, onGo, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  const groupable = listGroupablePropertyKeys(editor.properties);
  const labelOf = (key: string): string => readPropertyLabel(editor.properties, key);
  const isGroupedByDate =
    editor.properties.find((property) => property.key === configuration.groupBy)?.type === PAGE_PROPERTY_TYPE.DATE;
  const emptyGroupsFieldId = useId();

  if (groupable.length === 0) {
    return (
      <PagesSchemaSettingsMissingProperty
        heading={t('groupBy')}
        isSaving={editor.isSaving}
        message={t('noGroupableProperty')}
        onAddProperty={() => onGo({ level: 'PROPERTIES' })}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('groupBy')}</p>
      <Select
        disabled={editor.isSaving}
        onValueChange={(value) => editor.groupViewBy(view.name, value === PAGE_VIEW_NO_GROUP ? null : value)}
        value={configuration.groupBy ?? PAGE_VIEW_NO_GROUP}
      >
        <SelectTrigger aria-label={t('groupByFor', { view: view.name })} className="w-full">
          <SelectValue placeholder={t('groupByNone')} />
        </SelectTrigger>
        <SelectContent>
          {!pageViewRequiresGrouping(view.type) && (
            <SelectItem value={PAGE_VIEW_NO_GROUP}>{t('groupByNone')}</SelectItem>
          )}
          {groupable.map((key) => (
            <SelectItem key={key} value={key}>
              {labelOf(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isGroupedByDate && (
        <Select
          disabled={editor.isSaving}
          onValueChange={(value) => editor.groupViewByDateBucket(view.name, readPageDateBucket(value))}
          value={configuration.groupByDateBucket}
        >
          <SelectTrigger aria-label={t('dateBucketFor', { view: view.name })} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_DATE_BUCKET_VALUES.map((bucket) => (
              <SelectItem key={bucket} value={bucket}>
                {t(`dateBuckets.${bucket}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {configuration.groupBy !== null && (
        <label
          className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 text-foreground text-sm hover:bg-muted"
          htmlFor={emptyGroupsFieldId}
        >
          <Checkbox
            checked={configuration.hidesEmptyGroups}
            disabled={editor.isSaving}
            id={emptyGroupsFieldId}
            onCheckedChange={() => editor.toggleViewEmptyGroups(view.name)}
          />
          {t('hideEmptyGroups')}
        </label>
      )}
    </div>
  );
};

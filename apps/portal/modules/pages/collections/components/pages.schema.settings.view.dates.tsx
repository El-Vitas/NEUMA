'use client';

import { readPageViewConfiguration } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { listDatePropertyKeys } from '../lib/pages.calendar.lib';
import type { PageSchemaViewDraft } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsMissingProperty } from './pages.schema.settings.missing-property';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly view: PageSchemaViewDraft;
}

export const PagesSchemaSettingsViewDates = ({ editor, onGo, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const dates = listDatePropertyKeys(editor.properties);
  const labelOf = (key: string): string => editor.properties.find((property) => property.key === key)?.label ?? key;

  if (dates.length === 0) {
    return (
      <PagesSchemaSettingsMissingProperty
        heading={t('calendarDateProperty')}
        isSaving={editor.isSaving}
        message={t('calendarNoDateProperty')}
        onAddProperty={() => onGo({ level: 'PROPERTIES' })}
      />
    );
  }

  return (
    <div className="space-y-2">
      <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('calendarDateProperty')}</p>
      <Select
        disabled={editor.isSaving}
        onValueChange={(value) => editor.placeViewByDate(view.name, value === PAGE_VIEW_NO_GROUP ? null : value)}
        value={readPageViewConfiguration(view.configuration).dateProperty ?? PAGE_VIEW_NO_GROUP}
      >
        <SelectTrigger aria-label={t('calendarDatePropertyFor', { view: view.name })} className="w-full">
          <SelectValue placeholder={t('groupByNone')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={PAGE_VIEW_NO_GROUP}>{t('groupByNone')}</SelectItem>
          {dates.map((key) => (
            <SelectItem key={key} value={key}>
              {labelOf(key)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

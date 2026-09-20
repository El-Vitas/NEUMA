'use client';

import { readPageViewConfiguration } from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { listDatePropertyKeys } from '../lib/pages.calendar.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly view: PageSchemaView;
}

/**
 * Por qué fecha coloca sus filas un calendario.
 *
 * Una colección puede guardar varias —cuándo empieza algo, cuándo vence—, y el
 * calendario enseña una cada vez: por eso se elige, en vez de suponer que la
 * primera es la buena.
 */
export const PagesSchemaSettingsViewDates = ({ editor, onGo, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const dates = listDatePropertyKeys(editor.properties);
  const labelOf = (key: string): string => editor.properties.find((property) => property.key === key)?.label ?? key;

  return (
    <div className="space-y-2">
      <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('calendarDateProperty')}</p>
      {/*
        Sin ninguna fecha no hay calendario que hacer, y un desplegable vacío no
        lo explica. Se dice, y se lleva a donde se arregla.
      */}
      {dates.length === 0 ? (
        <div className="space-y-2 px-2">
          <p className="text-muted-foreground text-xs">{t('calendarNoDateProperty')}</p>
          <Button
            className="min-h-11 w-full justify-start"
            disabled={editor.isSaving}
            onClick={() => onGo({ level: 'PROPERTIES' })}
            type="button"
            variant="outline"
          >
            <Plus aria-hidden="true" className="size-4" />
            {t('addProperty')}
          </Button>
        </div>
      ) : (
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
      )}
    </div>
  );
};

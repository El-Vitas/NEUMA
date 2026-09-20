'use client';

import {
  PAGE_DATE_BUCKET_VALUES,
  PAGE_PROPERTY_TYPE,
  pageViewRequiresGrouping,
  readPageViewConfiguration,
} from '@company-brain/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_VIEW_NO_GROUP } from '../constants/pages.collections.constants';
import { readPropertyLabel } from '../lib/pages.properties.lib';
import { listGroupablePropertyKeys, readPageDateBucket } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly view: PageSchemaView;
}

/**
 * Por dónde agrupa una vista, y lo que solo tiene sentido una vez agrupada: el
 * tramo cuando agrupa por fecha, y si los grupos vacíos se ven.
 *
 * Van juntos porque se leen juntos: las tres respuestas describen un solo montón
 * de filas partido de una manera.
 */
export const PagesSchemaSettingsViewGrouping = ({ editor, onGo, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  const groupable = listGroupablePropertyKeys(editor.properties);
  const labelOf = (key: string): string => readPropertyLabel(editor.properties, key);
  const isGroupedByDate =
    editor.properties.find((property) => property.key === configuration.groupBy)?.type === PAGE_PROPERTY_TYPE.DATE;
  const emptyGroupsFieldId = useId();

  /*
    Sin ninguna propiedad que haga columnas no hay nada que elegir, y un
    desplegable vacío y apagado deja encallado a quien no sepa que lo que falta
    es una selección. Se dice, y se lleva a donde se arregla.
  */
  if (groupable.length === 0) {
    return (
      <div className="space-y-2">
        <p className="px-2 text-muted-foreground text-xs uppercase tracking-wide">{t('groupBy')}</p>
        <div className="space-y-2 px-2">
          <p className="text-muted-foreground text-xs">{t('noGroupableProperty')}</p>
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
      </div>
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
      {/*
        Un tramo solo significa algo en una fecha: nadie agrupa una selección
        «por meses». Por eso aparece con la propiedad puesta y no antes.
      */}
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
      {/*
        Solo cuando de verdad está agrupando: sin grupos no hay grupos vacíos que
        esconder, y una casilla que no hace nada se marca igual y deja a quien la
        marcó esperando algo.
      */}
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

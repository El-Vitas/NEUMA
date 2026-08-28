'use client';

import { PAGE_VIEW_TYPE, readPageViewConfiguration, readVisiblePropertyKeys } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { listGroupablePropertyKeys } from '../lib/pages.view-editing.lib';
import type { PageSchemaView } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly view: PageSchemaView;
}

/**
 * One view of a collection, with what can be decided about it: by what a board
 * makes its columns, and which properties this view shows.
 *
 * Only a board is asked what it groups by, because a table has no columns to
 * make from a value.
 */
export const PagesSchemaViewRow = ({ editor, view }: IProps) => {
  const t = useTranslations('pages.collection');
  const configuration = readPageViewConfiguration(view.configuration);
  const groupable = listGroupablePropertyKeys(editor.properties);
  const shown = readVisiblePropertyKeys(
    configuration.visibleProperties,
    editor.properties.map((property) => property.key),
  );
  const labelOf = (key: string): string => editor.properties.find((property) => property.key === key)?.label ?? key;

  return (
    <li className="space-y-3 border-border border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-foreground text-sm">{view.name}</span>
        <span className="rounded-sm bg-muted px-2 py-0.5 text-muted-foreground text-xs">
          {t(`viewTypes.${view.type}`)}
        </span>
      </div>
      {view.type === PAGE_VIEW_TYPE.BOARD && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-xs">{t('groupBy')}</span>
          <Select
            disabled={editor.isSaving || groupable.length === 0}
            onValueChange={(value) => editor.groupViewBy(view.name, value)}
            value={configuration.groupBy ?? ''}
          >
            <SelectTrigger aria-label={t('groupByFor', { view: view.name })} className="w-56">
              <SelectValue placeholder={t('groupByNone')} />
            </SelectTrigger>
            <SelectContent>
              {groupable.map((key) => (
                <SelectItem key={key} value={key}>
                  {labelOf(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <fieldset className="m-0 space-y-2 border-0 p-0">
        <legend className="text-muted-foreground text-xs">{t('shownProperties')}</legend>
        <div className="flex flex-wrap gap-3">
          {editor.properties.map((property) => (
            <label
              className="flex min-h-11 cursor-pointer items-center gap-2 text-foreground text-sm"
              htmlFor={`${view.name}-${property.key}`}
              key={property.key}
            >
              <Checkbox
                checked={shown.includes(property.key)}
                disabled={editor.isSaving}
                id={`${view.name}-${property.key}`}
                onCheckedChange={() => editor.toggleViewProperty(view.name, property.key)}
              />
              {property.label}
            </label>
          ))}
        </div>
      </fieldset>
    </li>
  );
};

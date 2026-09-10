'use client';

import { isTitlePageProperty, pagePropertyRequiresOptions } from '@company-brain/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import { readPageOptionColorClass } from '../lib/pages.option-color.lib';
import { readAddablePropertyType } from '../lib/pages.schema-editing.lib';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsRow } from './pages.schema.settings-row';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly property: PageSchemaProperty;
}

/**
 * Una propiedad y lo que se decide sobre ella.
 *
 * El tipo se puede cambiar, y se avisa de lo que cuesta: lo que las filas ya
 * guardaron se queda escrito con la forma anterior y hay que volver a
 * responderlo. La propiedad de título es la excepción por los dos lados —ni
 * deja de serlo ni otra pasa a serlo—, porque es la que abre cada fila.
 *
 * Cada opción es una línea con su color puesto. El color se elige entrando en
 * ella, no con nueve botones por opción esperando a que alguien acierte.
 */
export const PagesSchemaSettingsProperty = ({ editor, onGo, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const [newOption, setNewOption] = useState('');
  const isTitle = isTitlePageProperty(property.type);

  const addAndClear = (): void => {
    editor.addOption(property.key, newOption);
    setNewOption('');
  };

  const changeTypeTo = (chosen: string): void => {
    const type = readAddablePropertyType(chosen);
    if (type === undefined) return;
    editor.changePropertyType(property.key, type);
  };

  return (
    <div className="space-y-3">
      <Input
        aria-label={t('propertyLabel')}
        disabled={editor.isSaving}
        onChange={(event) => editor.renameProperty(property.key, event.target.value)}
        value={property.label}
      />
      <div className="flex items-center justify-between gap-2 px-2 text-sm">
        <span className="shrink-0 text-muted-foreground">{t('propertyType')}</span>
        {isTitle ? (
          <span className="text-foreground">{t(`types.${property.type}`)}</span>
        ) : (
          <Select disabled={editor.isSaving} onValueChange={(chosen) => changeTypeTo(chosen)} value={property.type}>
            <SelectTrigger aria-label={t('propertyType')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_ADDABLE_PROPERTY_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {!isTitle && <p className="px-2 text-muted-foreground text-xs">{t('changeTypeWarning')}</p>}

      {pagePropertyRequiresOptions(property.type) && (
        <div className="space-y-1 border-border border-t pt-3">
          <p className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">{t('optionsLabel')}</p>
          {(property.options ?? []).map((option) => (
            <PagesSchemaSettingsRow
              key={option.value}
              label={option.value}
              onClick={() => onGo({ level: 'OPTION', optionValue: option.value, propertyKey: property.key })}
              value={
                <span
                  aria-hidden="true"
                  className={cn('inline-block size-3 rounded-full', readPageOptionColorClass(option.color))}
                />
              }
            />
          ))}
          <div className="flex items-center gap-2 pt-1">
            <Input
              aria-label={t('newOptionPlaceholder')}
              disabled={editor.isSaving}
              onChange={(event) => setNewOption(event.target.value)}
              placeholder={t('newOptionPlaceholder')}
              value={newOption}
            />
            <Button
              aria-label={t('addOption')}
              className="size-11 shrink-0"
              disabled={editor.isSaving || newOption.trim() === ''}
              onClick={addAndClear}
              size="icon"
              type="button"
              variant="outline"
            >
              <Plus aria-hidden="true" className="size-4" />
            </Button>
          </div>
          <p className="px-2 pt-1 text-muted-foreground text-xs">{t('renameOptionWarning')}</p>
        </div>
      )}

      <div className="border-border border-t pt-3">
        {isTitle ? (
          <p className="px-2 text-muted-foreground text-xs">{t('titlePropertyLocked')}</p>
        ) : (
          <Button
            className="min-h-11 w-full justify-start text-destructive hover:text-destructive"
            disabled={editor.isSaving}
            onClick={() => {
              editor.removeProperty(property.key);
              onGo({ level: 'PROPERTIES' });
            }}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t('removeProperty', { property: property.label })}
          </Button>
        )}
      </div>
    </div>
  );
};

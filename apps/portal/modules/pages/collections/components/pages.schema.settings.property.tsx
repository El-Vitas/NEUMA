'use client';

import { canPagePropertyBeRequired, isTitlePageProperty, pagePropertyRequiresOptions } from '@neuma/shared';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Input } from '@/shared/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import { canSchemaPropertyChangeType, readAddablePropertyType } from '../lib/pages.schema-editing.lib';
import type { PageRelatedRow, PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsConfig } from './pages.schema.settings.config';
import { PagesSchemaSettingsOptions } from './pages.schema.settings.options';

interface IProps {
  readonly collections: readonly PageRelatedRow[];
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly property: PageSchemaProperty;
}

/** The title property can neither change type nor be assigned to another property: it opens each row. */
export const PagesSchemaSettingsProperty = ({ collections, editor, onGo, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const isTitle = isTitlePageProperty(property.type);
  const typesToChooseFrom = PAGE_ADDABLE_PROPERTY_TYPES.filter(
    (type) => type === property.type || canSchemaPropertyChangeType(property.type, type),
  );
  const canChangeType = typesToChooseFrom.length > 1;
  const requiredId = `property-required-${property.key}`;

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
        {canChangeType ? (
          <Select disabled={editor.isSaving} onValueChange={(chosen) => changeTypeTo(chosen)} value={property.type}>
            <SelectTrigger aria-label={t('propertyType')} className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {typesToChooseFrom.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`types.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-foreground">{t(`types.${property.type}`)}</span>
        )}
      </div>
      {canChangeType && <p className="px-2 text-muted-foreground text-xs">{t('changeTypeWarning')}</p>}

      <PagesSchemaSettingsConfig collections={collections} editor={editor} property={property} />

      {canPagePropertyBeRequired(property.type) && (
        <div>
          <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm" htmlFor={requiredId}>
            <Checkbox
              checked={property.required}
              disabled={editor.isSaving}
              id={requiredId}
              onCheckedChange={(checked) => editor.setPropertyRequired(property.key, checked === true)}
            />
            {t('propertyRequired')}
          </label>
          <p className="px-2 text-muted-foreground text-xs">{t('propertyRequiredHint')}</p>
        </div>
      )}

      {pagePropertyRequiresOptions(property.type) && (
        <PagesSchemaSettingsOptions editor={editor} onGo={onGo} property={property} />
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

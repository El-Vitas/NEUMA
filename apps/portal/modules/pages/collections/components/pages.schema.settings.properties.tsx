'use client';

import { buildPagePropertyKey, isTitlePageProperty, PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/shared/components/ui/button';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import { readAddablePropertyType } from '../lib/pages.schema-editing.lib';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsAddRow } from './pages.schema.settings.add-row';
import { PagesSchemaSettingsRow } from './pages.schema.settings-row';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
}

export const PagesSchemaSettingsProperties = ({ editor, onGo }: IProps) => {
  const t = useTranslations('pages.collection');
  const movable = editor.properties
    .filter((property) => !isTitlePageProperty(property.type))
    .map((property) => property.key);

  /** Opens the new property: a select needs its options there before the collection can be saved. */
  const addAndOpen = (label: string, chosen: string): void => {
    const type = readAddablePropertyType(chosen);
    if (type === undefined) return;
    const propertyKey = buildPagePropertyKey(label, editor.properties);
    editor.addProperty(label, type);
    onGo({ level: 'PROPERTY', propertyKey });
  };

  return (
    <div className="space-y-1">
      {editor.properties.map((property) => (
        <div className="flex items-center gap-1" key={property.key}>
          <PagesSchemaSettingsRow
            label={property.label}
            onClick={() => onGo({ level: 'PROPERTY', propertyKey: property.key })}
            value={t(`types.${property.type}`)}
          />
          {!isTitlePageProperty(property.type) && (
            <>
              <Button
                aria-label={t('movePropertyEarlier', { property: property.label })}
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={editor.isSaving || movable.indexOf(property.key) === 0}
                onClick={() => editor.moveProperty(property.key, 'EARLIER')}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowUp aria-hidden="true" className="size-4" />
              </Button>
              <Button
                aria-label={t('movePropertyLater', { property: property.label })}
                className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
                disabled={editor.isSaving || movable.indexOf(property.key) === movable.length - 1}
                onClick={() => editor.moveProperty(property.key, 'LATER')}
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowDown aria-hidden="true" className="size-4" />
              </Button>
            </>
          )}
        </div>
      ))}
      <PagesSchemaSettingsAddRow
        addLabel={t('addProperty')}
        disabled={editor.isSaving}
        initialKind={PAGE_PROPERTY_TYPE.SELECT}
        kindLabel={t('propertyType')}
        kinds={PAGE_ADDABLE_PROPERTY_TYPES.map((type) => ({ label: t(`types.${type}`), value: type }))}
        nameLabel={t('propertyLabel')}
        onAdd={addAndOpen}
        takenNames={editor.properties.map((property) => property.label)}
        takenWarning={t('propertyNameTaken')}
      />
    </div>
  );
};

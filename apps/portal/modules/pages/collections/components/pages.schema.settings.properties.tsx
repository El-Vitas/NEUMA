'use client';

import { PAGE_PROPERTY_TYPE } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { PAGE_ADDABLE_PROPERTY_TYPES } from '../constants/pages.schema-editing.constants';
import { buildPropertyKey, readAddablePropertyType } from '../lib/pages.schema-editing.lib';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsAddRow } from './pages.schema.settings.add-row';
import { PagesSchemaSettingsRow } from './pages.schema.settings-row';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
}

/**
 * Todo lo que la colección guarda, una propiedad por línea.
 *
 * Cada una dice de qué tipo es sin entrar, y se entra solo para cambiarla. Lo
 * de agregar queda al final, que es cuando ya se vio lo que hay y se sabe que
 * falta algo.
 */
export const PagesSchemaSettingsProperties = ({ editor, onGo }: IProps) => {
  const t = useTranslations('pages.collection');

  /**
   * Se entra en la propiedad recién creada: si es una selección, ahí es donde
   * se le dan las opciones, y sin ellas no se puede guardar la colección.
   */
  const addAndOpen = (label: string, chosen: string): void => {
    const type = readAddablePropertyType(chosen);
    if (type === undefined) return;
    const propertyKey = buildPropertyKey(label, editor.properties);
    editor.addProperty(label, type);
    onGo({ level: 'PROPERTY', propertyKey });
  };

  return (
    <div className="space-y-1">
      {editor.properties.map((property) => (
        <PagesSchemaSettingsRow
          key={property.key}
          label={property.label}
          onClick={() => onGo({ level: 'PROPERTY', propertyKey: property.key })}
          value={t(`types.${property.type}`)}
        />
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

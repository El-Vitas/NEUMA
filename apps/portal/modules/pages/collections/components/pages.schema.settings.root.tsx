'use client';

import { PAGE_VIEW_TYPE, PAGE_VIEW_TYPE_VALUES } from '@company-brain/shared';
import { Columns3, Layers, List, Table2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { readPageViewType } from '../lib/pages.view-editing.lib';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsAddRow } from './pages.schema.settings.add-row';
import { PagesSchemaSettingsRow } from './pages.schema.settings-row';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
}

/**
 * Lo primero que se ve al configurar: qué guarda la colección y de cuántas
 * maneras se mira, cada cosa en una línea que se abre.
 *
 * Las vistas se listan como se listan las propiedades, y por la misma razón:
 * desplegar aquí lo que cada una decide llena la pantalla de ajustes de vistas
 * que nadie vino a mirar, y deja el nombre de cada una como texto muerto —sin
 * dónde renombrarla, ordenarla ni quitarla.
 */
export const PagesSchemaSettingsRoot = ({ editor, onGo }: IProps) => {
  const t = useTranslations('pages.collection');

  /**
   * Se entra en la vista recién agregada: un tablero sin decir por dónde agrupa
   * no dibuja columnas, y ahí es donde se le dice.
   */
  const addAndOpen = (name: string, kind: string): void => {
    const type = readPageViewType(kind);
    if (type === undefined) return;
    editor.addView(name, type);
    onGo({ level: 'VIEW', viewPosition: editor.views.length });
  };

  return (
    <div className="space-y-1">
      <PagesSchemaSettingsRow
        icon={<List aria-hidden="true" className="size-4" />}
        label={t('propertiesTitle')}
        onClick={() => onGo({ level: 'PROPERTIES' })}
        value={String(editor.properties.length)}
      />
      <p className="px-2 pt-3 pb-1 text-muted-foreground text-xs uppercase tracking-wide">{t('viewsTitle')}</p>
      {editor.views.map((view, position) => (
        <PagesSchemaSettingsRow
          icon={
            view.type === PAGE_VIEW_TYPE.BOARD ? (
              <Columns3 aria-hidden="true" className="size-4" />
            ) : (
              <Table2 aria-hidden="true" className="size-4" />
            )
          }
          key={view.name}
          label={view.name}
          onClick={() => onGo({ level: 'VIEW', viewPosition: position })}
          value={view.isDefault ? t('defaultView') : t(`viewTypes.${view.type}`)}
        />
      ))}
      <PagesSchemaSettingsAddRow
        addLabel={t('addView')}
        disabled={editor.isSaving}
        initialKind={PAGE_VIEW_TYPE.TABLE}
        kindLabel={t('viewType')}
        kinds={PAGE_VIEW_TYPE_VALUES.map((type) => ({ label: t(`viewTypes.${type}`), value: type }))}
        nameLabel={t('viewName')}
        onAdd={addAndOpen}
        takenNames={editor.views.map((view) => view.name)}
        takenWarning={t('viewNameTaken')}
      />
      <p className="flex items-center gap-2 px-2 pt-3 text-muted-foreground text-xs">
        <Layers aria-hidden="true" className="size-3.5 shrink-0" />
        {t('configureDescription')}
      </p>
    </div>
  );
};

'use client';

import { PAGE_VIEW_TYPE, PAGE_VIEW_TYPE_VALUES } from '@neuma/shared';
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

export const PagesSchemaSettingsRoot = ({ editor, onGo }: IProps) => {
  const t = useTranslations('pages.collection');

  /** Opens the new view: a board without a grouping draws no columns, and the grouping is set there. */
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

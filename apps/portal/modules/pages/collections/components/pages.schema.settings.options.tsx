'use client';

import type { PagePropertyOption, PageStatusGroup } from '@neuma/shared';
import { PAGE_PROPERTY_TYPE, PAGE_STATUS_GROUP_VALUES } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';
import type { PagesSchemaSettingsRoute } from '../types/pages.schema-settings.types';
import { PagesSchemaSettingsOptionAdder } from './pages.schema.settings.option-adder';
import { PagesSchemaSettingsOptionRow } from './pages.schema.settings.option-row';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly onGo: (route: PagesSchemaSettingsRoute) => void;
  readonly property: PageSchemaProperty;
}

/** A status lists its options under the three groups it fixes; any other list type has a single list. */
export const PagesSchemaSettingsOptions = ({ editor, onGo, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const options = property.options ?? [];

  const renderRows = (shown: readonly PagePropertyOption[]) =>
    shown.map((option) => (
      <PagesSchemaSettingsOptionRow key={option.id} onGo={onGo} option={option} propertyKey={property.key} />
    ));

  if (property.type !== PAGE_PROPERTY_TYPE.STATUS) {
    return (
      <div className="space-y-1 border-border border-t pt-3">
        <p className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">{t('optionsLabel')}</p>
        {renderRows(options)}
        <PagesSchemaSettingsOptionAdder editor={editor} group={undefined} propertyKey={property.key} />
        <p className="px-2 pt-1 text-muted-foreground text-xs">{t('renameOptionHint')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-border border-t pt-3">
      {PAGE_STATUS_GROUP_VALUES.map((group: PageStatusGroup) => (
        <div className="space-y-1" key={group}>
          <p className="px-2 pb-1 text-muted-foreground text-xs uppercase tracking-wide">
            {t(`statusGroups.${group}`)}
          </p>
          {renderRows(options.filter((option) => option.group === group))}
          <PagesSchemaSettingsOptionAdder editor={editor} group={group} propertyKey={property.key} />
        </div>
      ))}
      <p className="px-2 text-muted-foreground text-xs">{t('statusHint')}</p>
    </div>
  );
};

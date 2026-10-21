'use client';

import { PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH } from '@neuma/shared';
import { useTranslations } from 'next-intl';
import { Input } from '@/shared/components/ui/input';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

export const PagesSchemaSettingsConfigUniqueId = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');

  return (
    <div className="space-y-1 px-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="shrink-0 text-muted-foreground">{t('uniqueIdPrefix')}</span>
        <Input
          aria-label={t('uniqueIdPrefix')}
          className="w-44"
          defaultValue={property.config.prefix}
          disabled={editor.isSaving}
          maxLength={PAGE_UNIQUE_ID_PREFIX_MAX_LENGTH}
          onBlur={(event) => editor.changePropertyConfig(property.key, { prefix: event.target.value.trim() })}
          placeholder={t('uniqueIdPrefixPlaceholder')}
        />
      </div>
      <p className="text-muted-foreground text-xs">{t('uniqueIdHint')}</p>
    </div>
  );
};

'use client';

import { useTranslations } from 'next-intl';
import { Checkbox } from '@/shared/components/ui/checkbox';
import type { PageSchemaProperty } from '../types/pages.schema.types';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  readonly property: PageSchemaProperty;
}

/** Allowing several is a change of shape only: a row that names one person still names one. */
export const PagesSchemaSettingsConfigPerson = ({ editor, property }: IProps) => {
  const t = useTranslations('pages.collection');
  const checkboxId = `person-multiple-${property.key}`;

  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 px-2 text-sm" htmlFor={checkboxId}>
      <Checkbox
        checked={property.config.allowsMultiple}
        disabled={editor.isSaving}
        id={checkboxId}
        onCheckedChange={(checked) => editor.changePropertyConfig(property.key, { allowsMultiple: checked === true })}
      />
      {t('personAllowsMultiple')}
    </label>
  );
};

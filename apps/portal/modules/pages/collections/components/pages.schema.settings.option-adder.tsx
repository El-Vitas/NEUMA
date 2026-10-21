'use client';

import type { PageStatusGroup } from '@neuma/shared';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { PagesSchemaEditor } from '../types/pages.schema-editor.types';

interface IProps {
  readonly editor: PagesSchemaEditor;
  /** Only a status option has a group. */
  readonly group: PageStatusGroup | undefined;
  readonly propertyKey: string;
}

export const PagesSchemaSettingsOptionAdder = ({ editor, group, propertyKey }: IProps) => {
  const t = useTranslations('pages.collection');
  const [name, setName] = useState('');

  const addAndClear = (): void => {
    editor.addOption(propertyKey, name, group);
    setName('');
  };

  return (
    <div className="flex items-center gap-2 pt-1">
      <Input
        aria-label={
          group === undefined ? t('newOptionPlaceholder') : t('newOptionInGroup', { group: t(`statusGroups.${group}`) })
        }
        disabled={editor.isSaving}
        onChange={(event) => setName(event.target.value)}
        placeholder={t('newOptionPlaceholder')}
        value={name}
      />
      <Button
        aria-label={t('addOption')}
        className="size-11 shrink-0"
        disabled={editor.isSaving || name.trim() === ''}
        onClick={addAndClear}
        size="icon"
        type="button"
        variant="outline"
      >
        <Plus aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
};

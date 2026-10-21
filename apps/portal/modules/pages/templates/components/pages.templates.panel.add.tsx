'use client';

import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import type { PagesTemplatesEditing } from '../types/pages.templates.types';

interface IProps {
  readonly editing: PagesTemplatesEditing;
}

export const PagesTemplatesPanelAdd = ({ editing }: IProps) => {
  const t = useTranslations('pages.templates');
  const [title, setTitle] = useState('');

  const addAndClear = (): void => {
    editing.add(title);
    setTitle('');
  };

  return (
    <div className="flex items-center gap-2 border-border border-t pt-3">
      <Input
        aria-label={t('nameLabel')}
        data-testid="template-name-new"
        disabled={editing.isPending}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && title.trim() !== '') addAndClear();
        }}
        placeholder={t('nameLabel')}
        value={title}
      />
      <Button
        aria-label={t('add')}
        className="size-11 shrink-0"
        data-testid="template-add"
        disabled={editing.isPending || title.trim() === ''}
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

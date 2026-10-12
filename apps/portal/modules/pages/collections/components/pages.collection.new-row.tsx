'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';

interface IProps {
  readonly label: string;
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (title: string) => void;
}

export const PagesCollectionNewRow = ({ disabled, label, onCancel, onConfirm }: IProps) => {
  const t = useTranslations('pages.collection');
  const [title, setTitle] = useState('');

  const confirmIfNamed = (): void => {
    if (title.trim() === '') {
      onCancel();
      return;
    }
    onConfirm(title);
    setTitle('');
  };

  const answerKey = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      confirmIfNamed();
      return;
    }
    if (event.key === 'Escape') onCancel();
  };

  return (
    <Card className="mt-1 gap-2 rounded-md border-border/60 p-3 shadow-xs">
      <input
        aria-label={label}
        // biome-ignore lint/a11y/noAutofocus: the field answers the click that just opened it
        autoFocus
        className="w-full bg-transparent font-medium text-foreground text-sm outline-none placeholder:text-muted-foreground"
        disabled={disabled}
        onBlur={confirmIfNamed}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={answerKey}
        placeholder={t('newRowPlaceholder')}
        value={title}
      />
    </Card>
  );
};

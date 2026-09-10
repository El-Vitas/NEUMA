'use client';

import { useTranslations } from 'next-intl';
import type { KeyboardEvent } from 'react';
import { useState } from 'react';
import { Card } from '@/shared/components/ui/card';

interface IProps {
  readonly columnLabel: string;
  readonly disabled: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (title: string) => void;
}

/**
 * Una tarjeta en blanco esperando su nombre.
 *
 * Crear se hace escribiendo: la fila aparece cuando ya se sabe cómo se llama,
 * en vez de nacer sin nombre y obligar a abrirla para ponérselo. Enter la crea,
 * Escape se arrepiente, y salir del campo sin escribir nada también.
 */
export const PagesCollectionBoardNewCard = ({ columnLabel, disabled, onCancel, onConfirm }: IProps) => {
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
        aria-label={t('newRowIn', { column: columnLabel })}
        // biome-ignore lint/a11y/noAutofocus: el campo es la respuesta al clic que acaba de abrirlo
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

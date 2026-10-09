'use client';

import { Smile, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { findPageIconEmojiOptions } from '../../appearance/lib/pages.icon.lib';

interface IProps {
  readonly disabled: boolean;
  readonly icon: null | string;
  readonly onPick: (icon: null | string) => void;
  readonly viewName: string;
}

/**
 * Con qué emoji se reconoce una vista en su pestaña.
 *
 * Solo emoji: una pestaña mide lo que mide una línea de texto, y ahí una imagen
 * no se lee. Se busca por nombre porque nadie recorre mil emojis con la vista.
 */
export const PagesSchemaSettingsViewIcon = ({ disabled, icon, onPick, viewName }: IProps) => {
  const t = useTranslations('pages.collection');
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const options = findPageIconEmojiOptions(query);

  const pick = (character: null | string): void => {
    setIsOpen(false);
    setQuery('');
    onPick(character);
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-label={t('viewIconFor', { view: viewName })}
          className="size-11 shrink-0 text-lg"
          disabled={disabled}
          size="icon"
          type="button"
          variant="outline"
        >
          {icon ?? <Smile aria-hidden="true" className="size-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 space-y-2">
        <Input
          aria-label={t('viewIconSearch')}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('viewIconSearch')}
          value={query}
        />
        <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">
          {options.map((option) => (
            <button
              aria-label={option.names[0] ?? option.character}
              className="flex size-8 items-center justify-center rounded-md text-lg hover:bg-muted"
              key={option.character}
              onClick={() => pick(option.character)}
              type="button"
            >
              {option.character}
            </button>
          ))}
        </div>
        {icon !== null && (
          <Button
            className="min-h-11 w-full justify-start text-muted-foreground"
            onClick={() => pick(null)}
            type="button"
            variant="ghost"
          >
            <Trash2 aria-hidden="true" className="size-4" />
            {t('viewIconRemove')}
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
};

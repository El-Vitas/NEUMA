'use client';

import { PAGE_ICON_COLORS } from '@company-brain/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { PAGE_ICON_COLOR_SWATCH_STYLE_CLASSES } from '../constants/pages.icon.colors.constants';
import type { PageIconColor } from '../types/pages.icon.types';

interface IProps {
  readonly onChoose: (color: PageIconColor) => void;
  readonly selected: PageIconColor;
}

/**
 * The colour a symbol is drawn in, kept to a single dot until it is asked for.
 *
 * A row of ten swatches spends most of the picker's width saying something
 * nobody was looking at yet; one dot showing the colour in use, that opens the
 * rest when clicked, says the same thing and leaves the room for the symbols.
 */
export const PagesIconColorPicker = ({ onChoose, selected }: IProps) => {
  const t = useTranslations('pages.icon');
  const [isOpen, setIsOpen] = useState(false);

  const choose = (color: PageIconColor): void => {
    onChoose(color);
    setIsOpen(false);
  };

  return (
    <Popover onOpenChange={setIsOpen} open={isOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label={t('chooseColor')}
          className="grid size-11 shrink-0 place-items-center hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title={t(`colors.${selected}`)}
          type="button"
        >
          <span
            aria-hidden="true"
            className={cn('size-4 rounded-full', PAGE_ICON_COLOR_SWATCH_STYLE_CLASSES[selected])}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <fieldset aria-label={t('chooseColor')} className="grid grid-cols-5 gap-1 border-0 p-0">
          {PAGE_ICON_COLORS.map((color) => (
            <button
              aria-label={t(`colors.${color}`)}
              aria-pressed={color === selected}
              className={cn(
                'grid size-11 place-items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                color === selected ? 'bg-muted' : 'hover:bg-muted',
              )}
              key={color}
              onClick={() => choose(color)}
              title={t(`colors.${color}`)}
              type="button"
            >
              <span
                aria-hidden="true"
                className={cn('size-5 rounded-full', PAGE_ICON_COLOR_SWATCH_STYLE_CLASSES[color])}
              />
            </button>
          ))}
        </fieldset>
      </PopoverContent>
    </Popover>
  );
};

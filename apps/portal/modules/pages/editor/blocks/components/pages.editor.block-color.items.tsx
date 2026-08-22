'use client';

import { PAGE_BLOCK_COLORS, type PageBlockColor } from '@company-brain/shared';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import {
  PAGE_EDITOR_COLOR_SWATCH_CLASSES,
  PAGE_EDITOR_COLOR_SWATCH_STYLE_CLASS,
} from '../../text/constants/pages.editor.colors.constants';

interface IProps {
  readonly onSelect: (color: PageBlockColor | null) => void;
  readonly selected: string | null;
}

/**
 * The palette on offer: a handful of colours, each shown as itself, and a way
 * back to the page default. There is no free colour picker on purpose — a page
 * reads as one document, not as a paint set.
 */
export const PagesEditorBlockColorItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      <DropdownMenuItem onSelect={() => onSelect(null)}>
        <span className="flex-1">{t('noColor')}</span>
        {selected === null && <Check aria-hidden="true" className="ms-2 size-4" />}
      </DropdownMenuItem>
      {PAGE_BLOCK_COLORS.map((color) => (
        <DropdownMenuItem key={color} onSelect={() => onSelect(color)}>
          <span
            aria-hidden="true"
            className={`${PAGE_EDITOR_COLOR_SWATCH_STYLE_CLASS} ${PAGE_EDITOR_COLOR_SWATCH_CLASSES[color] ?? ''}`}
          />
          <span className="flex-1">{t(`blockColors.${color}`)}</span>
          {selected === color && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};

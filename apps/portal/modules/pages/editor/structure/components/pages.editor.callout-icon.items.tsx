'use client';

import { PAGE_CALLOUT_ICONS, type PageCalloutIcon } from '@company-brain/shared';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_CALLOUT_ICON_GLYPHS } from '../../blocks/constants/pages.editor.blocks.constants';

interface IProps {
  readonly onSelect: (icon: PageCalloutIcon | null) => void;
  readonly selected: string | null;
}

export const PagesEditorCalloutIconItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      <DropdownMenuItem onSelect={() => onSelect(null)}>
        <span className="flex-1">{t('noCalloutIcon')}</span>
        {selected === null && <Check aria-hidden="true" className="ms-2 size-4" />}
      </DropdownMenuItem>
      {PAGE_CALLOUT_ICONS.map((icon) => (
        <DropdownMenuItem key={icon} onSelect={() => onSelect(icon)}>
          <span aria-hidden="true">{PAGE_EDITOR_CALLOUT_ICON_GLYPHS[icon]}</span>
          <span className="flex-1">{t(`calloutIcons.${icon}`)}</span>
          {selected === icon && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};

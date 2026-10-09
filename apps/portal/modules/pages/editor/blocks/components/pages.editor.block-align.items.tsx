'use client';

import { PAGE_BLOCK_ALIGNMENTS, type PageBlockAlignment } from '@neuma/shared';
import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';

interface IProps {
  readonly onSelect: (align: PageBlockAlignment) => void;
  readonly selected: string | null;
}

export const PagesEditorBlockAlignItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {PAGE_BLOCK_ALIGNMENTS.map((align) => (
        <DropdownMenuItem key={align} onSelect={() => onSelect(align)}>
          <span className="flex-1">{t(`blockAlign.${align}`)}</span>
          {selected === align && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};

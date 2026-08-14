'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_LINK_SHAPES } from '../constants/pages.editor.link-shape.constants';
import type { PageEditorLinkShape } from '../types/pages.editor.link-shape.types';

interface IProps {
  readonly onSelect: (shape: PageEditorLinkShape) => void;
  readonly selected: string | null;
}

/** The three shapes a link on a page can wear, offered long after it was pasted. */
export const PagesEditorLinkShapeItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {PAGE_EDITOR_LINK_SHAPES.map((shape) => (
        <DropdownMenuItem key={shape} onSelect={() => onSelect(shape)}>
          <span className="flex-1">{t(`linkShape.${shape}`)}</span>
          {selected === shape && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};

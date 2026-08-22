'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { DropdownMenuItem } from '@/shared/components/ui/dropdown-menu';
import { PAGE_EDITOR_PAGE_SHAPES } from '../../structure/constants/pages.editor.collection.constants';
import type { PageEditorPageShape } from '../types/pages.editor.page-shape.types';

interface IProps {
  readonly onSelect: (shape: PageEditorPageShape) => void;
  readonly selected: PageEditorPageShape;
}

/** How the page this block names is shown: kept in sight as a collection, or pointed at. */
export const PagesEditorPageShapeItems = ({ onSelect, selected }: IProps) => {
  const t = useTranslations('pages');

  return (
    <>
      {PAGE_EDITOR_PAGE_SHAPES.map((shape) => (
        <DropdownMenuItem key={shape} onSelect={() => onSelect(shape)}>
          <span className="flex-1">{t(`pageShape.${shape}`)}</span>
          {selected === shape && <Check aria-hidden="true" className="ms-2 size-4" />}
        </DropdownMenuItem>
      ))}
    </>
  );
};
